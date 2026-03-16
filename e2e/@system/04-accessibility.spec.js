import { test, expect } from '@playwright/test'

const PUBLIC_ROUTES = [
  { path: '/', name: 'Landing' },
  { path: '/login', name: 'Login' },
  { path: '/register', name: 'Register' },
  { path: '/pricing', name: 'Pricing' },
  { path: '/help', name: 'Help' },
]

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

for (const { path, name } of PUBLIC_ROUTES) {
  test(`${name} (${path}) has non-empty title and heading`, async ({ page }) => {
    await mockUnauth(page)
    await page.goto(path)

    await expect(page).toHaveTitle(/.+/)
    const headingCount = await page.locator('h1, h2, h3').count()
    expect(headingCount).toBeGreaterThan(0)
  })
}

test('images have alt text on landing page', async ({ page }) => {
  await mockUnauth(page)
  await page.goto('/')

  const images = page.locator('img')
  const count = await images.count()

  for (let i = 0; i < count; i += 1) {
    const alt = await images.nth(i).getAttribute('alt')
    expect(alt).not.toBeNull()
  }
})

test('login form inputs expose labels/ids', async ({ page }) => {
  await mockUnauth(page)
  await page.goto('/login')

  const inputs = page.locator('input[type="email"], input[type="password"], input[type="text"]')
  const count = await inputs.count()

  for (let i = 0; i < count; i += 1) {
    const input = inputs.nth(i)
    const id = await input.getAttribute('id')
    const ariaLabel = await input.getAttribute('aria-label')
    const ariaLabelledBy = await input.getAttribute('aria-labelledby')
    expect(id !== null || ariaLabel !== null || ariaLabelledBy !== null).toBe(true)
  }
})
