'use strict'

const db = require('../../../lib/@system/PostgreSQL')

const LINK_COLUMNS = `id, slug, target_url, clicks, description, is_active,
  utm_source, utm_medium, utm_campaign, utm_term, utm_content,
  expires_at, click_limit, expired_reason, expiration_alert_sent, expiration_alert_days,
  domain_id, created_at, updated_at`

const LinksRepo = {
  /**
   * Find active link by slug (for redirects)
   * Does NOT check expiration here — caller (redirect handler) checks separately
   * so it can show appropriate expired page.
   */
  async findBySlug(slug) {
    return db.oneOrNone(
      `SELECT * FROM links 
       WHERE slug = $1 
       AND is_active = TRUE 
       AND deleted_at IS NULL`,
      [slug],
    )
  },

  /**
   * Find active link by slug scoped to a custom domain
   * Used when request comes through a custom domain hostname
   */
  async findBySlugAndDomain(slug, domainId) {
    return db.oneOrNone(
      `SELECT * FROM links 
       WHERE slug = $1 
       AND domain_id = $2
       AND is_active = TRUE 
       AND deleted_at IS NULL`,
      [slug, domainId],
    )
  },

  /**
   * Check if slug already exists (collision detection)
   */
  async slugExists(slug) {
    const result = await db.oneOrNone(
      `SELECT id FROM links WHERE slug = $1 AND deleted_at IS NULL`,
      [slug],
    )
    return !!result
  },

  /**
   * Get all links for a user
   */
  async findByUserId(user_id, { limit = 50, offset = 0 } = {}) {
    return db.any(
      `SELECT ${LINK_COLUMNS}
       FROM links
       WHERE user_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [user_id, limit, offset],
    )
  },

  /**
   * Count user's links
   */
  async countByUserId(user_id) {
    const result = await db.one(
      `SELECT COUNT(*) as count FROM links WHERE user_id = $1 AND deleted_at IS NULL`,
      [user_id],
    )
    return parseInt(result.count, 10)
  },

  /**
   * Get link by ID (for updates/deletes)
   */
  async findById(id) {
    return db.oneOrNone(
      `SELECT * FROM links WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    )
  },

  /**
   * Create a new short link
   */
  async create({ slug, target_url, user_id, description = null, utm_source = null, utm_medium = null, utm_campaign = null, utm_term = null, utm_content = null, expires_at = null, click_limit = null, expiration_alert_days = null, domain_id = null }) {
    return db.one(
      `INSERT INTO links (slug, target_url, user_id, description, utm_source, utm_medium, utm_campaign, utm_term, utm_content, expires_at, click_limit, expiration_alert_days, domain_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING ${LINK_COLUMNS}`,
      [slug, target_url, user_id, description, utm_source, utm_medium, utm_campaign, utm_term, utm_content, expires_at, click_limit, expiration_alert_days, domain_id],
    )
  },

  /**
   * Update link
   */
  async update(id, user_id, fields) {
    const allowedFields = [
      'target_url', 'description', 'is_active',
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'expires_at', 'click_limit', 'expired_reason', 'expiration_alert_sent', 'expiration_alert_days',
      'domain_id',
    ]
    const setClauses = []
    const values = []
    let paramIndex = 1

    for (const field of allowedFields) {
      if (fields[field] !== undefined) {
        const val = fields[field]
        // Trim string fields that should be trimmed
        if (['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].includes(field)) {
          setClauses.push(`${field} = $${paramIndex++}`)
          values.push(val?.trim() || null)
        } else {
          setClauses.push(`${field} = $${paramIndex++}`)
          values.push(val)
        }
      }
    }

    if (setClauses.length === 0) {
      return this.findById(id)
    }

    values.push(id, user_id)
    return db.oneOrNone(
      `UPDATE links 
       SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex++} AND user_id = $${paramIndex++} AND deleted_at IS NULL
       RETURNING ${LINK_COLUMNS}`,
      values,
    )
  },

  /**
   * Soft delete link
   */
  async delete(id, user_id) {
    return db.oneOrNone(
      `UPDATE links 
       SET deleted_at = NOW() 
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [id, user_id],
    )
  },

  /**
   * Increment click count (atomic)
   */
  async incrementClicks(slug) {
    return db.oneOrNone(
      `UPDATE links 
       SET clicks = clicks + 1
       WHERE slug = $1 AND deleted_at IS NULL
       RETURNING clicks, click_limit`,
      [slug],
    )
  },

  /**
   * Check if a link is expired (by date or click limit)
   */
  isExpired(link) {
    if (!link) return { expired: true, reason: 'not_found' }
    if (link.expires_at && new Date(link.expires_at) <= new Date()) {
      return { expired: true, reason: 'date_expired' }
    }
    if (link.click_limit && link.clicks >= link.click_limit) {
      return { expired: true, reason: 'click_limit_reached' }
    }
    return { expired: false, reason: null }
  },

  /**
   * Auto-disable expired links (batch operation for cron)
   * Returns count of links disabled.
   */
  async disableExpiredLinks() {
    const result = await db.result(
      `UPDATE links 
       SET is_active = FALSE, 
           expired_reason = CASE
             WHEN expires_at IS NOT NULL AND expires_at <= NOW() THEN 'date_expired'
             WHEN click_limit IS NOT NULL AND clicks >= click_limit THEN 'click_limit_reached'
           END
       WHERE deleted_at IS NULL
         AND is_active = TRUE
         AND (
           (expires_at IS NOT NULL AND expires_at <= NOW())
           OR (click_limit IS NOT NULL AND clicks >= click_limit)
         )
       RETURNING id`,
    )
    return result.rowCount
  },

  /**
   * Find links expiring soon (for email alerts)
   * Returns links expiring within `days` days that haven't had an alert sent.
   */
  async findExpiringLinks(user_id, days = 3) {
    return db.any(
      `SELECT ${LINK_COLUMNS}
       FROM links
       WHERE user_id = $1
         AND deleted_at IS NULL
         AND is_active = TRUE
         AND expires_at IS NOT NULL
         AND expires_at <= NOW() + INTERVAL '1 day' * $2
         AND expires_at > NOW()
         AND expiration_alert_sent = FALSE
       ORDER BY expires_at ASC`,
      [user_id, days],
    )
  },

  /**
   * Mark expiration alerts as sent for given link IDs
   */
  async markAlertsSent(linkIds) {
    if (!linkIds.length) return
    return db.none(
      `UPDATE links SET expiration_alert_sent = TRUE WHERE id = ANY($1)`,
      [linkIds],
    )
  },

  /**
   * Bulk update expiration for multiple links
   */
  async bulkUpdateExpiration(user_id, linkIds, { expires_at, click_limit }) {
    const setClauses = []
    const values = [linkIds, user_id]
    let paramIndex = 3

    if (expires_at !== undefined) {
      setClauses.push(`expires_at = $${paramIndex++}`)
      values.push(expires_at)
      // Reset alert flag when expiration changes
      setClauses.push('expiration_alert_sent = FALSE')
    }
    if (click_limit !== undefined) {
      setClauses.push(`click_limit = $${paramIndex++}`)
      values.push(click_limit)
    }

    if (setClauses.length === 0) return []

    return db.any(
      `UPDATE links 
       SET ${setClauses.join(', ')}
       WHERE id = ANY($1) AND user_id = $2 AND deleted_at IS NULL
       RETURNING ${LINK_COLUMNS}`,
      values,
    )
  },

  /**
   * Get expired links for a user
   */
  async findExpiredByUserId(user_id, { limit = 50, offset = 0 } = {}) {
    return db.any(
      `SELECT ${LINK_COLUMNS}
       FROM links
       WHERE user_id = $1 
         AND deleted_at IS NULL
         AND (
           expired_reason IS NOT NULL
           OR (expires_at IS NOT NULL AND expires_at <= NOW())
           OR (click_limit IS NOT NULL AND clicks >= click_limit)
         )
       ORDER BY COALESCE(expires_at, created_at) DESC
       LIMIT $2 OFFSET $3`,
      [user_id, limit, offset],
    )
  },

  /**
   * Get top links by clicks
   */
  async getTopLinks({ limit = 10 } = {}) {
    return db.any(
      `SELECT slug, target_url, clicks, created_at
       FROM links
       WHERE deleted_at IS NULL AND is_active = TRUE
       ORDER BY clicks DESC
       LIMIT $1`,
      [limit],
    )
  },

  /**
   * Get UTM analytics breakdown by campaign
   */
  async getUtmStats(user_id) {
    return db.any(
      `SELECT utm_campaign, utm_source, utm_medium,
              COUNT(*) as link_count,
              COALESCE(SUM(clicks), 0) as total_clicks
       FROM links
       WHERE user_id = $1
         AND deleted_at IS NULL
         AND utm_campaign IS NOT NULL
       GROUP BY utm_campaign, utm_source, utm_medium
       ORDER BY total_clicks DESC`,
      [user_id],
    )
  },

  /**
   * Get links filtered by UTM campaign
   */
  async findByCampaign(user_id, campaign, { limit = 50, offset = 0 } = {}) {
    return db.any(
      `SELECT ${LINK_COLUMNS}
       FROM links
       WHERE user_id = $1
         AND utm_campaign = $2
         AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT $3 OFFSET $4`,
      [user_id, campaign, limit, offset],
    )
  },
}

module.exports = LinksRepo
