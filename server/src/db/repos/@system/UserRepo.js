// @system — UserRepo: database access layer for the users table

'use strict'

const db = require('../../../lib/@system/PostgreSQL')

const UserRepo = {
  /** Find a user by email. Returns the full row or null. */
  async findByEmail(email) {
    return db.oneOrNone(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    )
  },

  /**
   * Create a new user.
   * Returns { id, email, name }.
   */
  async create({ email, name, password_hash }) {
    return db.one(
      `INSERT INTO users (email, name, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, email, name`,
      [email.toLowerCase().trim(), name?.trim() || null, password_hash]
    )
  },

  /**
   * Update mutable profile fields for a user.
   * Returns public user fields.
   */
  async update(id, { name }) {
    return db.one(
      `UPDATE users
          SET name       = COALESCE($2, name),
              updated_at = now()
        WHERE id = $1
       RETURNING id, email, name, role, email_verified`,
      [id, name ?? null]
    )
  },

  /**
   * Mark a user's email as verified.
   * Returns public user fields.
   */
  async verifyEmail(userId) {
    return db.one(
      `UPDATE users
          SET email_verified = true,
              updated_at     = now()
        WHERE id = $1
       RETURNING id, email, name, role, email_verified`,
      [userId]
    )
  },

  /**
   * List all non-deleted users with optional full-text search and pagination.
   * Requires the deleted_at and is_active columns (added by admin schema init).
   */
  async findAll({ limit = 20, offset = 0, search = '' } = {}) {
    const hasSearch = search.trim().length > 0
    const values    = []
    let   idx       = 1
    let   where     = 'WHERE deleted_at IS NULL'

    if (hasSearch) {
      where += ` AND (email ILIKE $${idx} OR name ILIKE $${idx})`
      values.push(`%${search.trim()}%`)
      idx++
    }

    values.push(limit, offset)
    return db.any(
      `SELECT id, email, name, role, email_verified, is_active, created_at, updated_at
         FROM users
        ${where}
        ORDER BY created_at DESC
        LIMIT $${idx} OFFSET $${idx + 1}`,
      values,
    )
  },

  /**
   * Count non-deleted users with optional search (matches findAll filters).
   */
  async count({ search = '' } = {}) {
    const hasSearch = search.trim().length > 0
    const values    = []
    let   where     = 'WHERE deleted_at IS NULL'

    if (hasSearch) {
      where += ' AND (email ILIKE $1 OR name ILIKE $1)'
      values.push(`%${search.trim()}%`)
    }

    const row = await db.one(`SELECT COUNT(*) FROM users ${where}`, values)
    return parseInt(row.count, 10)
  },

  /**
   * Change a user's role.  Returns updated public fields or null if not found.
   */
  async updateRole(id, role) {
    return db.oneOrNone(
      `UPDATE users
          SET role       = $2,
              updated_at = now()
        WHERE id = $1 AND deleted_at IS NULL
       RETURNING id, email, name, role, email_verified, is_active`,
      [id, role],
    )
  },

  /**
   * Toggle a user's active status.  Returns updated public fields or null.
   */
  async setActive(id, isActive) {
    return db.oneOrNone(
      `UPDATE users
          SET is_active  = $2,
              updated_at = now()
        WHERE id = $1 AND deleted_at IS NULL
       RETURNING id, email, name, role, email_verified, is_active`,
      [id, isActive],
    )
  },

  /**
   * Soft-delete a user by stamping deleted_at.  Returns { id } or null.
   */
  async softDelete(id) {
    return db.oneOrNone(
      `UPDATE users
          SET deleted_at = now(),
              updated_at = now()
        WHERE id = $1 AND deleted_at IS NULL
       RETURNING id`,
      [id],
    )
  },
}

module.exports = UserRepo
