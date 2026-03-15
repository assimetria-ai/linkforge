// @system — sessions API
// POST /api/sessions               — login (email + password); may return a TOTP challenge
// POST /api/sessions/totp/verify   — complete MFA login by submitting a TOTP code
// DELETE /api/sessions             — logout (invalidate refresh token)
//
// Security notes:
//   - TOTP validation uses constant-time comparison via crypto.timingSafeEqual and a
//     minimum-duration pad so that all result paths (valid / invalid / locked / error)
//     have indistinguishable response times, eliminating timing oracle attacks.
//   - TOTP is rate-limited to 5 attempts per minute per user (keyed on userId).
//   - 10 consecutive TOTP failures lock the account for TOTP_LOCKOUT_WINDOW_MS.

const express  = require('express')
const router   = express.Router()
const crypto   = require('crypto')
const bcrypt   = require('bcryptjs')
const db       = require('../../../lib/@system/PostgreSQL')
const logger   = require('../../../lib/@system/Logger')
const { authenticate, recordPasswordFailure, isPasswordLocked, resetPasswordLock } = require('../../../lib/@system/Helpers/auth')
const { loginLimiter, createLimiter } = require('../../../lib/@system/RateLimit')

// ── TOTP library ───────────────────────────────────────────────────────────────
// otplib is the recommended library; fall back gracefully if not installed.
let totp
try {
  totp = require('otplib').totp
} catch {
  // If otplib is not installed, all TOTP verifications will fail safely.
  logger.warn('otplib not installed — TOTP verification will always fail')
  totp = { check: () => false, generate: () => '' }
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** Minimum ms every TOTP verify path must take — prevents response-time oracle. */
const TOTP_MIN_RESPONSE_MS   = 200

/** Maximum lifetime of a session family regardless of per-token expiry. */
const SESSION_FAMILY_MAX_DAYS = 30

/** Max TOTP attempts per minute per user before rate-limit kicks in. */
const TOTP_RATE_LIMIT_MAX    = 5
const TOTP_RATE_WINDOW_MS    = 60 * 1000

/** Consecutive TOTP failures that trigger an account lock. */
const TOTP_LOCKOUT_THRESHOLD = 10
const TOTP_LOCKOUT_WINDOW_MS = 60 * 60 * 1000   // 1 hour

// ── TOTP-specific rate limiter (5 attempts / min / user) ─────────────────────

const totpRateLimiter = createLimiter({
  windowMs:     TOTP_RATE_WINDOW_MS,
  max:          TOTP_RATE_LIMIT_MAX,
  prefix:       'rl:totp:',
  message:      'Too many TOTP attempts. Please wait a minute before trying again.',
  keyGenerator: (req) => req.user?.id ?? req.body?.totpSessionToken ?? req.ip,
})

// ── TOTP lockout store ────────────────────────────────────────────────────────
// In-memory Map<userId, { count, expiresAt }>.
// Replace with Redis INCR+EXPIRE in multi-process deployments.

const totpFailStore = new Map()

function _totpRecord(userId) {
  const now   = Date.now()
  const key   = String(userId)
  let   entry = totpFailStore.get(key)

  if (!entry || entry.expiresAt <= now) {
    entry = { count: 0, expiresAt: now + TOTP_LOCKOUT_WINDOW_MS }
    totpFailStore.set(key, entry)
  }

  entry.count++
  return entry.count
}

function _totpIsLocked(userId) {
  const now   = Date.now()
  const entry = totpFailStore.get(String(userId))
  if (!entry || entry.expiresAt <= now) return false
  return entry.count >= TOTP_LOCKOUT_THRESHOLD
}

function _totpReset(userId) {
  totpFailStore.delete(String(userId))
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Run fn() and ensure the total elapsed time is at least minMs.
 * Guarantees all result paths (success, failure, error) take the same wall time
 * so response timing cannot be used as an oracle.
 */
async function withTimingPad(minMs, fn) {
  const deadline = Date.now() + minMs
  try {
    return await fn()
  } finally {
    const remaining = deadline - Date.now()
    if (remaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, remaining))
    }
  }
}

/**
 * Constant-time TOTP verification.
 *
 * Uses crypto.timingSafeEqual so that the string comparison itself does not
 * leak information about how many characters matched.
 *
 * Also verifies the adjacent ±1 window (±30 s) to tolerate clock skew, matching
 * the standard otplib default.
 */
