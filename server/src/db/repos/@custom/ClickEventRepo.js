'use strict'

const db = require('../../../lib/@system/PostgreSQL')

const ClickEventRepo = {
  /**
   * Record a click event with fingerprint data
   */
  async create({ link_id, slug, fingerprint_hash, user_agent, accept_language, screen_resolution, timezone, platform, color_depth, canvas_hash, ip_address, referer, country, city }) {
    return db.one(
      `INSERT INTO click_events 
       (link_id, slug, fingerprint_hash, user_agent, accept_language, screen_resolution, timezone, platform, color_depth, canvas_hash, ip_address, referer, country, city)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING id, fingerprint_hash, clicked_at`,
      [link_id, slug, fingerprint_hash, user_agent, accept_language, screen_resolution, timezone, platform, color_depth, canvas_hash, ip_address, referer, country, city],
    )
  },

  /**
   * Update a click event with client-side fingerprint data (canvas hash, screen, etc.)
   */
  async updateFingerprint(id, { fingerprint_hash, screen_resolution, timezone, platform, color_depth, canvas_hash }) {
    return db.oneOrNone(
      `UPDATE click_events 
       SET fingerprint_hash = COALESCE($2, fingerprint_hash),
           screen_resolution = COALESCE($3, screen_resolution),
           timezone = COALESCE($4, timezone),
           platform = COALESCE($5, platform),
           color_depth = COALESCE($6, color_depth),
           canvas_hash = COALESCE($7, canvas_hash)
       WHERE id = $1
       RETURNING id, fingerprint_hash`,
      [id, fingerprint_hash, screen_resolution, timezone, platform, color_depth, canvas_hash],
    )
  },

  /**
   * Get click events for a link with pagination
   */
  async findByLinkId(link_id, { limit = 50, offset = 0 } = {}) {
    return db.any(
      `SELECT id, fingerprint_hash, user_agent, accept_language, screen_resolution,
              timezone, platform, ip_address, referer, country, city, clicked_at
       FROM click_events
       WHERE link_id = $1
       ORDER BY clicked_at DESC
       LIMIT $2 OFFSET $3`,
      [link_id, limit, offset],
    )
  },

  /**
   * Count total clicks for a link
   */
  async countByLinkId(link_id) {
    const result = await db.one(
      `SELECT COUNT(*) as count FROM click_events WHERE link_id = $1`,
      [link_id],
    )
    return parseInt(result.count, 10)
  },

  /**
   * Count unique visitors for a link (by fingerprint)
   */
  async countUniqueByLinkId(link_id) {
    const result = await db.one(
      `SELECT COUNT(DISTINCT fingerprint_hash) as count 
       FROM click_events 
       WHERE link_id = $1 AND fingerprint_hash IS NOT NULL`,
      [link_id],
    )
    return parseInt(result.count, 10)
  },

  /**
   * Get click analytics summary for a link (clicks over time)
   */
  async getClickTimeline(link_id, { days = 30 } = {}) {
    return db.any(
      `SELECT DATE(clicked_at) as date,
              COUNT(*) as clicks,
              COUNT(DISTINCT fingerprint_hash) as unique_visitors
       FROM click_events
       WHERE link_id = $1
         AND clicked_at >= NOW() - INTERVAL '1 day' * $2
       GROUP BY DATE(clicked_at)
       ORDER BY date ASC`,
      [link_id, days],
    )
  },

  /**
   * Get top referrers for a link
   */
  async getTopReferrers(link_id, { limit = 10 } = {}) {
    return db.any(
      `SELECT COALESCE(referer, 'Direct') as referer,
              COUNT(*) as clicks,
              COUNT(DISTINCT fingerprint_hash) as unique_visitors
       FROM click_events
       WHERE link_id = $1
       GROUP BY referer
       ORDER BY clicks DESC
       LIMIT $2`,
      [link_id, limit],
    )
  },

  /**
   * Get country breakdown for a link
   */
  async getCountryBreakdown(link_id, { limit = 20 } = {}) {
    return db.any(
      `SELECT COALESCE(country, 'Unknown') as country,
              COUNT(*) as clicks,
              COUNT(DISTINCT fingerprint_hash) as unique_visitors
       FROM click_events
       WHERE link_id = $1
       GROUP BY country
       ORDER BY clicks DESC
       LIMIT $2`,
      [link_id, limit],
    )
  },

  /**
   * Get browser/platform breakdown for a link
   */
  async getPlatformBreakdown(link_id) {
    return db.any(
      `SELECT COALESCE(platform, 'Unknown') as platform,
              COUNT(*) as clicks,
              COUNT(DISTINCT fingerprint_hash) as unique_visitors
       FROM click_events
       WHERE link_id = $1
       GROUP BY platform
       ORDER BY clicks DESC`,
      [link_id],
    )
  },

  /**
   * Get analytics summary for a user's links
   */
  async getSummaryByUserId(user_id) {
    return db.any(
      `SELECT ce.link_id, l.slug, l.target_url,
              COUNT(*) as total_clicks,
              COUNT(DISTINCT ce.fingerprint_hash) as unique_visitors,
              MAX(ce.clicked_at) as last_clicked
       FROM click_events ce
       JOIN links l ON l.id = ce.link_id
       WHERE l.user_id = $1 AND l.deleted_at IS NULL
       GROUP BY ce.link_id, l.slug, l.target_url
       ORDER BY total_clicks DESC`,
      [user_id],
    )
  },
}

module.exports = ClickEventRepo
