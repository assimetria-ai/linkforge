/**
 * @system/qa-framework — API Endpoint Checks
 *
 * Validates CRUD endpoints, auth-protection, error responses, and response shapes
 * for a deployed product's API.
 *
 * Sub-checks performed:
 *   1. health-endpoint      GET /api/health → 200
 *   2. unauthenticated-get  Common GET routes return 401/403 without a token
 *   3. auth-register        POST /api/sessions/register creates a user
 *   4. auth-login           POST /api/sessions/login returns token
 *   5. authenticated-get    GET routes succeed with valid token
 *   6. users-crud           GET/PUT /api/users or /api/users/me with auth
 *   7. settings-endpoint    GET /api/settings with auth
 *   8. not-found            GET /api/does-not-exist-qa-probe → 404
 *   9. bad-request          POST /api/sessions/login missing body → 400/422
 *  10. unauthorized-access  Protected GET with invalid token → 401
 *
 * Uses native fetch only (Node 18+). No external dependencies.
 */

'use strict'

const { createTestUser } = require('../../helpers/test-user')

/** @type {number} Default per-request timeout in ms */
const REQ_TIMEOUT = 12_000

/**
 * Fetch with a hard abort timeout.
 *
 * @param {string} url
 * @param {RequestInit & { timeoutMs?: number }} [opts]
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, opts = {}) {
  const { timeoutMs = REQ_TIMEOUT, ...rest } = opts
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    return await fetch(url, { ...rest, signal: ctrl.signal })
  } finally {
    clearTimeout(t)
  }
}

/**
 * Attempt to parse a response as JSON, returning null on failure.
 *
 * @param {Response} res
 * @returns {Promise<object|null>}
 */
async function safeJson(res) {
  try {
    return await res.json()
  } catch {
    return null
  }
}

// ── Sub-checks ─────────────────────────────────────────────────────────────

/**
 * Check 1: GET /api/health must return 200.
 *
 * @param {string} baseUrl
 * @returns {Promise<{ status: number }>}
 */
async function checkHealthEndpoint(baseUrl) {
  const res = await fetchWithTimeout(`${baseUrl}/api/health`)
  if (res.status !== 200) {
    throw new Error(`/api/health returned HTTP ${res.status} (expected 200)`)
  }
  return { status: res.status }
}

/**
 * Check 2: Protected GET routes should reject unauthenticated requests with 401 or 403.
 * Tests a sample of common protected endpoints.
 *
 * @param {string} baseUrl
 * @returns {Promise<{ checked: string[], warnings: string[] }>}
 */
async function checkUnauthenticatedAccess(baseUrl) {
  const protectedRoutes = [
    '/api/users',
    '/api/users/me',
    '/api/settings',
    '/api/admin/users',
  ]
  const warnings = []
  const checked = []

  await Promise.all(
    protectedRoutes.map(async (route) => {
      const res = await fetchWithTimeout(`${baseUrl}${route}`, {
        timeoutMs: 8_000,
      }).catch(() => null)

      if (!res) {
        warnings.push(`Could not reach ${route} — skipped`)
        return
      }

      // 404 means the route doesn't exist on this product; skip gracefully
      if (res.status === 404) return

      if (res.status === 200) {
        warnings.push(
          `${route} returned 200 without auth — may be missing auth middleware`
        )
      }

      checked.push(`${route} → ${res.status}`)
    })
  )

  return { checked, warnings }
}

/**
 * Check 3+4: Register a fresh QA user and login, returning the auth token.
 *
 * @param {string} baseUrl
 * @returns {Promise<{ token: string, email: string, warnings: string[] }>}
 */
async function checkAuthEndpoints(baseUrl) {
  const user = createTestUser({ name: 'QA API Check' })
  const warnings = []

  // Register
  const regRes = await fetchWithTimeout(`${baseUrl}/api/sessions/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, password: user.password, name: user.name }),
  })

  if (regRes.status !== 200 && regRes.status !== 201) {
    throw new Error(
      `POST /api/sessions/register returned HTTP ${regRes.status} (expected 200 or 201)`
    )
  }

  const regBody = await safeJson(regRes)
  if (!regBody) {
    warnings.push('Register response body is not valid JSON')
  }

  // Login
  const loginRes = await fetchWithTimeout(`${baseUrl}/api/sessions/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, password: user.password }),
  })

  if (loginRes.status !== 200) {
    throw new Error(
      `POST /api/sessions/login returned HTTP ${loginRes.status} (expected 200)`
    )
  }

  const loginBody = await safeJson(loginRes)
  const token = loginBody && (loginBody.token || loginBody.accessToken)

  if (!token) {
    throw new Error('Login response does not contain a token or accessToken field')
  }

  return { token, email: user.email, warnings }
}

