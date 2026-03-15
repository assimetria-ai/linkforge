/**
 * @system/qa-framework — Visual Regression Checks
 *
 * Takes screenshots of key pages and compares them against stored baselines
 * to detect unexpected visual changes in a deployed product.
 *
 * Pages captured:
 *   - login   / auth  (login/auth page)
 *   - dashboard       (post-login landing page)
 *   - settings        (/settings if available)
 *
 * Baseline storage: qa-framework/baselines/<product-slug>/<page>.png
 *
 * Diff strategy:
 *   - If sharp or jimp is available: pixel-level diff with configurable threshold
 *   - Otherwise: SHA-256 file hash comparison (fast, catches any change)
 *   - First run (no baselines): saves current screenshots as baselines + warns
 *
 * Graceful fallbacks:
 *   - No Playwright → warning (not fail)
 *   - No Chromium → warning (not fail)
 *   - First run → warning (baselines saved, nothing to compare)
 *
 * Uses only Node.js built-ins + Playwright. No extra npm packages required.
 */

'use strict'

const path = require('path')
const fs   = require('fs')
const { createHash } = require('crypto')
const { createTestUser } = require('../../helpers/test-user')

/** Baseline directory, relative to this file */
const BASELINES_DIR = path.resolve(__dirname, '..', 'baselines')

/** Per-navigation timeout in ms */
const NAV_TIMEOUT = 20_000

/**
 * Pixel diff threshold: fraction of pixels that may differ before flagging.
 * Only used when sharp/jimp is available.
 */
const DIFF_THRESHOLD = parseFloat(process.env.VISUAL_DIFF_THRESHOLD ?? '0.02') // 2%

// ── Playwright availability guard ──────────────────────────────────────────

/**
 * Try to require Playwright. Returns module or null.
 *
 * @returns {object|null}
 */
function tryLoadPlaywright() {
  try {
    return require('playwright')
  } catch {
    return null
  }
}

/**
 * Try to require sharp. Returns module or null.
 *
 * @returns {object|null}
 */
function tryLoadSharp() {
  try {
    return require('sharp')
  } catch {
    return null
  }
}

/**
 * Try to require jimp. Returns module or null.
 *
 * @returns {object|null}
 */
function tryLoadJimp() {
  try {
    return require('jimp')
  } catch {
    return null
  }
}

// ── File helpers ───────────────────────────────────────────────────────────

/**
 * Ensure the baseline directory for a product exists.
 *
 * @param {string} slug
 * @returns {string} absolute path to directory
 */
