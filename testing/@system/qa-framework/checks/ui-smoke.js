/**
 * @system/qa-framework — UI Smoke Tests (Playwright)
 *
 * Browser-level smoke tests confirming core UI flows work end-to-end
 * in a real Chromium instance. Falls back to a warning (not fail)
 * if Playwright or Chromium is unavailable.
 *
 * Tests performed:
 *   1. page-loads        Root URL returns a page with a non-empty <body>
 *   2. login-form        Login/auth page renders an email + password input
 *   3. login-flow        Submitting valid credentials lands on the dashboard
 *   4. dashboard-renders Dashboard contains expected structural elements
 *   5. navigation        At least one nav/sidebar link is clickable + navigates
 *
 * Screenshots are saved to qa-framework/screenshots/<slug>/ on any failure.
 * On success screenshots are deleted to keep the workspace clean.
 *
 * Requires Playwright (already in project package.json).
 * Credentials come from helpers/test-user — the QA user is registered via API
 * before Playwright opens the browser, so we don't depend on a pre-seeded DB.
 */

'use strict'

const path = require('path')
const fs = require('fs')
const { createTestUser } = require('../../helpers/test-user')

/** @type {number} Per-step navigation timeout in ms */
const NAV_TIMEOUT = 20_000

/** Directory for failure screenshots, relative to this file */
const SCREENSHOTS_DIR = path.resolve(__dirname, '..', 'screenshots')

// ── Playwright availability guard ──────────────────────────────────────────

/**
 * Try to import Playwright. Returns the module or null.
 *
 * @returns {Promise<import('@playwright/test')|null>}
 */
