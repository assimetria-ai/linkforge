/**
 * @system — Auth convenience routes
 *
 * These routes provide a /api/auth/login and /api/auth/register alias
 * for the canonical /api/sessions and /api/users endpoints.
 *
 * POST /api/auth/login    → forwards to POST /api/sessions (login)
 * POST /api/auth/register → forwards to POST /api/users (register)
 */

const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const { loginLimiter } = require('../../../lib/@system/RateLimit')
const { validate } = require('../../../lib/@system/Validation')
const { LoginBody } = require('../../../lib/@system/Validation/schemas/@system/sessions')
const UserRepo = require('../../../db/repos/@system/UserRepo')
const RefreshTokenRepo = require('../../../db/repos/@system/RefreshTokenRepo')
const SessionRepo = require('../../../db/repos/@system/SessionRepo')
const { signAccessTokenAsync } = require('../../../lib/@system/Helpers/jwt')
const {
  MAX_ATTEMPTS,
  getLockoutSecondsRemaining,
  incrementFailedAttempts,
  getFailedAttemptCount,
  clearFailedAttempts,
} = require('../../../lib/@system/AccountLockout')

const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000           // 15 minutes
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

/** SHA-256 hash a raw token string. */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function setAccessCookie(res, token) {
  res.cookie('access_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: ACCESS_TOKEN_TTL_MS,
    path: '/',
  })
}

function setRefreshCookie(res, token) {
  res.cookie('refresh_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: REFRESH_TOKEN_TTL_MS,
    path: '/api/sessions',
  })
}

// POST /api/auth/login — login (alias for POST /api/sessions)
router.post('/auth/login', loginLimiter, validate({ body: LoginBody }), async (req, res, next) => {
  try {
    const { email, password } = req.body
    const normalizedEmail = email.toLowerCase()

    // Check account lockout
    const lockedFor = await getLockoutSecondsRemaining(normalizedEmail)
    if (lockedFor > 0) {
      const minutes = Math.ceil(lockedFor / 60)
      return res.status(429).json({
        message: `Account temporarily locked due to too many failed login attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
        lockedFor,
      })
    }

    const user = await UserRepo.findByEmail(normalizedEmail)
    if (!user) {
      await incrementFailedAttempts(normalizedEmail)
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      await incrementFailedAttempts(normalizedEmail)
      const count = await getFailedAttemptCount(normalizedEmail)
      const remaining = count !== null ? MAX_ATTEMPTS - count : null
      const extra =
        remaining !== null && remaining > 0 && remaining <= 2
          ? ` ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before account lockout.`
          : ''
      return res.status(401).json({ message: `Invalid credentials.${extra}` })
    }

    // Successful login — clear lockout state
    await clearFailedAttempts(normalizedEmail)

    // 2FA / TOTP check
    if (user.totp_enabled) {
      const { totpCode } = req.body
      if (!totpCode) {
        return res.status(200).json({ totp_required: true })
      }
      const OTPAuth = require('otpauth')
      const totp = new OTPAuth.TOTP({
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(user.totp_secret),
      })
      const delta = totp.validate({ token: String(totpCode).replace(/\s/g, ''), window: 1 })
      if (delta === null) {
        return res.status(401).json({ message: 'Invalid or expired authenticator code.' })
      }
    }

    // Issue tokens
    const accessToken = await signAccessTokenAsync({ userId: user.id })
    const { token: refreshToken, record: refreshRecord } = await RefreshTokenRepo.create({ userId: user.id })

    // Persist session record
    await SessionRepo.create({
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      ipAddress: req.ip ?? req.headers['x-forwarded-for'] ?? null,
      userAgent: req.headers['user-agent'] ?? null,
      expiresAt: refreshRecord.expires_at,
    }).catch(() => {})

    setAccessCookie(res, accessToken)
    setRefreshCookie(res, refreshToken)

    res.json({ user: { id: user.id, email: user.email, name: user.name } })
  } catch (err) {
    next(err)
  }
})

// POST /api/auth/register — register (alias for POST /api/users)
router.post('/auth/register', async (req, res, next) => {
  // Forward to the user creation endpoint by re-routing the request.
  // Routes are mounted at /api, so re-entry must include the /api prefix.
  req.url = '/api/users'
  req.app.handle(req, res, next)
})

module.exports = router
