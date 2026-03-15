/**
 * @system/testing — Auth Helpers
 *
 * Reusable authentication helpers for both API and E2E tests.
 */

const { TEST_USER } = require('./test-user')

/**
 * Register a new user via the API.
 * @param {object} client - supertest agent or API client
 * @param {object} [user] - user data (defaults to TEST_USER)
 * @returns {Promise<object>} response body
 */
async function registerUser(client, user = TEST_USER) {
  const res = await client
    .post('/api/sessions/register')
    .send({
      email: user.email,
      password: user.password,
      name: user.name || 'Test User',
    })
  return res.body
}

/**
 * Login and return auth tokens.
 * @param {object} client - supertest agent or API client
 * @param {object} [user] - user credentials (defaults to TEST_USER)
 * @returns {Promise<{accessToken: string, refreshToken: string}>}
 */
async function loginUser(client, user = TEST_USER) {
  const res = await client
    .post('/api/sessions/login')
    .send({
      email: user.email,
      password: user.password,
    })
  return {
    accessToken: res.body.token || res.body.accessToken,
    refreshToken: res.body.refreshToken,
    cookies: res.headers['set-cookie'],
    body: res.body,
  }
}

/**
 * Create an authenticated supertest agent.
 * @param {object} client - supertest agent
 * @param {object} [user] - user credentials
 * @returns {Promise<object>} agent with auth header set
 */
async function authenticatedAgent(client, user = TEST_USER) {
  const { accessToken } = await loginUser(client, user)
  return {
    get: (url) => client.get(url).set('Authorization', `Bearer ${accessToken}`),
    post: (url) => client.post(url).set('Authorization', `Bearer ${accessToken}`),
    put: (url) => client.put(url).set('Authorization', `Bearer ${accessToken}`),
    patch: (url) => client.patch(url).set('Authorization', `Bearer ${accessToken}`),
    delete: (url) => client.delete(url).set('Authorization', `Bearer ${accessToken}`),
    token: accessToken,
  }
}

/**
 * Playwright: login via UI and store auth state.
 * @param {import('@playwright/test').Page} page
 * @param {object} [user] - user credentials
 */
async function playwrightLogin(page, user = TEST_USER) {
  await page.goto('/auth')
  await page.fill('input[name="email"], input[type="email"]', user.email)
  await page.fill('input[name="password"], input[type="password"]', user.password)
  await page.click('button[type="submit"]')
  // Wait for redirect away from auth
  await page.waitForURL((url) => !url.pathname.includes('/auth'), { timeout: 10_000 })
}

/**
 * Playwright: login via API and inject cookies/storage (faster than UI login).
 * @param {import('@playwright/test').Page} page
 * @param {string} apiUrl - backend URL
 * @param {object} [user] - user credentials
 */
async function playwrightApiLogin(page, apiUrl, user = TEST_USER) {
  const response = await page.request.post(`${apiUrl}/api/sessions/login`, {
    data: { email: user.email, password: user.password },
  })
  const body = await response.json()
  const token = body.token || body.accessToken

  // Inject token into localStorage
  await page.goto('/')
  await page.evaluate((t) => {
    localStorage.setItem('token', t)
    localStorage.setItem('accessToken', t)
  }, token)
}

module.exports = {
  registerUser,
  loginUser,
  authenticatedAgent,
  playwrightLogin,
  playwrightApiLogin,
}
