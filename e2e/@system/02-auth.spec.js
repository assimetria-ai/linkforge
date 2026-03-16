import { test, expect } from '@playwright/test'

function uniqueUser(label = 'user') {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`
  return {
    name: `E2E ${label} ${stamp}`,
    email: `e2e-${label}-${stamp}@example.com`,
    password: 'TestPassword1!',
  }
}

async function registerThroughApi(request, user) {
  const res = await request.post('/api/users', {
    data: {
      name: user.name,
      email: user.email,
      password: user.password,
    },
  })

  if (![201, 409].includes(res.status())) {
    const body = await res.text()
    throw new Error(`Failed to register seed user: ${res.status()} ${body}`)
  }
}

test.describe('Auth flow (real backend)', () => {
  test('visit /login shows login form and auth actions', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /create one/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /continue with github/i })).toBeVisible()
  })

  test('empty login submit keeps user on /login with validation visible', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByText(/valid email|password is required/i)).toBeVisible()
  })

  test('invalid email input shows validation error', async ({ page }) => {
    await page.goto('/login')

    await page.fill('input[type="email"]', 'bad-email')
    await page.fill('input[type="password"]', 'TestPassword1!')
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page.getByText(/valid email/i)).toBeVisible()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('valid credentials redirect into app and session endpoint is authenticated', async ({ page, request }) => {
    const user = uniqueUser('login')
    await registerThroughApi(request, user)

    await page.goto('/login')
    await page.fill('input[type="email"]', user.email)
    await page.fill('input[type="password"]', user.password)
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page).toHaveURL(/\/app(\/|$)/)

    const meRes = await page.request.get('/api/sessions/me')
    expect(meRes.ok()).toBeTruthy()
    const meBody = await meRes.json()
    expect(meBody.user.email).toBe(user.email)
  })

  test('visit /register shows registration form', async ({ page }) => {
    await page.goto('/register')

    await expect(page.getByRole('heading', { name: /get started/i })).toBeVisible()
    await expect(page.locator('input#name')).toBeVisible()
    await expect(page.locator('input#email')).toBeVisible()
    await expect(page.locator('input#password')).toBeVisible()
    await expect(page.locator('input#confirmPassword')).toBeVisible()
  })

  test('register new user redirects into app', async ({ page }) => {
    const user = uniqueUser('register')

    await page.goto('/register')
    await page.fill('input#name', user.name)
    await page.fill('input#email', user.email)
    await page.fill('input#password', user.password)
    await page.fill('input#confirmPassword', user.password)
    await page.getByRole('button', { name: /create account/i }).click()

    await expect(page).toHaveURL(/\/app(\/|$)/)
  })

  test('register duplicate email shows error', async ({ page, request }) => {
    const user = uniqueUser('duplicate')
    await registerThroughApi(request, user)

    await page.goto('/register')
    await page.fill('input#name', user.name)
    await page.fill('input#email', user.email)
    await page.fill('input#password', user.password)
    await page.fill('input#confirmPassword', user.password)
    await page.getByRole('button', { name: /create account/i }).click()

    await expect(page.getByText(/email already in use|already exists/i)).toBeVisible()
    await expect(page).toHaveURL(/\/register$/)
  })

  test('forgot password link navigates to /forgot-password', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: /forgot password/i }).click()
    await expect(page).toHaveURL(/\/forgot-password$/)
  })

  test('logout invalidates session and /app becomes inaccessible', async ({ page, request }) => {
    const user = uniqueUser('logout')
    await registerThroughApi(request, user)

    await page.goto('/login')
    await page.fill('input[type="email"]', user.email)
    await page.fill('input[type="password"]', user.password)
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/app(\/|$)/)

    const logoutRes = await page.request.delete('/api/sessions')
    expect(logoutRes.ok()).toBeTruthy()

    await page.goto('/app')
    await expect(page).toHaveURL(/\/login$/)
  })
})