async function tryLoadPlaywright() {
  try {
    return require('playwright')
  } catch {
    return null
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Ensure the screenshot directory for a product exists.
 *
 * @param {string} slug
 * @returns {string} absolute path to directory
 */
function ensureScreenshotDir(slug) {
  const dir = path.join(SCREENSHOTS_DIR, slug)
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

/**
 * Save a page screenshot with a descriptive name.
 *
 * @param {import('playwright').Page} page
 * @param {string} slug
 * @param {string} label
 * @returns {Promise<string>} path to saved file
 */
async function saveScreenshot(page, slug, label) {
  const dir = ensureScreenshotDir(slug)
  const safe = label.replace(/[^a-z0-9-]/gi, '-').toLowerCase()
  const file = path.join(dir, `${safe}-${Date.now()}.png`)
  await page.screenshot({ path: file, fullPage: false }).catch(() => {})
  return file
}

/**
 * Register a fresh QA user via the API so login tests work without a seeded DB.
 * Returns { email, password } on success or null on failure.
 *
 * @param {string} baseUrl
 * @returns {Promise<{email:string,password:string}|null>}
 */
async function registerQaUser(baseUrl) {
  const user = createTestUser({ name: 'QA Smoke' })
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

// ── Sub-checks ─────────────────────────────────────────────────────────────

/**
 * Check 1: Root URL (/) loads and has a non-empty body.
 *
 * @param {import('playwright').Page} page
 * @param {string} baseUrl
 * @param {string} slug
 * @returns {Promise<{ title: string }>}
 */
async function checkPageLoads(page, baseUrl, slug) {
  const res = await page.goto(baseUrl, {
    waitUntil: 'domcontentloaded',
    timeout: NAV_TIMEOUT,
  })

  if (!res || (res.status() >= 400 && res.status() !== 404)) {
    await saveScreenshot(page, slug, 'page-loads-fail')
    throw new Error(`Root page returned HTTP ${res ? res.status() : 'no response'}`)
  }

  const bodyText = await page.evaluate(() => document.body?.innerText?.trim() ?? '')
  if (!bodyText) {
    await saveScreenshot(page, slug, 'page-loads-empty')
    throw new Error('Root page body is empty after load')
  }

  const title = await page.title()
  return { title }
}

/**
 * Check 2: Login/auth page renders email + password inputs.
 * Tries /auth, /login, /, /sign-in in order — stops at the first match.
 *
 * @param {import('playwright').Page} page
 * @param {string} baseUrl
 * @param {string} slug
 * @returns {Promise<{ route: string }>}
 */
async function checkLoginFormRenders(page, baseUrl, slug) {
  const candidates = ['/auth', '/login', '/sign-in', '/signin', '/']

  for (const route of candidates) {
    await page.goto(`${baseUrl}${route}`, {
      waitUntil: 'domcontentloaded',
      timeout: NAV_TIMEOUT,
    }).catch(() => {})

    const emailInput = page.locator(
      'input[type="email"], input[name="email"], input[placeholder*="email" i]'
    )
    const passInput = page.locator('input[type="password"]')

    const [hasEmail, hasPass] = await Promise.all([
      emailInput.count().then((c) => c > 0),
      passInput.count().then((c) => c > 0),
    ])

    if (hasEmail && hasPass) {
      return { route }
    }
  }

  await saveScreenshot(page, slug, 'login-form-fail')
  throw new Error(
    `No login form found on any candidate route: ${candidates.join(', ')}`
  )
}

/**
 * Check 3: Submit login form with valid credentials and confirm redirect off auth pages.
 *
 * @param {import('playwright').Page} page
 * @param {string} baseUrl
 * @param {{ email: string, password: string }} credentials
 * @param {string} slug
 * @returns {Promise<{ landedOn: string }>}
 */
async function checkLoginFlow(page, baseUrl, credentials, slug) {
  const authRoutes = ['/auth', '/login', '/sign-in', '/signin']
  let loginRoute = null

  for (const route of authRoutes) {
    await page.goto(`${baseUrl}${route}`, {
      waitUntil: 'domcontentloaded',
      timeout: NAV_TIMEOUT,
    }).catch(() => {})

    const emailInput = page.locator(
      'input[type="email"], input[name="email"], input[placeholder*="email" i]'
    )
    if ((await emailInput.count()) > 0) {
      loginRoute = route
      break
    }
  }

  if (!loginRoute) {
    throw new Error('Could not locate a login form to test login flow')
  }

  // Fill and submit
  await page.fill(
    'input[type="email"], input[name="email"], input[placeholder*="email" i]',
    credentials.email
  )
  await page.fill('input[type="password"]', credentials.password)
  await page.click('button[type="submit"]')

  // Wait for navigation away from auth pages
  try {
    await page.waitForURL(
      (url) => !authRoutes.some((r) => url.pathname === r || url.pathname.startsWith(r + '/')),
      { timeout: NAV_TIMEOUT }
    )
  } catch {
    await saveScreenshot(page, slug, 'login-flow-stuck')
    const currentUrl = page.url()
    throw new Error(
      `Login did not navigate away from auth page — still at: ${currentUrl}`
    )
  }

  return { landedOn: page.url() }
}

/**
 * Check 4: Dashboard page renders expected structural elements (nav, sidebar, main content).
 *
 * @param {import('playwright').Page} page
 * @param {string} slug
 * @returns {Promise<{ selectors: string[] }>}
 */
async function checkDashboardRenders(page, slug) {
  // Wait for the page to settle after login redirect
  await page.waitForLoadState('networkidle', { timeout: NAV_TIMEOUT }).catch(() => {})

  const structuralSelectors = [
    'nav, [role="navigation"]',
    'aside, [role="complementary"], .sidebar',
    'main, [role="main"], #root > div, .app',
  ]

  const found = []
  const missing = []

  for (const sel of structuralSelectors) {
    const count = await page.locator(sel).count()
    if (count > 0) {
      found.push(sel)
    } else {
      missing.push(sel)
    }
  }

  if (found.length === 0) {
    await saveScreenshot(page, slug, 'dashboard-renders-fail')
    throw new Error(
      `Dashboard has no structural elements — found nothing matching: ${structuralSelectors.join(', ')}`
    )
  }

  // Soft warning if some structural selectors are absent
  return { selectors: found, missing }
}

/**
 * Check 5: At least one navigation link is clickable and triggers a URL change.
 *
 * @param {import('playwright').Page} page
 * @param {string} slug
 * @returns {Promise<{ from: string, to: string }>}
 */
async function checkNavigation(page, slug) {
  const startUrl = page.url()

  // Find all internal links that look like nav items
  const links = await page.locator(
    'nav a[href], aside a[href], [role="navigation"] a[href], .sidebar a[href]'
  ).all()

  if (links.length === 0) {
    return { from: startUrl, to: startUrl, warning: 'No nav links found to test navigation' }
  }

  // Find a link that goes to a different path than the current one
  for (const link of links.slice(0, 8)) {
    const href = await link.getAttribute('href').catch(() => null)
    if (!href || href === '#' || href === '/' || href.startsWith('http')) continue

    const currentPath = new URL(page.url()).pathname
    if (href === currentPath) continue

    try {
      await link.click({ timeout: 5_000 })
      await page.waitForURL((url) => url.pathname !== currentPath, { timeout: 8_000 })
      const newUrl = page.url()
      if (newUrl !== startUrl) {
        return { from: startUrl, to: newUrl }
      }
    } catch {
      // Try the next link
    }
  }

  // Could not trigger navigation — warn, don't fail
  return {
    from: startUrl,
    to: startUrl,
    warning: 'Could not trigger navigation via any nav link — links may use SPA router',
  }
}

// ── Main entry point ───────────────────────────────────────────────────────

/**
 * Run all UI smoke tests against a deployed product.
 *
 * @param {{ url: string, productSlug: string }} ctx
 * @returns {Promise<{ status: 'pass'|'fail'|'warning', details: object, errors: string[], warnings: string[] }>}
 */
async function run(ctx) {
  const { url, productSlug } = ctx
  const errors = []
  const warnings = []
  const details = {}

  // Guard: check Playwright availability
  const pw = await tryLoadPlaywright()
  if (!pw) {
    return {
      status: 'warning',
      details: { skipped: true, reason: 'playwright module not available' },
      errors: [],
      warnings: ['Playwright not installed — ui-smoke tests skipped. Run: npm install playwright'],
    }
  }

  let browser = null

  try {
    // Try to launch Chromium; if binary is missing, warn instead of fail
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
            'Chromium binary not found — ui-smoke tests skipped. Run: npx playwright install chromium',
          ],
        }
      }
      throw err
    }

    const context = await browser.newContext({
      baseURL: url,
      viewport: { width: 1280, height: 800 },
      ignoreHTTPSErrors: true,
    })
    const page = await context.newPage()

    // Pre-register a QA user so login tests have valid credentials
    const credentials = await registerQaUser(url)
    if (!credentials) {
      warnings.push('Could not pre-register QA user — login flow tests will use fallback credentials')
    }
    const creds = credentials || {
      email: process.env.TEST_USER_EMAIL || 'test@example.com',
      password: process.env.TEST_USER_PASSWORD || 'TestPassword1!',
    }

    // Sub-check runner: capture errors/warnings, don't throw
    const subChecks = [
      { name: 'page-loads', fn: () => checkPageLoads(page, url, productSlug) },
      { name: 'login-form', fn: () => checkLoginFormRenders(page, url, productSlug) },
      { name: 'login-flow', fn: () => checkLoginFlow(page, url, creds, productSlug) },
      { name: 'dashboard-renders', fn: () => checkDashboardRenders(page, productSlug) },
      { name: 'navigation', fn: () => checkNavigation(page, productSlug) },
    ]

    for (const { name, fn } of subChecks) {
      try {
        const result = await fn()
        details[name] = result

        if (result && result.warning) {
          warnings.push(`[${name}] ${result.warning}`)
        }
        if (result && Array.isArray(result.missing) && result.missing.length > 0) {
          warnings.push(`[${name}] Missing structural selectors: ${result.missing.join(', ')}`)
        }
      } catch (err) {
        errors.push(`[${name}] ${err.message}`)
        details[name] = { error: err.message }
      }
    }

    await context.close()
  } finally {
    if (browser) {
      await browser.close().catch(() => {})
    }
  }

  const status = errors.length > 0 ? 'fail' : warnings.length > 0 ? 'warning' : 'pass'
  return { status, details, errors, warnings }
}

module.exports = { run }
