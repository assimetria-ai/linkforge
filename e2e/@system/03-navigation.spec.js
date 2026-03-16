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

test.describe('Client-side navigation', () => {
  test.beforeEach(async ({ page }) => {
    await mockUnauth(page)
  })

  test('legacy aliases work', async ({ page }) => {
    await page.goto('/auth')
    await expect(page).toHaveURL('/login')

    await page.goto('/signup')
    await expect(page).toHaveURL('/register')

    await page.goto('/cookie-policy')
    await expect(page).toHaveURL('/cookies')
  })

  test('browser back button works', async ({ page }) => {
    await page.goto('/')
    await page.goto('/pricing')
    await page.goBack()
    await expect(page).toHaveURL('/')
  })

  test('dashboard alias redirects to /app then auth guard redirects to /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/login')
  })

  test('unknown nested route still renders app shell', async ({ page }) => {
    await page.goto('/a/b/c/d/e/f/unknown')
    await expect(page.locator('body')).toBeVisible()
  })
})