function ensureBaselineDir(slug) {
  const dir = path.join(BASELINES_DIR, slug)
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

/**
 * Compute SHA-256 hash of a file.
 *
 * @param {string} filePath
 * @returns {string} hex digest
 */
function hashFile(filePath) {
  const buf = fs.readFileSync(filePath)
  return createHash('sha256').update(buf).digest('hex')
}

// ── Pixel diff implementations ─────────────────────────────────────────────

/**
 * Compare two PNG files using sharp (if available).
 * Returns { diffFraction, diffPixels, totalPixels } or null if not usable.
 *
 * @param {string} baselinePath
 * @param {string} currentPath
 * @returns {Promise<{diffFraction: number, diffPixels: number, totalPixels: number}|null>}
 */
async function diffWithSharp(baselinePath, currentPath) {
  const sharp = tryLoadSharp()
  if (!sharp) return null

  try {
    const [baseImg, currImg] = await Promise.all([
      sharp(baselinePath).raw().toBuffer({ resolveWithObject: true }),
      sharp(currentPath).raw().toBuffer({ resolveWithObject: true }),
    ])

    // Images must be same dimensions to compare
    if (
      baseImg.info.width  !== currImg.info.width ||
      baseImg.info.height !== currImg.info.height
    ) {
      return null // dimensions changed — treat as diff
    }

    const totalPixels = baseImg.info.width * baseImg.info.height
    let diffPixels = 0

    for (let i = 0; i < baseImg.data.length; i += baseImg.info.channels) {
      let channelDiff = 0
      for (let c = 0; c < baseImg.info.channels; c++) {
        channelDiff += Math.abs(baseImg.data[i + c] - currImg.data[i + c])
      }
      // Count pixel as different if average channel delta > 10 (out of 255)
      if (channelDiff / baseImg.info.channels > 10) diffPixels++
    }

    return { diffFraction: diffPixels / totalPixels, diffPixels, totalPixels }
  } catch {
    return null
  }
}

/**
 * Compare two PNG files using jimp (if available).
 * Returns { diffFraction } or null if not usable.
 *
 * @param {string} baselinePath
 * @param {string} currentPath
 * @returns {Promise<{diffFraction: number}|null>}
 */
async function diffWithJimp(baselinePath, currentPath) {
  const Jimp = tryLoadJimp()
  if (!Jimp) return null

  try {
    const [base, curr] = await Promise.all([
      Jimp.read(baselinePath),
      Jimp.read(currentPath),
    ])

    // Resize current to baseline dimensions for comparison
    if (base.bitmap.width !== curr.bitmap.width || base.bitmap.height !== curr.bitmap.height) {
      curr.resize(base.bitmap.width, base.bitmap.height)
    }

    const diff = Jimp.diff(base, curr)
    return { diffFraction: diff.percent }
  } catch {
    return null
  }
}

/**
 * Compare two screenshot files using the best available method.
 *
 * @param {string} baselinePath
 * @param {string} currentPath
 * @returns {Promise<{ method: string, diffFraction: number, pass: boolean, details: object }>}
 */
async function compareScreenshots(baselinePath, currentPath) {
  // Try sharp first (fastest, most accurate)
  const sharpResult = await diffWithSharp(baselinePath, currentPath)
  if (sharpResult !== null) {
    return {
      method: 'sharp-pixel-diff',
      diffFraction: sharpResult.diffFraction,
      pass: sharpResult.diffFraction <= DIFF_THRESHOLD,
      details: sharpResult,
    }
  }

  // Try jimp second
  const jimpResult = await diffWithJimp(baselinePath, currentPath)
  if (jimpResult !== null) {
    return {
      method: 'jimp-pixel-diff',
      diffFraction: jimpResult.diffFraction,
      pass: jimpResult.diffFraction <= DIFF_THRESHOLD,
      details: jimpResult,
    }
  }

  // Fallback: file hash comparison
  const baseHash = hashFile(baselinePath)
  const currHash = hashFile(currentPath)
  const identical = baseHash === currHash

  return {
    method: 'hash-comparison',
    diffFraction: identical ? 0 : 1,
    pass: identical,
    details: { baseHash: baseHash.slice(0, 16), currHash: currHash.slice(0, 16) },
  }
}

// ── Playwright helpers ─────────────────────────────────────────────────────

/**
 * Register a QA user via API and return credentials.
 *
 * @param {string} baseUrl
 * @returns {Promise<{email:string,password:string}|null>}
 */
async function registerQaUser(baseUrl) {
  const user = createTestUser({ name: 'QA Visual' })
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 10_000)
    const res = await fetch(`${baseUrl}/api/sessions/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: user.password, name: user.name }),
      signal: ctrl.signal,
    }).finally(() => clearTimeout(t))
    if (res.status === 200 || res.status === 201) {
      return { email: user.email, password: user.password }
    }
  } catch {
    // fall through
  }
  return null
}

/**
 * Navigate to a route and take a screenshot. Returns the path to the PNG file.
 *
 * @param {import('playwright').Page} page
 * @param {string} baseUrl
 * @param {string} route    e.g. '/auth'
 * @param {string} destDir  directory to write the PNG
 * @param {string} name     file base name (no extension)
 * @returns {Promise<string>} absolute path to written PNG
 */
async function captureScreenshot(page, baseUrl, route, destDir, name) {
  await page.goto(`${baseUrl}${route}`, {
    waitUntil: 'networkidle',
    timeout: NAV_TIMEOUT,
  })

  // Brief settle to allow animations/transitions
  await page.waitForTimeout(500).catch(() => {})

  const filePath = path.join(destDir, `${name}.png`)
  await page.screenshot({ path: filePath, fullPage: false })
  return filePath
}

/**
 * Login via UI (fills the form, submits) then returns to caller.
 *
 * @param {import('playwright').Page} page
 * @param {string} baseUrl
 * @param {{ email: string, password: string }} creds
 */
async function loginViaUi(page, baseUrl, creds) {
  const authRoutes = ['/auth', '/login', '/sign-in', '/signin']

  for (const route of authRoutes) {
    await page.goto(`${baseUrl}${route}`, {
      waitUntil: 'domcontentloaded',
      timeout: NAV_TIMEOUT,
    }).catch(() => {})

    const emailInput = page.locator(
      'input[type="email"], input[name="email"], input[placeholder*="email" i]'
    )
    if ((await emailInput.count()) > 0) {
      await page.fill(
        'input[type="email"], input[name="email"], input[placeholder*="email" i]',
        creds.email
      )
      await page.fill('input[type="password"]', creds.password)
      await page.click('button[type="submit"]')
      await page.waitForURL(
        (url) => !authRoutes.some((r) => url.pathname === r || url.pathname.startsWith(r + '/')),
        { timeout: NAV_TIMEOUT }
      ).catch(() => {})
      return
    }
  }
}

// ── Page definitions ───────────────────────────────────────────────────────

/**
 * @typedef {object} PageSpec
 * @property {string} name     - used as baseline filename and in reports
 * @property {string} route    - path relative to baseUrl
 * @property {boolean} needsAuth - whether a login step is required first
 */

/** @type {PageSpec[]} */
const PAGES = [
  { name: 'login',     route: '/auth',      needsAuth: false },
  { name: 'dashboard', route: '/',          needsAuth: true  },
  { name: 'settings',  route: '/settings',  needsAuth: true  },
]

// ── Main entry point ───────────────────────────────────────────────────────

/**
 * Run all visual regression checks against a deployed product.
 *
 * @param {{ url: string, productSlug: string }} ctx
 * @returns {Promise<{ status: 'pass'|'fail'|'warning', details: object, errors: string[], warnings: string[] }>}
 */
async function run(ctx) {
  const { url, productSlug } = ctx
  const errors = []
  const warnings = []
  const details = {}

  // Guard: Playwright available?
  const pw = tryLoadPlaywright()
  if (!pw) {
    return {
      status: 'warning',
      details: { skipped: true, reason: 'playwright_not_installed' },
      errors: [],
      warnings: [
        'Playwright not installed — visual-regression tests skipped. Run: npm install playwright',
      ],
    }
  }

  let browser = null
  const tmpDir = path.join(BASELINES_DIR, productSlug, '.tmp')
  fs.mkdirSync(tmpDir, { recursive: true })

  try {
    // Launch browser
    try {
      browser = await pw.chromium.launch({ headless: true, timeout: 20_000 })
    } catch (err) {
      if (
        err.message.includes('Executable') ||
        err.message.includes('not found') ||
        err.message.includes('not installed')
      ) {
        return {
          status: 'warning',
          details: { skipped: true, reason: 'chromium_not_installed' },
          errors: [],
          warnings: [
            'Chromium not installed — visual-regression tests skipped. Run: npx playwright install chromium',
          ],
        }
      }
      throw err
    }

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      ignoreHTTPSErrors: true,
    })
    const page = await context.newPage()

    // Pre-register QA user for auth-required pages
    const creds = await registerQaUser(url) ?? {
      email: process.env.TEST_USER_EMAIL || 'test@example.com',
      password: process.env.TEST_USER_PASSWORD || 'TestPassword1!',
    }

    const baselineDir = ensureBaselineDir(productSlug)
    let isFirstRun = false

    for (const spec of PAGES) {
      const name = spec.name

      try {
        // Login if needed
        if (spec.needsAuth) {
          await loginViaUi(page, url, creds)
        }

        // Take screenshot to tmp
        const tmpPath = path.join(tmpDir, `${name}.png`)
        await captureScreenshot(page, url, spec.route, tmpDir, name)

        const baselinePath = path.join(baselineDir, `${name}.png`)
        const baselineExists = fs.existsSync(baselinePath)

        if (!baselineExists) {
          // First run — save as baseline, warn
          fs.copyFileSync(tmpPath, baselinePath)
          isFirstRun = true
          warnings.push(
            `[${name}] No baseline found — saved current screenshot as baseline. Re-run to compare.`
          )
          details[name] = { status: 'baseline_saved', path: baselinePath }
          continue
        }

        // Compare against baseline
        const comparison = await compareScreenshots(baselinePath, tmpPath)
        const diffPct = (comparison.diffFraction * 100).toFixed(2)

        details[name] = {
          method:         comparison.method,
          diff_fraction:  comparison.diffFraction,
          diff_pct:       `${diffPct}%`,
          threshold_pct:  `${(DIFF_THRESHOLD * 100).toFixed(0)}%`,
          pass:           comparison.pass,
          ...comparison.details,
        }

        if (!comparison.pass) {
          errors.push(
            `[${name}] Visual regression detected: ${diffPct}% of pixels changed ` +
            `(threshold: ${(DIFF_THRESHOLD * 100).toFixed(0)}%, method: ${comparison.method})`
          )

          // Save the failing screenshot alongside the baseline for easy review
          const failPath = path.join(baselineDir, `${name}.fail.png`)
          fs.copyFileSync(tmpPath, failPath)
          details[name].fail_screenshot = failPath
        }

        // Update baseline after a passing run so it drifts naturally
        // (uncomment to enable auto-update on pass):
        // if (comparison.pass) fs.copyFileSync(tmpPath, baselinePath)

      } catch (err) {
        errors.push(`[${name}] ${err.message}`)
        details[name] = { error: err.message }
      }
    }

    if (isFirstRun) {
      warnings.push(
        'First run: baselines saved. Visual regression comparisons will run on the next execution.'
      )
    }

    await context.close()
  } finally {
    if (browser) await browser.close().catch(() => {})

    // Clean up tmp screenshots
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    } catch {
      // non-fatal
    }
  }

  const status = errors.length > 0 ? 'fail' : warnings.length > 0 ? 'warning' : 'pass'
  return { status, details, errors, warnings }
}

module.exports = { run }
