import { test, expect } from '@playwright/test'

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

test.describe('Public pages', () => {
  test.beforeEach(async ({ page }) => {
    await mockUnauth(page)
  })

  test('landing page loads', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL('/')
    await expect(page.locator('body')).toBeVisible()
  })

  test('login page is accessible', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveURL('/login')
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
  })

  test('register page is accessible', async ({ page }) => {
    await page.goto('/register')
    await expect(page).toHaveURL('/register')
    await expect(page.getByRole('heading', { name: /get started/i })).toBeVisible()
  })

  test('pricing/terms/privacy routes are accessible', async ({ page }) => {
    for (const path of ['/pricing', '/terms', '/privacy']) {
      await page.goto(path)
      await expect(page).toHaveURL(path)
      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('unknown route renders 404 page', async ({ page }) => {
    await page.goto('/this-route-does-not-exist-xyz')
    await expect(page.locator('body')).toBeVisible()
  })
})
