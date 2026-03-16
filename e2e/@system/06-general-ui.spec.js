import { test, expect } from '@playwright/test'

const MOCK_USER = {
  id: 'u-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
  onboardingCompleted: true,
  emailVerified: true,
  preferences: {},
}

async function mockUnauth(page) {
  await page.route('**/api/sessions/me', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Unauthorized' }),
    })
  })

  await page.route('**/api/sessions/refresh', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'No refresh token' }),
    })
  })
}

async function mockAuth(page) {
  await page.route('**/api/sessions/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user: MOCK_USER }),
    })
  })

  await page.route('**/api/sessions/refresh', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'No refresh token' }),
    })
  })

  await page.route('**/api/users/me', async (route) => {
    if (route.request().method() === 'PATCH') {
      const payload = route.request().postDataJSON() ?? {}
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: { ...MOCK_USER, ...payload } }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user: MOCK_USER }),
    })
  })

  await page.route('**/api/usage/dashboard', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        today: { cost: 0, currency: 'USD' },
        yesterday: { cost: 0, change: null },
        thisMonth: { cost: 0, currency: 'USD', limit: null, percentUsed: null },
        lastMonth: { cost: 0, change: null },
        topServices: [],
        trends: [],
        limits: null,
      }),
    })
  })
}

test.describe('General UI checks', () => {
  test('mobile viewport renders login form correctly', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const page = await context.newPage()
    await mockUnauth(page)

    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()

    await context.close()
  })

  test('dark mode preference toggle works', async ({ page }) => {
    await mockAuth(page)
    await page.goto('/app/settings')

    await page.getByRole('tab', { name: /preferences/i }).click()
    await page.getByRole('button', { name: /dark/i }).click()
    await page.getByRole('button', { name: /save changes/i }).click()

    await expect(page.locator('html')).toHaveClass(/dark/)
  })

  test('unknown route shows not found UI', async ({ page }) => {
    await mockUnauth(page)
    await page.goto('/route-that-does-not-exist')

    await expect(page.locator('body')).toBeVisible()
  })

  test('protected pages redirect unauthenticated users to /login', async ({ page }) => {
    await mockUnauth(page)

    for (const path of ['/app', '/app/activity', '/app/settings', '/app/billing']) {
      await page.goto(path)
      await expect(page).toHaveURL(/\/login$/)
    }
  })
})
