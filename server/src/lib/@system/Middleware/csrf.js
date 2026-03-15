// CSRF protection — X-CSRF-Token header synchronizer pattern
//
// Flow:
//   1. csrfCookieMiddleware runs on every request.
//      - If no nonce cookie exists, generate one and set it (httpOnly: false
//        so that the browser JS can read it and attach it as a header).
//      - Attaches req.csrfToken() helper that returns the HMAC-signed token
//        the client should send in the X-CSRF-Token header.
//
//   2. csrfProtectMiddleware runs on every state-changing request
//      (POST / PUT / PATCH / DELETE).
//      - Reads the nonce from the cookie.
//      - Reads the candidate token from the X-CSRF-Token request header.
//      - Re-derives HMAC(nonce) and compares with the header value using
//        crypto.timingSafeEqual to prevent timing-oracle attacks.
//      - Rejects with 403 if the values are absent or do not match.
//
// Why this is safe:
//   - An attacker on a different origin cannot read SameSite cookies, so they
//     cannot obtain the nonce required to produce a valid header token.
//   - SameSite alone is insufficient (not enforced on older browsers, cross-site
//     navigation, etc.), so the header check is the primary gate.
//   - HMAC prevents a client from forging arbitrary tokens without the secret.

const crypto = require('crypto')

// Secret used for HMAC signing.  CSRF_SECRET must be set in production (≥ 32
// random bytes in hex).  In development a per-process secret is generated as a
// convenience fallback — but in production a missing secret is a fatal error
// because each restart / replica would generate a different value, breaking
// token validation and leaving CSRF protection ineffective.
const CSRF_SECRET = (() => {
  if (process.env.CSRF_SECRET) return process.env.CSRF_SECRET
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[csrf] CSRF_SECRET environment variable is required in production. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    )
  }
  return crypto.randomBytes(32).toString('hex')
})()

const NONCE_COOKIE  = 'csrf-nonce'
const CSRF_HEADER   = 'x-csrf-token'
const STATE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

/**
 * Derive a signed CSRF token from a nonce.
 * @param {string} nonce
 * @returns {string} hex HMAC-SHA256 digest
 */
function signNonce(nonce) {
  return crypto.createHmac('sha256', CSRF_SECRET).update(nonce).digest('hex')
}

/**
 * Middleware — ensures every response carries a nonce cookie and exposes
 * req.csrfToken() so route handlers / the /api/csrf-token endpoint can
 * return the signed token to the client.
 *
 * Must run AFTER cookieParser().
 */
function csrfCookieMiddleware(req, res, next) {
  let nonce = req.cookies[NONCE_COOKIE]

  if (!nonce) {
    nonce = crypto.randomBytes(32).toString('hex')
    res.cookie(NONCE_COOKIE, nonce, {
      httpOnly: false,                                           // JS must be able to read it
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    })
  }

  req.csrfToken = () => signNonce(nonce)
  next()
}

/**
 * Middleware — validates the X-CSRF-Token header on state-changing requests.
 *
 * Must run AFTER csrfCookieMiddleware().
 * Exempt routes (e.g. Stripe webhooks) must be mounted BEFORE this middleware.
 */
function csrfProtectMiddleware(req, res, next) {
  if (!STATE_METHODS.has(req.method)) return next()

  const nonce       = req.cookies[NONCE_COOKIE]
  const headerToken = req.headers[CSRF_HEADER]

  if (!nonce || !headerToken) {
    return res.status(403).json({
      error:   'CSRF token missing',
      message: 'Please include a valid X-CSRF-Token header. Fetch a token from GET /api/csrf-token.',
    })
  }

  const expected = Buffer.from(signNonce(nonce))
  const provided  = Buffer.from(headerToken)

  // Reject immediately if lengths differ (timingSafeEqual requires equal lengths).
  if (expected.length !== provided.length) {
    return res.status(403).json({
      error:   'Invalid CSRF token',
      message: 'Form submission rejected. Please refresh and try again.',
    })
  }

  if (!crypto.timingSafeEqual(expected, provided)) {
    return res.status(403).json({
      error:   'Invalid CSRF token',
      message: 'Form submission rejected. Please refresh and try again.',
    })
  }

  next()
}

module.exports = { csrfCookieMiddleware, csrfProtectMiddleware }
