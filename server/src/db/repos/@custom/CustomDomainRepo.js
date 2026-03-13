'use strict'

const db = require('../../../lib/@system/PostgreSQL')
const crypto = require('crypto')

const CustomDomainRepo = {
  /**
   * Generate a verification token
   */
  generateToken() {
    return crypto.randomBytes(32).toString('hex')
  },

  /**
   * Find domain by its domain name (for redirect resolution)
   */
  async findByDomain(domain) {
    return db.oneOrNone(
      `SELECT * FROM custom_domains 
       WHERE domain = $1 
       AND is_active = TRUE 
       AND verified_at IS NOT NULL
       AND deleted_at IS NULL`,
      [domain],
    )
  },

  /**
   * Find domain by ID
   */
  async findById(id) {
    return db.oneOrNone(
      `SELECT * FROM custom_domains WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    )
  },

  /**
   * Get all domains for a user
   */
  async findByUserId(userId) {
    return db.any(
      `SELECT id, domain, verification_token, verification_method, verified_at,
              ssl_status, ssl_provisioned_at, is_active, is_primary, created_at, updated_at
       FROM custom_domains
       WHERE user_id = $1 AND deleted_at IS NULL
       ORDER BY is_primary DESC, created_at DESC`,
      [userId],
    )
  },

  /**
   * Check if a domain already exists
   */
  async domainExists(domain) {
    const result = await db.oneOrNone(
      `SELECT id FROM custom_domains WHERE domain = $1 AND deleted_at IS NULL`,
      [domain],
    )
    return !!result
  },

  /**
   * Add a new custom domain
   */
  async create({ domain, userId, verificationMethod = 'cname' }) {
    const token = this.generateToken()
    return db.one(
      `INSERT INTO custom_domains (domain, user_id, verification_token, verification_method)
       VALUES ($1, $2, $3, $4)
       RETURNING id, domain, verification_token, verification_method, ssl_status,
                 is_active, is_primary, created_at`,
      [domain, userId, token, verificationMethod],
    )
  },

  /**
   * Mark domain as verified
   */
  async markVerified(id) {
    return db.oneOrNone(
      `UPDATE custom_domains 
       SET verified_at = NOW(), is_active = TRUE
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING *`,
      [id],
    )
  },

  /**
   * Update SSL status
   */
  async updateSslStatus(id, status) {
    const sslProvisionedAt = status === 'active' ? 'NOW()' : 'NULL'
    return db.oneOrNone(
      `UPDATE custom_domains 
       SET ssl_status = $2, ssl_provisioned_at = ${sslProvisionedAt}
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING *`,
      [id, status],
    )
  },

  /**
   * Set domain as primary (unset others first)
   */
  async setPrimary(id, userId) {
    return db.tx(async (t) => {
      // Unset all primary flags for this user
      await t.none(
        `UPDATE custom_domains SET is_primary = FALSE 
         WHERE user_id = $1 AND deleted_at IS NULL`,
        [userId],
      )
      // Set the selected domain as primary
      return t.oneOrNone(
        `UPDATE custom_domains SET is_primary = TRUE 
         WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
         RETURNING *`,
        [id, userId],
      )
    })
  },

  /**
   * Soft delete domain
   */
  async delete(id, userId) {
    return db.oneOrNone(
      `UPDATE custom_domains 
       SET deleted_at = NOW(), is_active = FALSE, is_primary = FALSE
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [id, userId],
    )
  },

  /**
   * Regenerate verification token
   */
  async regenerateToken(id, userId) {
    const token = this.generateToken()
    return db.oneOrNone(
      `UPDATE custom_domains 
       SET verification_token = $3, verified_at = NULL, is_active = FALSE
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
       RETURNING id, domain, verification_token, verification_method`,
      [id, userId, token],
    )
  },
}

module.exports = CustomDomainRepo
