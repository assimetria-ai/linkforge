'use strict'

const db = require('../../../lib/@system/PostgreSQL')

const LinksRepo = {
  /**
   * Find active link by slug (for redirects)
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
      `SELECT id, slug, target_url, clicks, description, is_active,
              utm_source, utm_medium, utm_campaign, utm_term, utm_content,
              created_at, updated_at
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
  async create({ slug, target_url, user_id, description = null, utm_source = null, utm_medium = null, utm_campaign = null, utm_term = null, utm_content = null }) {
    return db.one(
      `INSERT INTO links (slug, target_url, user_id, description, utm_source, utm_medium, utm_campaign, utm_term, utm_content)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, slug, target_url, clicks, description, is_active,
                 utm_source, utm_medium, utm_campaign, utm_term, utm_content, created_at`,
      [slug, target_url, user_id, description, utm_source, utm_medium, utm_campaign, utm_term, utm_content],
    )
  },

  /**
   * Update link
   */
  async update(id, user_id, { target_url, description, is_active, utm_source, utm_medium, utm_campaign, utm_term, utm_content }) {
    const setClauses = []
    const values = []
    let paramIndex = 1

    if (target_url !== undefined) {
      setClauses.push(`target_url = $${paramIndex++}`)
      values.push(target_url)
    }
    if (description !== undefined) {
      setClauses.push(`description = $${paramIndex++}`)
      values.push(description)
    }
    if (is_active !== undefined) {
      setClauses.push(`is_active = $${paramIndex++}`)
      values.push(is_active)
    }
    if (utm_source !== undefined) {
      setClauses.push(`utm_source = $${paramIndex++}`)
      values.push(utm_source?.trim() || null)
    }
    if (utm_medium !== undefined) {
      setClauses.push(`utm_medium = $${paramIndex++}`)
      values.push(utm_medium?.trim() || null)
    }
    if (utm_campaign !== undefined) {
      setClauses.push(`utm_campaign = $${paramIndex++}`)
      values.push(utm_campaign?.trim() || null)
    }
    if (utm_term !== undefined) {
      setClauses.push(`utm_term = $${paramIndex++}`)
      values.push(utm_term?.trim() || null)
    }
    if (utm_content !== undefined) {
      setClauses.push(`utm_content = $${paramIndex++}`)
      values.push(utm_content?.trim() || null)
    }

    if (setClauses.length === 0) {
      return this.findById(id)
    }

    values.push(id, user_id)
    return db.oneOrNone(
      `UPDATE links 
       SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex++} AND user_id = $${paramIndex++} AND deleted_at IS NULL
       RETURNING id, slug, target_url, clicks, description, is_active,
                 utm_source, utm_medium, utm_campaign, utm_term, utm_content,
                 created_at, updated_at`,
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
       RETURNING clicks`,
      [slug],
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
      `SELECT id, slug, target_url, clicks, description, is_active,
              utm_source, utm_medium, utm_campaign, utm_term, utm_content,
              created_at, updated_at
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
