// @system — authentication middleware
// Exports: authenticate(req, res, next)
//
// Supports two auth methods:
//   1. JWT      — Authorization: Bearer <token>  (RS256, signed with JWT_PRIVATE_KEY)
//   2. API key  — X-API-Key: <raw_key>           (looked up by SHA-256 hash)
//
// Account lockout — both auth methods are protected:
//   Password login:  10 failures / 1 hour  → 429  (keyed on userId)
//   API key:         10 failures / 1 hour  → 429  (keyed on key SHA-256 hash)
//
// The lockout store is in-process (Map).  When Redis is available in a
// multi-process deployment, replace _record/_isBlocked/_reset with a Redis
// INCR+EXPIRE implementation similar to RateLimit/index.js.

const crypto = require('crypto')
const db     = require('../PostgreSQL')
const logger = require('../Logger')
const { verifyToken } = require('./jwt')

// ── Lockout constants ─────────────────────────────────────────────────────────

const LOCKOUT_WINDOW_MS  = 60 * 60 * 1000   // 1 hour
const LOCKOUT_THRESHOLD  = 10               // failures before block

// ── In-memory failure store ───────────────────────────────────────────────────
// Map<string, { count: number, expiresAt: number }>

const failStore = new Map()

function _storeKey(type, id) {
  return `${type}:${id}`
}

/** Returns new failure count for this key. */
function _record(key) {
  const now   = Date.now()
  let   entry = failStore.get(key)

  if (!entry || entry.expiresAt <= now) {
    entry = { count: 0, expiresAt: now + LOCKOUT_WINDOW_MS }
    failStore.set(key, entry)
  }

  entry.count++
  return entry.count
}

/** Returns true when the key has exceeded the failure threshold. */
function _isBlocked(key) {
  const now   = Date.now()
  const entry = failStore.get(key)
  if (!entry || entry.expiresAt <= now) return false
  return entry.count >= LOCKOUT_THRESHOLD
}

/** Clears the failure counter on successful auth. */
function _reset(key) {
  failStore.delete(key)
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** Maximum age of a session family, matching the value in sessions/index.js. */
const SESSION_FAMILY_MAX_MS = 30 * 24 * 60 * 60 * 1000

// ── authenticate middleware ───────────────────────────────────────────────────

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers['authorization']
    const apiKeyRaw  = req.headers['x-api-key']

    // ── 1. API key auth ───────────────────────────────────────────────────────

    if (apiKeyRaw) {
      const keyHash = crypto.createHash('sha256').update(apiKeyRaw).digest('hex')
      const lockKey = _storeKey('ak', keyHash)

      // Block if this key hash has exceeded the failure threshold
      if (_isBlocked(lockKey)) {
        logger.warn({ keyHash: keyHash.slice(0, 8) }, 'API key auth blocked — lockout active')
        return res.status(429).json({
          message: 'Too many failed API key attempts. Please try again later.',
        })
      }

      const row = await db.oneOrNone(
        `SELECT ak.user_id, u.id, u.email, u.name, u.role, u.email_verified
           FROM api_keys ak
           JOIN users    u  ON u.id = ak.user_id
          WHERE ak.key_hash   = $1
            AND ak.revoked_at IS NULL`,
        [keyHash]
      )

      if (!row) {
        const count = _record(lockKey)
        logger.warn(
          { keyHash: keyHash.slice(0, 8), failCount: count },
          'API key auth failed — key not found or revoked'
        )
        return res.status(401).json({ message: 'Invalid API key' })
      }

      // Success — clear failure counter so a legitimate key recovers immediately
      _reset(lockKey)

      req.user = {
        id:            row.id,
        email:         row.email,
        name:          row.name,
        role:          row.role,
        emailVerified: row.email_verified,
      }
      req.authMethod = 'api_key'
      return next()
    }

    // ── 2. Session-token auth (opaque token stored in sessions table) ─────────
    //
    // Session tokens are 96-character hex strings issued by the login/TOTP routes.
    // They are validated against the sessions table rather than verified as JWTs.
    // The family_created_at column records when the token family was born; we
    // reject any session whose family has exceeded SESSION_FAMILY_MAX_MS regardless
    // of the per-row expires_at value, preventing stale tokens from surviving
    // DB manipulation of the expires_at field.

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7)

      // Session tokens are 96-hex chars; JWTs contain dots.  Try the sessions
      // table first; fall through to JWT verification if nothing is found.
      if (/^[0-9a-f]{96}$/.test(token)) {
        const session = await db.oneOrNone(
          `SELECT s.id, s.family_created_at,
                  u.id AS user_id, u.email, u.name, u.role, u.email_verified
             FROM sessions s
             JOIN users    u ON u.id = s.user_id
            WHERE s.token       = $1
              AND s.revoked_at  IS NULL
              AND s.expires_at  > now()`,
          [token]
        )

        if (!session) {
          return res.status(401).json({ message: 'Invalid or expired session token' })
        }

        // ── Family age check ─────────────────────────────────────────────────
        // Enforce a hard 30-day cap on the family lifetime.  Even if expires_at
        // is manipulated in the DB the family_created_at bound cannot be bypassed.
        const familyAgeMs = Date.now() - new Date(session.family_created_at).getTime()
        if (!session.family_created_at || familyAgeMs > SESSION_FAMILY_MAX_MS) {
          logger.warn(
            {
              userId:           session.user_id,
              familyCreatedAt:  session.family_created_at,
              familyAgeMs,
            },
            'session auth rejected — token family age exceeds maximum lifetime'
          )
          // Revoke the session so it cannot be presented again.
          await db.none(
            'UPDATE sessions SET revoked_at = now() WHERE id = $1',
            [session.id]
          )
          return res.status(401).json({ message: 'Session expired. Please log in again.' })
        }

        req.user = {
          id:            session.user_id,
          email:         session.email,
          name:          session.name,
          role:          session.role,
          emailVerified: session.email_verified,
        }
        req.authMethod = 'session'
        return next()
      }

      // ── 3. JWT auth ─────────────────────────────────────────────────────────

      let payload
      try {
        payload = verifyToken(token)
      } catch {
        return res.status(401).json({ message: 'Invalid or expired token' })
      }

      // Account lockout — keyed on userId for password/session-based auth
      const lockKey = _storeKey('pw', payload.sub)

      if (_isBlocked(lockKey)) {
        logger.warn({ userId: payload.sub }, 'JWT auth blocked — lockout active')
        return res.status(429).json({
          message: 'Account temporarily locked due to too many failed attempts. Please try again later.',
        })
      }

      const user = await db.oneOrNone(
        'SELECT id, email, name, role, email_verified FROM users WHERE id = $1',
        [payload.sub]
      )

      if (!user) {
        const count = _record(lockKey)
        logger.warn({ userId: payload.sub, failCount: count }, 'JWT auth failed — user not found')
        return res.status(401).json({ message: 'User not found' })
      }

      _reset(lockKey)

      req.user = {
        id:            user.id,
        email:         user.email,
        name:          user.name,
        role:          user.role,
        emailVerified: user.email_verified,
      }
      req.authMethod = 'jwt'
      return next()
    }

    // ── 4. No credentials supplied ────────────────────────────────────────────

    return res.status(401).json({ message: 'Authentication required' })
  } catch (err) {
    next(err)
  }
}

