/**
 * @system/qa-framework — Performance Benchmarks
 *
 * Measures real-world load times and API response latencies for a deployed product.
 * All measurements are taken with native fetch (Node 18+) — no browser involved.
 *
 * Metrics collected:
 *   1. page-load-time   Time to receive the full HTML document (GET /)
 *   2. ttfb             Time To First Byte for GET /
 *   3. api-health       Round-trip latency for GET /api/health
 *   4. api-auth         Round-trip latency for POST /api/sessions/login
 *   5. api-dashboard    Round-trip latency for an authenticated GET endpoint
 *   6. concurrent-load  10 parallel requests to /api/health — p95 latency
 *
 * Thresholds (configurable via env vars):
 *   PAGE_LOAD_THRESHOLD_MS  default: 5000  (5s)
 *   API_THRESHOLD_MS        default: 2000  (2s)
 *   TTFB_THRESHOLD_MS       default: 1000  (1s)
 *   P95_THRESHOLD_MS        default: 3000  (3s)
 *
 * Uses only Node.js built-ins + native fetch (Node 18+). No external dependencies.
 */

'use strict'

const { performance: nodePerfHooks } = require('perf_hooks')
const { createTestUser } = require('../../helpers/test-user')

// ── Thresholds ──────────────────────────────────────────────────────────────

const THRESHOLDS = {
  pageLoad:   parseInt(process.env.PAGE_LOAD_THRESHOLD_MS, 10) || 5_000,
  api:        parseInt(process.env.API_THRESHOLD_MS, 10)       || 2_000,
  ttfb:       parseInt(process.env.TTFB_THRESHOLD_MS, 10)      || 1_000,
  p95:        parseInt(process.env.P95_THRESHOLD_MS, 10)       || 3_000,
}

// ── Fetch helpers ───────────────────────────────────────────────────────────

/**
 * Fetch a URL and measure wall-clock time.
 * Returns the response plus timing in ms.
 *
 * @param {string} url
 * @param {RequestInit & { timeoutMs?: number }} [opts]
 * @returns {Promise<{ res: Response, duration_ms: number }>}
 */
async function timedFetch(url, opts = {}) {
  const { timeoutMs = 15_000, ...rest } = opts
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)

  const start = nodePerfHooks.now()
  try {
    const res = await fetch(url, { ...rest, signal: ctrl.signal })
    const duration_ms = Math.round(nodePerfHooks.now() - start)
    return { res, duration_ms }
  } finally {
    clearTimeout(t)
  }
}

/**
 * Measure Time To First Byte using the Node.js http/https modules so we can
 * capture the TTFB independently of the full body download.
 *
 * Falls back to a full fetch time measurement if something goes wrong.
 *
 * @param {string} urlStr
 * @param {number} [timeoutMs]
 * @returns {Promise<{ ttfb_ms: number }>}
 */
async function measureTtfb(urlStr, timeoutMs = 15_000) {
  const { request: httpsRequest } = require('https')
  const { request: httpRequest }  = require('http')
  const { URL: NodeURL }          = require('url')

  let parsed
  try {
    parsed = new NodeURL(urlStr)
  } catch {
    const { duration_ms } = await timedFetch(urlStr, { timeoutMs })
    return { ttfb_ms: duration_ms }
  }

  const lib = parsed.protocol === 'https:' ? httpsRequest : httpRequest

  return new Promise((resolve) => {
    const start = nodePerfHooks.now()
    let ttfbCaptured = false

    const req = lib(
      {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: 'GET',
        headers: { 'User-Agent': 'AssimetriaQA-Perf/1.0' },
      },
      (res) => {
        // First 'data' event = TTFB
        res.once('data', () => {
          if (!ttfbCaptured) {
            ttfbCaptured = true
            resolve({ ttfb_ms: Math.round(nodePerfHooks.now() - start) })
            req.destroy()
          }
        })
        res.on('error', () => {
          if (!ttfbCaptured) {
            resolve({ ttfb_ms: Math.round(nodePerfHooks.now() - start) })
          }
        })
      }
    )

    req.setTimeout(timeoutMs, () => {
      if (!ttfbCaptured) {
        req.destroy()
        resolve({ ttfb_ms: Math.round(nodePerfHooks.now() - start) })
      }
    })

    req.on('error', () => {
      if (!ttfbCaptured) {
        resolve({ ttfb_ms: Math.round(nodePerfHooks.now() - start) })
      }
    })

    req.end()
  })
}