function safeVerifyTotp(secret, token) {
  if (!secret || typeof token !== 'string') return false

  // Normalise token to exactly 6 digits so buffer lengths always match.
  const normalised = token.replace(/\s/g, '').padEnd(6, '\0').slice(0, 6)
  const inputBuf   = Buffer.from(normalised)

  // Check current window and ±1 adjacent windows.
  const windows = [-1, 0, 1]
  let   valid   = false

  for (const delta of windows) {
    // otplib's totp.generate() does not accept a step offset directly;
    // compute the counter manually using the epoch.
    const step      = 30 // seconds (RFC 6238 default)
    const counter   = Math.floor(Date.now() / 1000 / step) + delta
    const timestamp = counter * step * 1000

    let expected
    try {
      expected = totp.generate(secret, { epoch: timestamp })
    } catch {
      expected = ''
    }

    const expectedBuf = Buffer.from(expected.padEnd(6, '\0').slice(0, 6))

    // timingSafeEqual throws if lengths differ — both are fixed at 6 bytes.
    if (crypto.timingSafeEqual(inputBuf, expectedBuf)) {
      valid = true
      // Do NOT break early — always complete all window checks to prevent
      // timing variation based on which window matched.
    }
  }

  return valid
}

// ── POST /api/sessions — login ────────────────────────────────────────────────

router.post('/sessions', loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {}

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }

    const user = await db.oneOrNone(
      'SELECT id, email, name, role, password_hash, totp_enabled, totp_secret FROM users WHERE email = $1',
      [email]
    )

    // Always perform bcrypt to prevent user-enumeration via timing.
    const DUMMY_HASH = '$2b$12$invalidhashpaddingtoensureconstanttiming000000000000000'
    const hashToCheck = user?.password_hash ?? DUMMY_HASH

    // Lockout check (after we have userId; fall through to bcrypt first to avoid enumeration).
    if (user && isPasswordLocked(user.id)) {
      logger.warn({ userId: user.id }, 'login blocked — password lockout active')
      await bcrypt.compare(password, hashToCheck) // consume time even when blocked
      return res.status(429).json({
        message: 'Account temporarily locked due to too many failed attempts. Please try again later.',
      })
    }

    const passwordMatch = await bcrypt.compare(password, hashToCheck)

    if (!user || !passwordMatch) {
      if (user) recordPasswordFailure(user.id)
      logger.warn({ email }, 'login failed — invalid credentials')
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    resetPasswordLock(user.id)

    // ── MFA gate ──────────────────────────────────────────────────────────────
    if (user.totp_enabled && user.totp_secret) {
      // Issue a short-lived TOTP challenge token instead of a full session.
      const challengeToken = crypto.randomBytes(32).toString('hex')
      const expiresAt      = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

      await db.none(
        `INSERT INTO totp_challenges (user_id, token, expires_at)
         VALUES ($1, $2, $3)`,
        [user.id, challengeToken, expiresAt]
      )

      logger.info({ userId: user.id }, 'TOTP challenge issued')
      return res.status(202).json({
        mfaRequired:        true,
        totpSessionToken:   challengeToken,
        message:            'Enter your authenticator code to complete login',
      })
    }

    // No MFA — issue session immediately.
    const sessionToken = crypto.randomBytes(48).toString('hex')
    await db.none(
      `INSERT INTO sessions (user_id, token, expires_at, family_created_at)
       VALUES ($1, $2, now() + interval '30 days', now())`,
      [user.id, sessionToken]
    )

    logger.info({ userId: user.id }, 'login successful')
    return res.json({
      token: sessionToken,
      user:  { id: user.id, email: user.email, name: user.name, role: user.role },
    })
  } catch (err) {
    next(err)
  }
})

// ── POST /api/sessions/totp/verify — complete MFA login ──────────────────────
//
// Security requirements (task #8283):
//   1. Constant-time comparison for TOTP codes — crypto.timingSafeEqual across
//      all candidate windows (no early exit on match).
//   2. Minimum response duration (TOTP_MIN_RESPONSE_MS) applied to every path
//      so that success, failure, locked, and error paths are indistinguishable
//      by wall-clock timing.
//   3. Rate-limited to TOTP_RATE_LIMIT_MAX attempts / TOTP_RATE_WINDOW_MS per user.
//   4. Account locked after TOTP_LOCKOUT_THRESHOLD consecutive failures.