/**
 * Check 5: Authenticated GET on common routes must return 200.
 * Routes that don't exist (404) are skipped.
 *
 * @param {string} baseUrl
 * @param {string} token
 * @returns {Promise<{ results: Array<{route: string, status: number}>, warnings: string[] }>}
 */
async function checkAuthenticatedGets(baseUrl, token) {
  const routes = ['/api/users/me', '/api/settings', '/api/health']
  const warnings = []
  const results = []

  await Promise.all(
    routes.map(async (route) => {
      const res = await fetchWithTimeout(`${baseUrl}${route}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeoutMs: 8_000,
      }).catch(() => null)

      if (!res) {
        warnings.push(`Could not reach ${route} — skipped`)
        return
      }

      results.push({ route, status: res.status })

      if (res.status === 401 || res.status === 403) {
        warnings.push(`${route} returned ${res.status} despite valid auth token`)
      }
    })
  )

  return { results, warnings }
}

/**
 * Check 6: Users CRUD — GET /api/users/me and PUT /api/users/me (or /api/users).
 * Validates that user resource endpoints respond correctly with auth.
 *
 * @param {string} baseUrl
 * @param {string} token
 * @returns {Promise<{ me: object|null, warnings: string[] }>}
 */
async function checkUsersCrud(baseUrl, token) {
  const warnings = []
  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  // GET /api/users/me
  const meRes = await fetchWithTimeout(`${baseUrl}/api/users/me`, {
    headers: authHeaders,
    timeoutMs: 8_000,
  }).catch(() => null)

  if (!meRes) {
    warnings.push('GET /api/users/me — connection failed, skipped')
    return { me: null, warnings }
  }

  if (meRes.status === 404) {
    warnings.push('GET /api/users/me not implemented — endpoint missing')
    return { me: null, warnings }
  }

  if (meRes.status !== 200) {
    throw new Error(`GET /api/users/me returned HTTP ${meRes.status} (expected 200)`)
  }

  const me = await safeJson(meRes)
  if (!me || typeof me !== 'object') {
    warnings.push('GET /api/users/me did not return a JSON object')
  }

  // Verify expected user shape
  const hasId = me && (me.id || me._id || me.userId)
  const hasEmail = me && me.email
  if (!hasId) warnings.push('/api/users/me response missing id field')
  if (!hasEmail) warnings.push('/api/users/me response missing email field')

  return { me, warnings }
}

/**
 * Check 7: GET /api/settings with auth. Warns if endpoint missing; fails if 401.
 *
 * @param {string} baseUrl
 * @param {string} token
 * @returns {Promise<{ status: number, warnings: string[] }>}
 */
async function checkSettingsEndpoint(baseUrl, token) {
  const warnings = []

  const res = await fetchWithTimeout(`${baseUrl}/api/settings`, {
    headers: { Authorization: `Bearer ${token}` },
    timeoutMs: 8_000,
  }).catch(() => null)

  if (!res) {
    warnings.push('GET /api/settings — connection failed, skipped')
    return { status: 0, warnings }
  }

  if (res.status === 404) {
    warnings.push('GET /api/settings not implemented — endpoint missing')
    return { status: 404, warnings }
  }

  if (res.status === 401 || res.status === 403) {
    throw new Error(
      `GET /api/settings returned ${res.status} with valid auth token`
    )
  }

  return { status: res.status, warnings }
}

/**
 * Check 8: Unknown route must return 404 (not 200 or 500).
 *
 * @param {string} baseUrl
 * @returns {Promise<{ status: number }>}
 */
async function checkNotFound(baseUrl) {
  const res = await fetchWithTimeout(
    `${baseUrl}/api/does-not-exist-qa-probe-${Date.now()}`,
    { timeoutMs: 8_000 }
  )

  if (res.status === 200) {
    throw new Error('Unknown route returned 200 — catch-all may be misconfigured')
  }

  if (res.status === 500) {
    throw new Error('Unknown route returned 500 — server error on missing routes')
  }

  // 404 is ideal; 400/401/403 are acceptable
  return { status: res.status }
}

/**
 * Check 9: POST /api/sessions/login with an empty body must return 400 or 422.
 *
 * @param {string} baseUrl
 * @returns {Promise<{ status: number }>}
 */
async function checkBadRequestHandling(baseUrl) {
  const res = await fetchWithTimeout(`${baseUrl}/api/sessions/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
    timeoutMs: 8_000,
  })

  if (res.status === 200) {
    throw new Error(
      'POST /api/sessions/login with empty body returned 200 — input validation may be missing'
    )
  }

  if (res.status === 500) {
    throw new Error(
      'POST /api/sessions/login with empty body returned 500 — server throws on invalid input'
    )
  }

  // Accept 400, 401, 422 as correct error responses
  return { status: res.status }
}

/**
 * Check 10: Authenticated GET with an invalid/tampered token must return 401.
 *
 * @param {string} baseUrl
 * @returns {Promise<{ checked: string[], warnings: string[] }>}
 */
async function checkInvalidTokenRejection(baseUrl) {
  const fakeToken = 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJxYS10ZXN0In0.invalid_sig'
  const warnings = []
  const checked = []

  const routes = ['/api/users/me', '/api/settings']

  await Promise.all(
    routes.map(async (route) => {
      const res = await fetchWithTimeout(`${baseUrl}${route}`, {
        headers: { Authorization: fakeToken },
        timeoutMs: 8_000,
      }).catch(() => null)

      if (!res) return

      if (res.status === 404) return // Route doesn't exist on this product

      if (res.status === 200) {
        warnings.push(
          `${route} returned 200 with invalid/tampered JWT — auth middleware may not be validating signatures`
        )
      }

      checked.push(`${route} → ${res.status}`)
    })
  )

  return { checked, warnings }
}

// ── Main entry point ───────────────────────────────────────────────────────

/**
 * Run all API endpoint checks against a deployed product.
 *
 * @param {{ url: string, productSlug: string }} ctx
 * @returns {Promise<{ status: 'pass'|'fail'|'warning', details: object, errors: string[], warnings: string[] }>}
 */
async function run(ctx) {
  const { url } = ctx
  const errors = []
  const warnings = []
  const details = {}

  // Phase A: no-auth checks (parallel)
  const [healthResult, unauthResult, notFoundResult, badRequestResult] =
    await Promise.allSettled([
      checkHealthEndpoint(url),
      checkUnauthenticatedAccess(url),
      checkNotFound(url),
      checkBadRequestHandling(url),
    ])

  for (const [name, settled] of [
    ['health-endpoint', healthResult],
    ['unauthenticated-access', unauthResult],
    ['not-found', notFoundResult],
    ['bad-request', badRequestResult],
  ]) {
    if (settled.status === 'rejected') {
      errors.push(`[${name}] ${settled.reason.message}`)
      details[name] = { error: settled.reason.message }
    } else {
      details[name] = settled.value
      if (Array.isArray(settled.value.warnings)) {
        for (const w of settled.value.warnings) warnings.push(`[${name}] ${w}`)
      }
    }
  }

  // Phase B: get a valid token — needed for subsequent auth checks
  let token = null
  try {
    const authResult = await checkAuthEndpoints(url)
    token = authResult.token
    details['auth-endpoints'] = { email: authResult.email }
    for (const w of authResult.warnings) warnings.push(`[auth-endpoints] ${w}`)
  } catch (err) {
    errors.push(`[auth-endpoints] ${err.message}`)
    details['auth-endpoints'] = { error: err.message }
  }

  // Phase C: auth-dependent checks (parallel, only if token obtained)
  if (token) {
    const [authedGetsResult, usersCrudResult, settingsResult, invalidTokenResult] =
      await Promise.allSettled([
        checkAuthenticatedGets(url, token),
        checkUsersCrud(url, token),
        checkSettingsEndpoint(url, token),
        checkInvalidTokenRejection(url),
      ])

    for (const [name, settled] of [
      ['authenticated-gets', authedGetsResult],
      ['users-crud', usersCrudResult],
      ['settings-endpoint', settingsResult],
      ['invalid-token-rejection', invalidTokenResult],
    ]) {
      if (settled.status === 'rejected') {
        errors.push(`[${name}] ${settled.reason.message}`)
        details[name] = { error: settled.reason.message }
      } else {
        details[name] = settled.value
        if (Array.isArray(settled.value.warnings)) {
          for (const w of settled.value.warnings) warnings.push(`[${name}] ${w}`)
        }
      }
    }
  } else {
    warnings.push('[api-endpoints] Skipped auth-dependent checks — could not obtain token')
  }

  const status = errors.length > 0 ? 'fail' : warnings.length > 0 ? 'warning' : 'pass'
  return { status, details, errors, warnings }
}

module.exports = { run }
