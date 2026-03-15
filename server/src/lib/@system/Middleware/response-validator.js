// @system/Middleware/response-validator — Development-only response format checker
//
// Intercepts res.json() calls and warns via the logger when responses deviate
// from the project's API response conventions:
//
//   1. Every JSON response body should have a top-level 'data' or 'error' key.
//   2. POST routes that create resources should return 201, not 200.
//   3. DELETE routes should return 204 with no body, not a JSON body.
//
// The middleware is a no-op in production (NODE_ENV === 'production').
//
// Mount in app.js before routes, ideally during development only:
//
//   const { responseValidator } = require('./lib/@system/Middleware/response-validator')
//   app.use(responseValidator)

'use strict'

const logger = require('../Logger')

const isDev = process.env.NODE_ENV !== 'production'

// Top-level keys that satisfy the convention check.
// 'meta' covers paginated list envelopes { data, meta }.
// 'summary' covers aggregate/stats responses.
const ALLOWED_TOP_LEVEL_KEYS = new Set(['data', 'error', 'meta', 'summary', 'message'])

/**
 * Development-only middleware that wraps res.json() to warn about
 * response format inconsistencies.  No-ops in production.
 */
function responseValidator(req, res, next) {
  if (!isDev) return next()

  const originalJson = res.json.bind(res)

  res.json = function validatedJson(body) {
    const method = req.method.toUpperCase()
    const url    = req.url
    const status = res.statusCode

    // ── 1. Top-level key convention ──────────────────────────────────────────
    if (
      body !== null &&
      body !== undefined &&
      typeof body === 'object' &&
      !Array.isArray(body)
    ) {
      const keys    = Object.keys(body)
      const hasGood = keys.some(k => ALLOWED_TOP_LEVEL_KEYS.has(k))

      if (!hasGood) {
        logger.warn(
          { method, url, status, keys },
          '[response-validator] response missing "data" or "error" top-level key'
        )
      }
    }

    // ── 2. POST routes should return 201 for resource creation ───────────────
    if (method === 'POST' && status === 200) {
      logger.warn(
        { method, url, status },
        '[response-validator] POST route returned 200; resource creation should return 201'
      )
    }

    // ── 3. DELETE routes should return 204 with no body ──────────────────────
    if (method === 'DELETE' && body !== null && body !== undefined) {
      logger.warn(
        { method, url, status },
        '[response-validator] DELETE route returned a JSON body; prefer res.status(204).end()'
      )
    }

    return originalJson(body)
  }

  next()
}

module.exports = { responseValidator }
