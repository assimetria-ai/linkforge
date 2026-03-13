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
              ssl_status, ssl_provisioned_at, is_active, is_primary,
              team_id, health_status, last_health_check_at, consecutive_failures,
              branding, created_at, updated_at
       FROM custom_domains
       WHERE user_id = $1 AND deleted_at IS NULL
       ORDER BY is_primary DESC, created_at DESC`,
      [userId],
    )
  },

  /**
   * Get all domains for a workspace/team
   */
  async findByTeamId(teamId) {
    return db.any(
      `SELECT cd.id, cd.domain, cd.verification_token, cd.verification_method,
              cd.verified_at, cd.ssl_status, cd.ssl_provisioned_at, cd.is_active,
              cd.is_primary, cd.team_id, cd.user_id,
              cd.health_status, cd.last_health_check_at, cd.consecutive_failures,
              cd.branding, cd.created_at, cd.updated_at
       FROM custom_domains cd
       WHERE cd.team_id = $1 AND cd.deleted_at IS NULL
       ORDER BY cd.is_primary DESC, cd.created_at DESC`,
      [teamId],
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
  async create({ domain, userId, teamId = null, verificationMethod = 'cname' }) {
    const token = this.generateToken()
    return db.one(
      `INSERT INTO custom_domains (domain, user_id, team_id, verification_token, verification_method)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, domain, verification_token, verification_method, ssl_status,
                 is_active, is_primary, team_id, branding, created_at`,
      [domain, userId, teamId, token, verificationMethod],
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
   * Set domain as primary (unset others first — scoped to user or team)
   */
  async setPrimary(id, userId) {
    return db.tx(async (t) => {
      // Get the domain to check team scope
      const domain = await t.oneOrNone(
        `SELECT id, team_id FROM custom_domains WHERE id = $1 AND deleted_at IS NULL`,
        [id],
      )
      if (!domain) return null

      if (domain.team_id) {
        // Team-scoped: unset primary for all domains in the same team
        await t.none(
          `UPDATE custom_domains SET is_primary = FALSE 
           WHERE team_id = $1 AND deleted_at IS NULL`,
          [domain.team_id],
        )
      } else {
        // User-scoped: unset primary for user's personal domains
        await t.none(
          `UPDATE custom_domains SET is_primary = FALSE 
           WHERE user_id = $1 AND team_id IS NULL AND deleted_at IS NULL`,
          [userId],
        )
      }
      // Set the selected domain as primary
      return t.oneOrNone(
        `UPDATE custom_domains SET is_primary = TRUE 
         WHERE id = $1 AND deleted_at IS NULL
         RETURNING *`,
        [id],
      )
    })
  },

  /**
   * Update branding config for a domain
   */
  async updateBranding(id, branding) {
    return db.oneOrNone(
      `UPDATE custom_domains 
       SET branding = $2
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING *`,
      [id, JSON.stringify(branding)],
    )
  },

  /**
   * Update health check status
   */
  async updateHealthStatus(id, { status, error = null, resetFailures = false }) {
    if (resetFailures || status === 'healthy') {
      return db.oneOrNone(
        `UPDATE custom_domains 
         SET health_status = $2, health_error = $3, last_health_check_at = NOW(), consecutive_failures = 0
         WHERE id = $1 AND deleted_at IS NULL
         RETURNING id, domain, health_status, health_error, consecutive_failures, last_health_check_at`,
        [id, status, error],
      )
    }
    return db.oneOrNone(
      `UPDATE custom_domains 
       SET health_status = $2, health_error = $3, last_health_check_at = NOW(),
           consecutive_failures = consecutive_failures + 1
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id, domain, health_status, health_error, consecutive_failures, last_health_check_at`,
      [id, status, error],
    )
  },

  /**
   * Get all verified domains needing health checks
   */
  async getDomainsForHealthCheck(olderThanMinutes = 30) {
    return db.any(
      `SELECT id, domain, ssl_status, health_status, last_health_check_at, consecutive_failures
       FROM custom_domains
       WHERE verified_at IS NOT NULL
         AND is_active = TRUE
         AND deleted_at IS NULL
         AND (last_health_check_at IS NULL OR last_health_check_at < NOW() - INTERVAL '${olderThanMinutes} minutes')
       ORDER BY last_health_check_at ASC NULLS FIRST
       LIMIT 50`,
    )
  },

  /**
   * Soft delete domain
   */
  async delete(id, userId) {
    return db.oneOrNone(
      `UPDATE custom_domains 
       SET deleted_at = NOW(), is_active = FALSE, is_primary = FALSE
       WHERE id = $1 AND (user_id = $2 OR team_id IN (
         SELECT team_id FROM team_members WHERE user_id = $2 AND role IN ('owner', 'admin')
       )) AND deleted_at IS NULL
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
       WHERE id = $1 AND (user_id = $2 OR team_id IN (
         SELECT team_id FROM team_members WHERE user_id = $2 AND role IN ('owner', 'admin')
       )) AND deleted_at IS NULL
       RETURNING id, domain, verification_token, verification_method`,
      [id, userId, token],
    )
  },
}

module.exports = CustomDomainRepo
