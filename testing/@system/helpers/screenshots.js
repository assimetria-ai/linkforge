/**
 * @system/testing — Screenshot Comparison Utilities
 *
 * Visual regression testing helpers for Playwright.
 * Compares current screenshots against baseline images.
 */

const fs = require('fs')
const path = require('path')

const BASELINE_DIR = path.resolve(process.cwd(), 'testing/screenshots/baseline')
const CURRENT_DIR = path.resolve(process.cwd(), 'testing/screenshots/current')
const DIFF_DIR = path.resolve(process.cwd(), 'testing/screenshots/diff')

/**
 * Ensure screenshot directories exist.
 */
function ensureDirs() {
  for (const dir of [BASELINE_DIR, CURRENT_DIR, DIFF_DIR]) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

/**
 * Take a screenshot and compare against baseline.
 * Uses Playwright's built-in toHaveScreenshot for pixel comparison.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} name - screenshot name (e.g., 'homepage', 'dashboard-empty')
 * @param {object} [options] - Playwright screenshot options
 * @param {number} [options.maxDiffPixelRatio] - max allowed diff ratio (default: 0.01)
 * @param {string[]} [options.mask] - selectors to mask (dynamic content)
 * @param {boolean} [options.fullPage] - capture full page (default: false)
 */
async function compareScreenshot(page, name, options = {}) {
  const {
    maxDiffPixelRatio = 0.01,
    mask = [],
    fullPage = false,
    ...rest
  } = options

  // Mask dynamic elements (timestamps, avatars, etc.)
  const maskLocators = mask.map((selector) => page.locator(selector))

  await page.screenshot({
    path: path.join(CURRENT_DIR, `${name}.png`),
    fullPage,
  })

  // Use Playwright's built-in visual comparison
  const expect = require('@playwright/test').expect
  await expect(page).toHaveScreenshot(`${name}.png`, {
    maxDiffPixelRatio,
    mask: maskLocators,
    fullPage,
    ...rest,
  })
}

/**
 * Capture screenshots of key pages for visual regression.
 * Useful as a batch operation in CI.
 *
 * @param {import('@playwright/test').Page} page
 * @param {Array<{name: string, url: string, options?: object}>} pages
 */
async function capturePageScreenshots(page, pages) {
  ensureDirs()
  const results = []

  for (const { name, url, options = {} } of pages) {
    try {
      await page.goto(url, { waitUntil: 'networkidle' })
      // Wait a beat for animations to settle
      await page.waitForTimeout(500)
      await compareScreenshot(page, name, options)
      results.push({ name, status: 'pass' })
    } catch (err) {
      results.push({ name, status: 'fail', error: err.message })
    }
  }

  return results
}

/**
 * Standard pages to screenshot for any product.
 * Override or extend in @custom tests.
 */
const STANDARD_PAGES = [
  { name: 'landing', url: '/' },
  { name: 'login', url: '/auth' },
  { name: 'pricing', url: '/pricing' },
  { name: 'terms', url: '/terms' },
  { name: 'privacy', url: '/privacy' },
  { name: '404', url: '/this-page-does-not-exist' },
]

/**
 * Update baseline screenshots (run manually when UI changes are intentional).
 * @param {import('@playwright/test').Page} page
 * @param {Array<{name: string, url: string}>} [pages] - pages to capture
 */
async function updateBaselines(page, pages = STANDARD_PAGES) {
  ensureDirs()

  for (const { name, url } of pages) {
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    await page.screenshot({
      path: path.join(BASELINE_DIR, `${name}.png`),
      fullPage: false,
    })
  }
}

module.exports = {
  compareScreenshot,
  capturePageScreenshots,
  updateBaselines,
  STANDARD_PAGES,
  BASELINE_DIR,
  CURRENT_DIR,
  DIFF_DIR,
}
