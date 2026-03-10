// @system — SessionRepo
// CRUD operations for the sessions table.
// token_hash is SHA-256(raw refresh_token) — raw tokens are never stored.
const db = require('../../../lib/@system/PostgreSQL')

const SessionRepo = {
  /** Persist a new session row after successful login. */
  async create({ userId, tokenHash, ipAddress, userAgent, expiresAt }) {
    return db.one(
      `INSERT INTO sessions (user_id, token_hash, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, tokenHash, ipAddress ?? null, userAgent ?? null, expiresAt],
    )
  },

  /** List all active (non-expired, non-revoked) sessions for a user, including token_hash. */
  async findActiveByUserId(userId) {
    return db.any(
      `SELECT id, token_hash, ip_address, user_agent, created_at, expires_at
       FROM sessions
       WHERE user_id = $1
         AND revoked_at IS NULL
         AND expires_at > now()
       ORDER BY created_at DESC`,
      [userId],
    )
  },

  /** Look up a session by its token hash. */
  async findByTokenHash(tokenHash) {
    return db.oneOrNone(
      `SELECT * FROM sessions WHERE token_hash = $1`,
      [tokenHash],
    )
  },

  /**
   * Update token_hash after refresh token rotation.
   * Ensures the session row tracks the current refresh token.
   */
  async updateTokenHash(userId, oldHash, newHash, newExpiresAt) {
    return db.oneOrNone(
      `UPDATE sessions
       SET token_hash = $3, expires_at = $4
       WHERE user_id = $1 AND token_hash = $2 AND revoked_at IS NULL
       RETURNING id`,
      [userId, oldHash, newHash, newExpiresAt],
    )
  },

  /**
   * Revoke a specific session by ID.
   * Scoped to userId so users can only revoke their own sessions.
   * Returns the revoked row (including token_hash) so callers can also
   * revoke the linked refresh token.
   */
  async revoke(id, userId) {
    return db.oneOrNone(
      `UPDATE sessions SET revoked_at = now()
       WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL
       RETURNING id, token_hash`,
      [id, userId],
    )
  },

  /** Revoke all active sessions for a user (e.g. on password change). */
  async revokeAllByUserId(userId) {
    return db.none(
      `UPDATE sessions SET revoked_at = now()
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId],
    )
  },

  /** Revoke the session associated with a specific token hash. */
  async revokeByTokenHash(tokenHash) {
    return db.none(
      `UPDATE sessions SET revoked_at = now()
       WHERE token_hash = $1 AND revoked_at IS NULL`,
      [tokenHash],
    )
  },
}

module.exports = SessionRepo
