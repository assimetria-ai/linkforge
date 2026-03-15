/**
 * @system/qa-framework — Report Generator
 *
 * Builds structured JSON reports, formats them for human-readable stdout output,
 * generates Telegram messages, and writes reports to disk.
 */

'use strict'

const fs = require('fs')
const path = require('path')

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
 * @typedef {object} Summary
 * @property {number} total_checks
 * @property {number} passed
 * @property {number} failed
 * @property {number} warnings
 * @property {'pass'|'fail'|'warning'} overall_status
 */

/**
 * @typedef {object} Report
 * @property {string} product_slug
 * @property {string} url
 * @property {string} timestamp
 * @property {number} duration_ms
 * @property {CheckResult[]} checks
 * @property {Summary} summary
 * @property {boolean} [aborted]
 * @property {string} [abort_reason]
 */

/**
 * Build a complete QA report from check results.
 *
 * @param {object} opts
 * @param {string} opts.product_slug
 * @param {string} opts.url
 * @param {number} opts.duration_ms
 * @param {CheckResult[]} opts.checks
 * @param {boolean} [opts.aborted=false]
 * @param {string|null} [opts.abort_reason=null]
 * @returns {Report}
 */
function buildReport({ product_slug, url, duration_ms, checks, aborted = false, abort_reason = null }) {
  const passed = checks.filter((c) => c.status === 'pass').length
  const failed = checks.filter((c) => c.status === 'fail').length
  const warned = checks.filter((c) => c.status === 'warning').length
  const overall_status = failed > 0 ? 'fail' : warned > 0 ? 'warning' : 'pass'

  /** @type {Report} */
  const report = {
    product_slug,
    url,
    timestamp: new Date().toISOString(),
    duration_ms,
    checks,
    summary: {
      total_checks: checks.length,
      passed,
      failed,
      warnings: warned,
      overall_status,
    },
  }

  if (aborted) {
    report.aborted = true
    report.abort_reason = abort_reason
  }

  return report
}

/**
 * Format a report as a Telegram Markdown message.
 * Safe for use with Telegram Bot API parse_mode=Markdown.
 *
 * @param {Report} report
 * @returns {string}
 */
function formatTelegramMessage(report) {
  const { product_slug, url, summary, duration_ms, checks } = report
  const statusEmoji =
    summary.overall_status === 'pass' ? '✅' :
    summary.overall_status === 'warning' ? '⚠️' : '❌'

  const lines = [
    `${statusEmoji} *QA Report: ${product_slug}*`,
    `URL: \`${url}\``,
    `Duration: ${(duration_ms / 1000).toFixed(1)}s`,
    ``,
    `*Summary:* ${summary.passed}/${summary.total_checks} passed`,
    ...(summary.failed > 0 ? [`Failed: ${summary.failed}`] : []),
    ...(summary.warnings > 0 ? [`Warnings: ${summary.warnings}`] : []),
  ]

  if (report.aborted) {
    lines.push(``, `⛔ *Aborted:* ${report.abort_reason}`)
  }

  lines.push(``, `*Checks:*`)
  for (const c of checks) {
    const icon = c.status === 'pass' ? '✅' : c.status === 'warning' ? '⚠️' : '❌'
    const err = c.errors.length > 0 ? `\n  └ ${c.errors[0]}` : ''
    lines.push(`${icon} \`${c.name}\` _(${c.duration_ms}ms)_${err}`)
  }

  return lines.join('\n')
}

/**
 * Print a human-readable report to stdout, followed by the full JSON.
 * The JSON at the end can be captured by piping stdout.
 *
 * @param {Report} report
 */
function printReport(report) {
  const { product_slug, url, summary, duration_ms, checks } = report
  const LINE = '─'.repeat(64)

  const icons = { pass: '✓', fail: '✗', warning: '⚠' }
  const status = summary.overall_status.toUpperCase()

  console.log('\n' + LINE)
  console.log(`  QA REPORT  ${product_slug}`)
  console.log(`  Status:    ${status}   |   Duration: ${(duration_ms / 1000).toFixed(2)}s`)
  console.log(`  URL:       ${url}`)
  if (report.aborted) {
    console.log(`  ABORTED:   ${report.abort_reason}`)
  }
  console.log(LINE)

  for (const check of checks) {
    const icon = icons[check.status] || '?'
    const namePart = check.name.padEnd(24)
    const timePart = String(check.duration_ms).padStart(7) + 'ms'
    console.log(`  ${icon}  ${namePart} ${timePart}`)
    for (const err of check.errors) {
      console.log(`       ERROR   ${err}`)
    }
    for (const w of check.warnings) {
      console.log(`       WARN    ${w}`)
    }
  }

  console.log(LINE)
  console.log(
    `  Totals:  ${summary.passed} passed  ${summary.failed} failed  ${summary.warnings} warnings`
  )
  console.log(LINE + '\n')

  // Machine-readable JSON — pipe or redirect to capture
  console.log(JSON.stringify(report, null, 2))
}

/**
 * Write a JSON report to disk.
 * If outputPath ends in .json, writes directly to that file.
 * Otherwise treats it as a directory and auto-names the file.
 *
 * @param {Report} report
 * @param {string} outputPath - file path or directory
 * @returns {string} absolute path to the written file
 */
function writeReport(report, outputPath) {
  let filePath = outputPath

  if (!outputPath.endsWith('.json')) {
    fs.mkdirSync(outputPath, { recursive: true })
    const ts = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19)
    filePath = path.join(outputPath, `${report.product_slug}-${ts}.json`)
  } else {
    fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true })
  }

  fs.writeFileSync(filePath, JSON.stringify(report, null, 2))
  return filePath
}

module.exports = {
  buildReport,
  formatTelegramMessage,
  printReport,
  writeReport,
}
