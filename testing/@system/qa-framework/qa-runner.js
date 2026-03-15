#!/usr/bin/env node
/**
 * @system/qa-framework — Main QA Orchestrator
 *
 * Usage: node qa-runner.js <product-slug> <deployed-url> [options]
 *
 * Options:
 *   --skip-visual       Skip visual regression checks
 *   --skip-ui           Skip Playwright browser checks (no Chromium needed)
 *   --timeout <ms>      Per-check timeout in ms (default: 60000)
 *   --output <path>     Write JSON report to file or directory
 *
 * Runs preflight checks first (gate), then all remaining checks in parallel.
 * Target total wall-clock time: < 120s.
 */

'use strict'

const reporter = require('./reporter')
const preflight = require('./checks/preflight')
const apiEndpoints = require('./checks/api-endpoints')
const uiSmoke = require('./checks/ui-smoke')
const performance = require('./checks/performance')
const visualRegression = require('./checks/visual-regression')

/** @type {number} Default per-check timeout in ms */
const DEFAULT_CHECK_TIMEOUT = 60_000

/**
 * @typedef {object} CheckResult
 * @property {string} name
 * @property {'pass'|'fail'|'warning'} status
 * @property {number} duration_ms
 * @property {object} details
 * @property {string[]} errors
 * @property {string[]} warnings
 */

/**
 * Run a single check function with a hard timeout.
 * Catches all errors and returns a structured result.
 *
 * @param {string} name - check identifier shown in reports
 * @param {() => Promise<object>} fn - async function returning { status, details, errors, warnings }
 * @param {number} [timeout] - ms before the check is forcibly failed
 * @returns {Promise<CheckResult>}
 */
async function runCheck(name, fn, timeout = DEFAULT_CHECK_TIMEOUT) {
  const start = Date.now()

  /** @type {NodeJS.Timeout} */
  let timer
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Check timed out after ${timeout}ms`)),
      timeout
    )
  })

  try {
    const result = await Promise.race([fn(), timeoutPromise])
    clearTimeout(timer)
    return {
      name,
      status: result.status || 'pass',
      duration_ms: Date.now() - start,
      details: result.details || {},
      errors: result.errors || [],
      warnings: result.warnings || [],
    }
  } catch (err) {
    clearTimeout(timer)
    return {
      name,
      status: 'fail',
      duration_ms: Date.now() - start,
      details: {},
      errors: [err.message],
      warnings: [],
    }
  }
}

/**
 * Run the full QA suite against a deployed product.
 *
 * Architecture:
 *   Phase 1 (serial):   preflight — gates all further checks
 *   Phase 2 (parallel): api-endpoints, performance, ui-smoke, visual-regression
 *
 * @param {string} productSlug - product identifier (e.g. 'unosend', 'planora')
 * @param {string} deployedUrl - fully qualified base URL (e.g. 'https://unosend.up.railway.app')
 * @param {object} [options]
 * @param {number} [options.checkTimeout=60000] - per-check timeout in ms
 * @param {boolean} [options.skipVisual=false] - skip visual regression checks
 * @param {boolean} [options.skipUi=false] - skip Playwright browser checks
 * @param {string|null} [options.outputFile=null] - path to write JSON report
 * @returns {Promise<import('./reporter').Report>}
 */
async function run(productSlug, deployedUrl, options = {}) {
  const {
    checkTimeout = DEFAULT_CHECK_TIMEOUT,
    skipVisual = false,
    skipUi = false,
    outputFile = null,
  } = options

  /** @type {{ productSlug: string, url: string }} */
  const ctx = { productSlug, url: deployedUrl.replace(/\/$/, '') }
  const totalStart = Date.now()

  console.log(`[qa-runner] Starting QA for "${productSlug}" @ ${deployedUrl}`)
  console.log(
    `[qa-runner] timeout=${checkTimeout}ms | skipUI=${skipUi} | skipVisual=${skipVisual}`
  )

  // ── Phase 1: Preflight (serial gate) ──────────────────────────────────────
  console.log('[qa-runner] Phase 1: preflight...')
  const preflightResult = await runCheck(
    'preflight',
    () => preflight.run(ctx),
    checkTimeout
  )

  if (preflightResult.status === 'fail') {
    console.warn('[qa-runner] Preflight failed — aborting remaining checks')
    const duration_ms = Date.now() - totalStart
    const report = reporter.buildReport({
      product_slug: productSlug,
      url: deployedUrl,
      duration_ms,
      checks: [preflightResult],
      aborted: true,
      abort_reason: 'preflight_failed',
    })
    if (outputFile) reporter.writeReport(report, outputFile)
    return report
  }

  // ── Phase 2: Parallel checks ───────────────────────────────────────────────
  console.log('[qa-runner] Phase 2: running parallel checks...')

  const parallelTasks = [
    runCheck('api-endpoints', () => apiEndpoints.run(ctx), checkTimeout),
    runCheck('performance', () => performance.run(ctx), checkTimeout),
  ]

  if (!skipUi) {
    parallelTasks.push(runCheck('ui-smoke', () => uiSmoke.run(ctx), checkTimeout))
  }

  if (!skipVisual) {
    parallelTasks.push(
      runCheck('visual-regression', () => visualRegression.run(ctx), checkTimeout)
    )
  }

  const parallelResults = await Promise.all(parallelTasks)
  const duration_ms = Date.now() - totalStart

  console.log(`[qa-runner] Done in ${(duration_ms / 1000).toFixed(2)}s`)

  const report = reporter.buildReport({
    product_slug: productSlug,
    url: deployedUrl,
    duration_ms,
    checks: [preflightResult, ...parallelResults],
  })

  if (outputFile) {
    const written = reporter.writeReport(report, outputFile)
    console.log(`[qa-runner] Report written to: ${written}`)
  }

  return report
}

// ── CLI entrypoint ─────────────────────────────────────────────────────────
if (require.main === module) {
  const args = process.argv.slice(2)
  const [productSlug, deployedUrl, ...flags] = args

  if (!productSlug || !deployedUrl) {
    console.error(
      'Usage: node qa-runner.js <product-slug> <deployed-url> [--skip-visual] [--skip-ui] [--timeout <ms>] [--output <path>]'
    )
    process.exit(1)
  }

  const timeoutIdx = flags.indexOf('--timeout')
  const outputIdx = flags.indexOf('--output')

  const options = {
    skipVisual: flags.includes('--skip-visual'),
    skipUi: flags.includes('--skip-ui'),
    checkTimeout:
      timeoutIdx >= 0 ? parseInt(flags[timeoutIdx + 1], 10) : DEFAULT_CHECK_TIMEOUT,
    outputFile: outputIdx >= 0 ? flags[outputIdx + 1] : null,
  }

  run(productSlug, deployedUrl, options)
    .then((report) => {
      reporter.printReport(report)
      process.exit(report.summary.overall_status === 'pass' ? 0 : 1)
    })
    .catch((err) => {
      console.error('[qa-runner] Fatal error:', err.message)
      process.exit(2)
    })
}

module.exports = { run }
