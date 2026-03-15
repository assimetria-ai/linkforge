/**
 * @system/testing — Shared Playwright Fixtures
 *
 * Extended fixtures for E2E tests. Import instead of @playwright/test:
 *   const { test, expect } = require('../../testing/@system/helpers/fixtures')
 */

const { test as base, expect } = require('@playwright/test')
const { TEST_USER, ADMIN_USER, createTestUser } = require('./test-user')

const test = base.extend({
  /**
   * Auth page helpers (navigate to /auth, fill forms, submit).
   */
  authPage: async ({ page }, use) => {
    const helpers = {
      goto: () => page.goto('/auth'),
      fillEmail: (email) => page.fill('input[name="email"], input[type="email"]', email),
      fillPassword: (password) => page.fill('input[name="password"], input[type="password"]', password),
      submit: () => page.click('button[type="submit"]'),

      async login(email, password) {
        await page.goto('/auth')
        await page.fill('input[name="email"], input[type="email"]', email || TEST_USER.email)
        await page.fill('input[name="password"], input[type="password"]', password || TEST_USER.password)
        await page.click('button[type="submit"]')
      },

      async getError() {
        const el = page.locator('[role="alert"], .error-message, [data-testid="error"]').first()
        const visible = await el.isVisible().catch(() => false)
        return visible ? el.textContent() : null
      },
    }
    await use(helpers)
  },

  /**
   * Authenticated page: already logged in as TEST_USER.
   */
  authedPage: async ({ page }, use) => {
    const apiUrl = process.env.API_URL || 'http://localhost:3000'
    try {
      const response = await page.request.post(`${apiUrl}/api/sessions/login`, {
        data: { email: TEST_USER.email, password: TEST_USER.password },
      })
      const body = await response.json()
      const token = body.token || body.accessToken

      await page.goto('/')
      await page.evaluate((t) => {
        localStorage.setItem('token', t)
        localStorage.setItem('accessToken', t)
      }, token)
    } catch {
      // API login failed — fall back to UI login
      await page.goto('/auth')
      await page.fill('input[name="email"], input[type="email"]', TEST_USER.email)
      await page.fill('input[name="password"], input[type="password"]', TEST_USER.password)
      await page.click('button[type="submit"]')
    }
    await use(page)
  },

  /**
   * Fresh test user (unique per test).
   */
  freshUser: async ({}, use) => {
    await use(createTestUser())
  },
})

/** Helper: wait for navigation to a path */
async function waitForPath(page, urlPath, timeout = 10_000) {
  await page.waitForURL(`**${urlPath}`, { timeout })
}

module.exports = {
  test,
  expect,
  waitForPath,
  TEST_USER,
  ADMIN_USER,
}
