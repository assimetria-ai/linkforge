const { doubleCsrf } = require('csrf-csrf')
const logger = require('../Logger')

/**
 * CSRF protection middleware using the double-submit cookie pattern.
 * 
 * This protects against Cross-Site Request Forgery attacks by requiring clients to:
 * 1. First GET /api/csrf-token to receive a token (also set as httpOnly cookie)
 * 2. Include that token in the X-CSRF-Token header for state-changing requests
 * 
 * The middleware automatically validates tokens for POST, PUT, PATCH, DELETE requests.
 */

const {
  invalidCsrfTokenError,
  generateToken,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET ?? 'default-csrf-secret-CHANGE-IN-PRODUCTION',
  cookieName: '__Host-csrf-token',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getTokenFromRequest: (req) => req.headers['x-csrf-token'],
})

/**
 * CSRF protection middleware for routes.
 * Automatically validates CSRF tokens on POST/PUT/PATCH/DELETE requests.
 */
const csrfProtection = (req, res, next) => {
  // Skip CSRF protection in test environment
  if (process.env.NODE_ENV === 'test') {
    return next()
  }

  doubleCsrfProtection(req, res, (err) => {
    if (err) {
      logger.warn({
        ip: req.ip,
        path: req.path,
        method: req.method,
      }, 'CSRF token validation failed')
      
      return res.status(403).json({
        message: 'Invalid or missing CSRF token. Please refresh and try again.',
      })
    }
    next()
  })
}

/**
 * Generate and return a CSRF token.
 * Also sets the token as an httpOnly cookie.
 */
const generateCsrfToken = (req, res) => {
  try {
    const csrfToken = generateToken(req, res)
    res.json({ csrfToken })
  } catch (err) {
    logger.error({ err }, 'Failed to generate CSRF token')
    res.status(500).json({ message: 'Failed to generate CSRF token' })
  }
}

module.exports = {
  csrfProtection,
  generateToken: generateCsrfToken,
  invalidCsrfTokenError,
}
