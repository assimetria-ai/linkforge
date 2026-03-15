const { doubleCsrf } = require('csrf-csrf')

/**
 * CSRF protection middleware using double-submit cookie pattern.
 *
 * This middleware protects against Cross-Site Request Forgery attacks by:
 * 1. Generating a CSRF token stored in an httpOnly cookie
 * 2. Requiring clients to send this token in a custom header (X-CSRF-Token)
 * 3. Validating that both values match before processing state-changing requests
 *
 * The middleware automatically handles GET, HEAD, and OPTIONS requests as safe
 * and only validates tokens for POST, PUT, PATCH, DELETE requests.
 *
 * Usage:
 *   - Add csrfProtection middleware to routes that need CSRF protection
 *   - Expose generateCsrfToken() via a GET endpoint so clients can fetch the token
 *   - Clients must include the token in the X-CSRF-Token header for protected requests
 */
const {
  generateCsrfToken: _generateCsrfToken, // Generate a new CSRF token
  doubleCsrfProtection                    // Middleware to validate CSRF tokens
} = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || 'default-csrf-secret-change-in-production',
  cookieName: '__Host-psifi.x-csrf-token',
  cookieOptions: {
    sameSite: 'strict',
    path: '/',
    secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
    httpOnly: true, // Prevent JavaScript access to the cookie
  },
  size: 64, // Token size in bytes
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'], // Safe methods that don't need CSRF protection
  getTokenFromRequest: (req) => req.headers['x-csrf-token'], // Custom header for the token
  getSessionIdentifier: (req) => {
    // Use session ID if available, otherwise fall back to a default empty string
    // This is safe because CSRF protection relies on the double-submit cookie pattern,
    // not on session identification
    return req.sessionID || req.session?.id || ''
  },
})

/**
 * CSRF protection middleware that validates tokens on state-changing requests
 */
const csrfProtection = (req, res, next) => {
  // Skip CSRF validation in test/development environments if needed
  if (process.env.NODE_ENV === 'test' || process.env.SKIP_CSRF === 'true') {
    return next()
  }

  // Exempt auth endpoints from CSRF — these are entry points where no session
  // (and therefore no CSRF token) exists yet. They are protected by rate limiting.
  const p = req.path // relative to /api mount point
  const EXEMPT = new Set([
    '/sessions',              // login
    '/sessions/refresh',      // token rotation
    '/users',                 // registration
    '/users/password/request',// forgot password
    '/users/password/reset',  // reset password
    '/users/email/verify',    // verify email
    '/users/email/verify/request', // resend verification
    '/auth/login',            // login alias
    '/auth/register',         // registration alias
  ])
  if (EXEMPT.has(p) || p.startsWith('/oauth/')) {
    return next()
  }

  doubleCsrfProtection(req, res, (err) => {
    if (err) {
      return res.status(403).json({ 
        message: 'Invalid or missing CSRF token',
        error: 'CSRF_VALIDATION_FAILED'
      })
    }
    next()
  })
}

/**
 * Middleware to generate and expose CSRF token to clients
 * Mount this on a GET endpoint (e.g., GET /api/csrf-token)
 */
const generateCsrfToken = (req, res) => {
  const token = _generateCsrfToken(req, res)
  res.json({ csrfToken: token })
}

/**
 * Export generateToken as an alias for compatibility
 */
const generateToken = _generateCsrfToken

module.exports = {
  csrfProtection,
  generateCsrfToken,
  generateToken,
}
