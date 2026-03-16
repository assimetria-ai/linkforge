import { test, expect } from '@playwright/test'

const MOCK_USER = {
  id: 'u-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
  onboardingCompleted: true,
  emailVerified: true,
}

async function mockAuthenticatedApp(page) {
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

  await page.route('**/api/usage/dashboard', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        today: { cost: 1.23, currency: 'USD' },
        yesterday: { cost: 1.0, change: { value: 23, direction: 'up' } },
        thisMonth: { cost: 12.34, currency: 'USD', limit: 100, percentUsed: '12.3' },
        lastMonth: { cost: 10.0, change: { value: 23, direction: 'up' } },
        topServices: [
          { service: 'openai', cost: 5, requests: 20 },
          { service: 'storage', cost: 2, requests: 5 },
        ],
        trends: [],
        limits: { monthly: 100, daily: 20, alertThreshold: 80 },
      }),
    })
  })

  await page.route('**/api/users/me', async (route) => {
    if (route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON() ?? {}
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: { ...MOCK_USER, ...body } }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user: MOCK_USER }),
    })
  })

  await page.route('**/api/teams**', async (route) => {
    const method = route.request().method()

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ teams: [{ id: 1, name: 'Core Team', slug: 'core-team' }], total: 1, limit: 20, offset: 0 }),
      })
      return
    }

    if (method === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ team: { id: 2, name: 'Growth Team', slug: 'growth-team' } }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    })
  })

  await page.route('**/api/invitations/pending', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ invitations: [] }),
    })
  })
}

test.describe('Dashboard and app routes', () => {
  test('dashboard loads with data', async ({ page }) => {
    await mockAuthenticatedApp(page)
    await page.goto('/app')

    await expect(page).toHaveURL(/\/app$/)
    await expect(page.getByText(/today's cost/i)).toBeVisible()
  })

  test('sidebar navigation routes load', async ({ page }) => {
    await mockAuthenticatedApp(page)

    await page.goto('/app/activity')
    await expect(page).toHaveURL(/\/app\/activity$/)

    await page.goto('/app/billing')
    await expect(page).toHaveURL(/\/app\/billing$/)

    await page.goto('/app/settings')
    await expect(page).toHaveURL(/\/app\/settings$/)
    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible()
  })

  test('teams page loads and shows teams data', async ({ page }) => {
    await mockAuthenticatedApp(page)
    await page.goto('/app/teams')

    await expect(page).toHaveURL(/\/app\/teams$/)
    await expect(page.getByRole('heading', { name: /^teams$/i })).toBeVisible()
  })

  test('account settings page loads and profile can be updated', async ({ page }) => {
    await mockAuthenticatedApp(page)
    await page.goto('/app/settings')

    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible()

    const nameInput = page.locator('input#name')
    await nameInput.fill('Updated User')
    await page.getByRole('button', { name: /save changes/i }).click()

    await expect(nameInput).toHaveValue('Updated User')
  })
})