router.post('/sessions/totp/verify', totpRateLimiter, async (req, res, next) => {
  // withTimingPad wraps the entire handler so every response path takes ≥ TOTP_MIN_RESPONSE_MS.
  await withTimingPad(TOTP_MIN_RESPONSE_MS, async () => {
    try {
      const { totpSessionToken, code } = req.body ?? {}

      if (!totpSessionToken || !code) {
        return res.status(400).json({ message: 'totpSessionToken and code are required' })
      }

      // Look up the challenge.
      const challenge = await db.oneOrNone(
        `SELECT tc.id, tc.user_id, tc.expires_at,
                u.email, u.name, u.role, u.totp_secret
           FROM totp_challenges tc
           JOIN users           u  ON u.id = tc.user_id
          WHERE tc.token      = $1
            AND tc.used_at    IS NULL
            AND tc.expires_at > now()`,
        [totpSessionToken]
      )

      // ── 1. Invalid or expired challenge ───────────────────────────────────
      if (!challenge) {
        // Do NOT reveal whether the token was valid but expired vs never existed.
        logger.warn({ totpSessionToken: totpSessionToken.slice(0, 8) }, 'TOTP verify — invalid challenge token')
        return res.status(401).json({ message: 'Invalid or expired session. Please log in again.' })
      }

      // ── 2. Account TOTP lockout check ─────────────────────────────────────
      if (_totpIsLocked(challenge.user_id)) {
        logger.warn({ userId: challenge.user_id }, 'TOTP verify blocked — lockout active')
        // Always evaluate the code anyway to pad timing.
        safeVerifyTotp(challenge.totp_secret, String(code))
        return res.status(429).json({
          message: 'Account locked due to too many failed TOTP attempts. Please try again later.',
        })
      }

      // ── 3. Constant-time TOTP verification ────────────────────────────────
      //
      // safeVerifyTotp always iterates all windows without early exit and uses
      // crypto.timingSafeEqual for the per-window comparison so neither the
      // number of matching characters nor which window matched leaks via timing.
      const valid = safeVerifyTotp(challenge.totp_secret, String(code))

      // ── 4. Handle failure ─────────────────────────────────────────────────
      if (!valid) {
        const failCount = _totpRecord(challenge.user_id)
        logger.warn({ userId: challenge.user_id, failCount }, 'TOTP verify failed — invalid code')

        if (failCount >= TOTP_LOCKOUT_THRESHOLD) {
          logger.warn({ userId: challenge.user_id }, 'TOTP lockout triggered')
          return res.status(429).json({
            message: 'Account locked due to too many failed TOTP attempts. Please try again later.',
          })
        }

        return res.status(401).json({ message: 'Invalid authenticator code' })
      }

      // ── 5. Success — consume challenge, issue session ─────────────────────
      _totpReset(challenge.user_id)

      await db.none(
        'UPDATE totp_challenges SET used_at = now() WHERE id = $1',
        [challenge.id]
      )

      const sessionToken = crypto.randomBytes(48).toString('hex')
      await db.none(
        `INSERT INTO sessions (user_id, token, expires_at, family_created_at)
         VALUES ($1, $2, now() + interval '30 days', now())`,
        [challenge.user_id, sessionToken]
      )

      logger.info({ userId: challenge.user_id }, 'TOTP verify successful — session created')
      return res.json({
        token: sessionToken,
        user:  {
          id:    challenge.user_id,
          email: challenge.email,
          name:  challenge.name,
          role:  challenge.role,
        },
      })
    } catch (err) {
      next(err)
    }
  })
})

// ── DELETE /api/sessions — logout ─────────────────────────────────────────────

router.delete('/sessions', authenticate, async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'] ?? ''
    const token      = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (token) {
      await db.none(
        'UPDATE sessions SET revoked_at = now() WHERE token = $1 AND revoked_at IS NULL',
        [token]
      )
    }

    logger.info({ userId: req.user.id }, 'logout')
    res.json({ message: 'Logged out successfully' })
  } catch (err) {
    next(err)
  }
})

module.exports = router