/**
 * Register + login a fresh QA user. Returns { token } or throws.
 *
 * @param {string} baseUrl
 * @returns {Promise<{ token: string, duration_ms: number }>}
 */
async function measureAuthLatency(baseUrl) {
  const user = createTestUser({ name: 'QA Perf' })

  // Register (not measured — setup cost)
  const regCtrl = new AbortController()
  const regT = setTimeout(() => regCtrl.abort(), 10_000)
  await fetch(`${baseUrl}/api/sessions/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, password: user.password, name: user.name }),
    signal: regCtrl.signal,
  }).finally(() => clearTimeout(regT))

  // Login (measured)
  const { res: loginRes, duration_ms } = await timedFetch(
    `${baseUrl}/api/sessions/login`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: user.password }),
      timeoutMs: 12_000,
    }
  )

  if (loginRes.status !== 200) {
    throw new Error(
      `Auth latency test: POST /api/sessions/login returned HTTP ${loginRes.status}`
    )
  }

  const body = await loginRes.json().catch(() => ({}))
  const token = body.token || body.accessToken
  if (!token) {
    throw new Error('Auth latency test: login response missing token')
  }

  return { token, duration_ms }
}

// ── Percentile helper ───────────────────────────────────────────────────────

/**
 * Calculate a percentile from a sorted array of numbers.
 *
 * @param {number[]} sorted - already sorted ascending
 * @param {number} p - percentile 0–100
 * @returns {number}
 */
function percentile(sorted, p) {
  if (sorted.length === 0) return 0
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))]
}

// ── Sub-checks ──────────────────────────────────────────────────────────────

/**
 * Measure 1: Full page load time (GET /).
 *
 * @param {string} baseUrl
 * @returns {Promise<{ duration_ms: number, threshold_ms: number, pass: boolean }>}
 */
async function measurePageLoad(baseUrl) {
  const { res, duration_ms } = await timedFetch(`${baseUrl}/`, { timeoutMs: 20_000 })

  if (res.status >= 500) {
    throw new Error(`Page load returned HTTP ${res.status}`)
  }

  // Drain the body to get accurate full-load timing
  await res.text().catch(() => {})

  const pass = duration_ms <= THRESHOLDS.pageLoad
  return { duration_ms, threshold_ms: THRESHOLDS.pageLoad, pass }
}

/**
 * Measure 2: TTFB for the main page.
 *
 * @param {string} baseUrl
 * @returns {Promise<{ ttfb_ms: number, threshold_ms: number, pass: boolean }>}
 */
async function measurePageTtfb(baseUrl) {
  const { ttfb_ms } = await measureTtfb(`${baseUrl}/`)
  const pass = ttfb_ms <= THRESHOLDS.ttfb
  return { ttfb_ms, threshold_ms: THRESHOLDS.ttfb, pass }
}

/**
 * Measure 3: GET /api/health round-trip latency.
 *
 * @param {string} baseUrl
 * @returns {Promise<{ duration_ms: number, threshold_ms: number, pass: boolean, status: number }>}
 */
async function measureApiHealth(baseUrl) {
  const { res, duration_ms } = await timedFetch(`${baseUrl}/api/health`, { timeoutMs: 10_000 })
  const pass = duration_ms <= THRESHOLDS.api
  return { duration_ms, threshold_ms: THRESHOLDS.api, pass, status: res.status }
}

/**
 * Measure 5: Authenticated GET to a protected endpoint (e.g. /api/users/me).
 * Skips gracefully (warning) if the token cannot be obtained.
 *
 * @param {string} baseUrl
 * @param {string} token
 * @returns {Promise<{ duration_ms: number, threshold_ms: number, pass: boolean, route: string, warnings: string[] }>}
 */
async function measureApiDashboard(baseUrl, token) {
  const candidates = ['/api/users/me', '/api/settings', '/api/health']
  const warnings = []

  for (const route of candidates) {
    const { res, duration_ms } = await timedFetch(`${baseUrl}${route}`, {
      headers: { Authorization: `Bearer ${token}` },
      timeoutMs: 10_000,
    }).catch(() => ({ res: null, duration_ms: 0 }))

    if (!res) continue
    if (res.status === 404) continue

    const pass = duration_ms <= THRESHOLDS.api
    return { duration_ms, threshold_ms: THRESHOLDS.api, pass, route, warnings }
  }

  warnings.push('No authenticated dashboard endpoint found for latency measurement')
  return { duration_ms: 0, threshold_ms: THRESHOLDS.api, pass: true, route: null, warnings }
}

/**
 * Measure 6: Concurrent load — 10 parallel requests to /api/health, report p50/p95/max.
 *
 * @param {string} baseUrl
 * @returns {Promise<{ p50_ms: number, p95_ms: number, max_ms: number, threshold_ms: number, pass: boolean, requests: number }>}
 */
async function measureConcurrentLoad(baseUrl) {
  const N = 10
  const timings = await Promise.all(
    Array.from({ length: N }, () =>
      timedFetch(`${baseUrl}/api/health`, { timeoutMs: 15_000 })
        .then(({ duration_ms }) => duration_ms)
        .catch(() => THRESHOLDS.p95 + 1) // count failures as over-threshold
    )
  )

  const sorted = [...timings].sort((a, b) => a - b)
  const p50_ms  = percentile(sorted, 50)
  const p95_ms  = percentile(sorted, 95)
  const max_ms  = sorted[sorted.length - 1]
  const pass    = p95_ms <= THRESHOLDS.p95

  return { p50_ms, p95_ms, max_ms, threshold_ms: THRESHOLDS.p95, pass, requests: N }
}

// ── Main entry point ───────────────────────────────────────────────────────

/**
 * Run all performance benchmark checks against a deployed product.
 *
 * @param {{ url: string, productSlug: string }} ctx
 * @returns {Promise<{ status: 'pass'|'fail'|'warning', details: object, errors: string[], warnings: string[] }>}
 */
async function run(ctx) {
  const { url } = ctx
  const errors = []
  const warnings = []
  const details = {}

  // Phase A: independent measurements (parallel)
  const [pageLoadSettled, ttfbSettled, apiHealthSettled, concurrentSettled] =
    await Promise.allSettled([
      measurePageLoad(url),
      measurePageTtfb(url),
      measureApiHealth(url),
      measureConcurrentLoad(url),
    ])

  for (const [name, settled] of [
    ['page-load', pageLoadSettled],
    ['ttfb', ttfbSettled],
    ['api-health-latency', apiHealthSettled],
    ['concurrent-load', concurrentSettled],
  ]) {
    if (settled.status === 'rejected') {
      errors.push(`[${name}] ${settled.reason.message}`)
      details[name] = { error: settled.reason.message }
    } else {
      const val = settled.value
      details[name] = val

      if (Array.isArray(val.warnings)) {
        for (const w of val.warnings) warnings.push(`[${name}] ${w}`)
      }

      if (val.pass === false) {
        const metric = val.duration_ms || val.p95_ms || val.ttfb_ms || 0
        warnings.push(
          `[${name}] Slow: ${metric}ms exceeds threshold of ${val.threshold_ms}ms`
        )
      }
    }
  }

  // Phase B: auth — needed for dashboard latency
  let token = null
  try {
    const authResult = await measureAuthLatency(url)
    token = authResult.token
    details['api-auth-latency'] = {
      duration_ms: authResult.duration_ms,
      threshold_ms: THRESHOLDS.api,
      pass: authResult.duration_ms <= THRESHOLDS.api,
    }
    if (!details['api-auth-latency'].pass) {
      warnings.push(
        `[api-auth-latency] Slow: ${authResult.duration_ms}ms exceeds threshold of ${THRESHOLDS.api}ms`
      )
    }
  } catch (err) {
    errors.push(`[api-auth-latency] ${err.message}`)
    details['api-auth-latency'] = { error: err.message }
  }

  // Phase C: dashboard latency (needs token)
  if (token) {
    try {
      const dashResult = await measureApiDashboard(url, token)
      details['api-dashboard-latency'] = dashResult

      for (const w of dashResult.warnings ?? []) {
        warnings.push(`[api-dashboard-latency] ${w}`)
      }
      if (dashResult.pass === false) {
        warnings.push(
          `[api-dashboard-latency] Slow: ${dashResult.duration_ms}ms exceeds threshold of ${THRESHOLDS.api}ms`
        )
      }
    } catch (err) {
      errors.push(`[api-dashboard-latency] ${err.message}`)
      details['api-dashboard-latency'] = { error: err.message }
    }
  } else {
    warnings.push('[performance] Skipped dashboard latency — could not obtain auth token')
  }

  // Summarize thresholds
  details.thresholds = {
    page_load_ms: THRESHOLDS.pageLoad,
    api_ms:       THRESHOLDS.api,
    ttfb_ms:      THRESHOLDS.ttfb,
    p95_ms:       THRESHOLDS.p95,
  }

  const status = errors.length > 0 ? 'fail' : warnings.length > 0 ? 'warning' : 'pass'
  return { status, details, errors, warnings }
}

module.exports = { run }