// ── Lockout helpers (exported for use by login route) ────────────────────────

/**
 * Record a failed password login attempt for a userId.
 * Call this from the login route on bcrypt mismatch.
 */
function recordPasswordFailure(userId) {
  return _record(_storeKey('pw', String(userId)))
}

/**
 * Returns true if the userId is currently locked out of password auth.
 * Call this from the login route before attempting bcrypt.compare().
 */
function isPasswordLocked(userId) {
  return _isBlocked(_storeKey('pw', String(userId)))
}

/**
 * Clear the password failure counter on successful login.
 * Call this from the login route after a successful bcrypt.compare().
 */
function resetPasswordLock(userId) {
  _reset(_storeKey('pw', String(userId)))
}

// ── Role / ownership middleware ───────────────────────────────────────────────

/**
 * Require the authenticated user to have the 'admin' role.
 * Must be used after `authenticate`.
 *
 * Usage:
 *   router.delete('/items/:id', authenticate, requireAdmin, handler)
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' })
  }
  next()
}

/**
 * Require the authenticated user to own the resource (or be an admin).
 *
 * Pass a resolver that receives `req` and returns the owner's user id.
 * The resolver can be async — use it to look up the row if needed.
 *
 * Usage:
 *   // ownership already on req (e.g. after findById):
 *   router.patch('/items/:id', authenticate, requireOwnerOrAdmin(req => req.resource.user_id), handler)
 *
 *   // ownership from DB:
 *   router.patch('/items/:id', authenticate, requireOwnerOrAdmin(async req => {
 *     const row = await findById(db, 'items', req.params.id)
 *     req.resource = row          // cache for handler
 *     return row?.user_id
 *   }), handler)
 */
function requireOwnerOrAdmin(getOwnerId) {
  return async function ownerOrAdminMiddleware(req, res, next) {
    try {
      if (!req.user) return res.status(401).json({ message: 'Authentication required' })
      if (req.user.role === 'admin') return next()

      const ownerId = await getOwnerId(req)
      if (ownerId === undefined || ownerId === null) {
        return res.status(404).json({ message: 'Not found' })
      }

      if (String(ownerId) !== String(req.user.id)) {
        return res.status(403).json({ message: 'Forbidden' })
      }

      next()
    } catch (err) {
      next(err)
    }
  }
}

module.exports = {
  authenticate,
  requireAdmin,
  requireOwnerOrAdmin,
  recordPasswordFailure,
  isPasswordLocked,
  resetPasswordLock,
  LOCKOUT_THRESHOLD,
  LOCKOUT_WINDOW_MS,
}
