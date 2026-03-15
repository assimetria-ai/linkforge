// @system — auth API (aliases to sessions for backward compatibility)
// POST   /api/auth/register         — create account
// POST   /api/auth/login            — login
// GET    /api/auth/me               — current user
// POST   /api/auth/forgot-password  — request password reset
// POST   /api/auth/reset-password   — reset password with token
const express = require('express')
const router = express.Router()
const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const { authenticate, extractAccessToken } = require('../../../lib/@system/Helpers/auth')
const UserRepo = require('../../../db/repos/@system/UserRepo')
const RefreshTokenRepo = require('../../../db/repos/@system/RefreshTokenRepo')
const { signAccessTokenAsync } = require('../../../lib/@system/Helpers/jwt')
const { loginLimiter } = require('../../../lib/@system/RateLimit')
const { validate } = require('../../../lib/@system/Validation')
const { LoginBody } = require('../../../lib/@system/Validation/schemas/@system/sessions')
const {
  MAX_ATTEMPTS,
  getLockoutSecondsRemaining,
  incrementFailedAttempts,
  getFailedAttemptCount,
  clearFailedAttempts,
} = require('../../../lib/@system/AccountLockout')

const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000

function setAccessCookie(res, token) {
  res.cookie('access_token', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: true,
    maxAge: ACCESS_TOKEN_TTL_MS,
    path: '/',
  })
}

function setRefreshCookie(res, token) {
  res.cookie('refresh_token', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: true,
    maxAge: REFRESH_TOKEN_TTL_MS,
    path: '/api/sessions',
  })
}

// POST /api/auth/register
router.post('/auth/register', async (req, res, next) => {
  try {
    const { email, password, name } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }

    const normalizedEmail = email.toLowerCase()

    const existing = await UserRepo.findByEmail(normalizedEmail)
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists' })
    }

    const password_hash = await bcrypt.hash(password, 12)
    const user = await UserRepo.create({ email: normalizedEmail, name: name || null, password_hash })

    const accessToken = await signAccessTokenAsync({ userId: user.id })
    const { token: refreshToken } = await RefreshTokenRepo.create({ userId: user.id })

    setAccessCookie(res, accessToken)
    setRefreshCookie(res, refreshToken)

    res.status(201).json({ user: { id: user.id, email: user.email, name: user.name } })
  } catch (err) {
    next(err)
  }
})

// POST /api/auth/login
router.post('/auth/login', loginLimiter, validate({ body: LoginBody }), async (req, res, next) => {
  try {
    const { email, password } = req.body
    const normalizedEmail = email.toLowerCase()

    const lockedFor = await getLockoutSecondsRemaining(normalizedEmail)
    if (lockedFor > 0) {
      const minutes = Math.ceil(lockedFor / 60)
      return res.status(429).json({
        message: `Account temporarily locked. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
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

    await clearFailedAttempts(normalizedEmail)

    const accessToken = await signAccessTokenAsync({ userId: user.id })
    const { token: refreshToken } = await RefreshTokenRepo.create({ userId: user.id })

    setAccessCookie(res, accessToken)
    setRefreshCookie(res, refreshToken)

    res.json({ user: { id: user.id, email: user.email, name: user.name } })
  } catch (err) {
    next(err)
  }
})

// GET /api/auth/me
router.get('/auth/me', authenticate, (req, res) => {
  res.json({ user: req.user })
})

// POST /api/auth/forgot-password (stub — sends password reset email)
router.post('/auth/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ message: 'Email is required' })

    // Always return success to prevent email enumeration
    // In production, this would send a reset email if the user exists
    const normalizedEmail = email.toLowerCase()
    const user = await UserRepo.findByEmail(normalizedEmail)

    if (user) {
      // TODO: Generate reset token, store it, and send email via email service
      // For now, log that a reset was requested
      console.log(`[auth] Password reset requested for ${normalizedEmail}`)
    }

    res.json({ message: 'If an account with that email exists, a password reset link has been sent.' })
  } catch (err) {
    next(err)
  }
})

// POST /api/auth/reset-password (stub — resets password with token)
router.post('/auth/reset-password', async (req, res, next) => {
  try {
    const { token, password } = req.body
    if (!token || !password) {
      return res.status(400).json({ message: 'Token and new password are required' })
    }

    // TODO: Validate token from password_reset_tokens table, update user password
    // For now, return not implemented
    res.status(501).json({ message: 'Password reset not yet implemented' })
  } catch (err) {
    next(err)
  }
})

module.exports = router
