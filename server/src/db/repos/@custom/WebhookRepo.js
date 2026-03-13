'use strict'

const db = require('../../../lib/@system/PostgreSQL')

const WebhookRepo = {
  /**
   * Create a new webhook
   */
  async create({ user_id, name, url, secret, events }) {
    return db.one(
      `INSERT INTO webhooks (user_id, name, url, secret, events)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [user_id, name, url, secret || null, events || ['link.click']],
    )
  },

  /**
   * Find webhook by ID
   */
  async findById(id) {
    return db.oneOrNone('SELECT * FROM webhooks WHERE id = $1', [id])
  },

  /**
   * Find all webhooks for a user
   */
  async findByUserId(user_id) {
    return db.any(
      'SELECT * FROM webhooks WHERE user_id = $1 ORDER BY created_at DESC',
      [user_id],
    )
  },

  /**
   * Find active webhooks for a user subscribed to a specific event
   */
  async findActiveByEvent(user_id, event_type) {
    return db.any(
      `SELECT * FROM webhooks 
       WHERE user_id = $1 AND is_active = true AND $2 = ANY(events)
       ORDER BY created_at ASC`,
      [user_id, event_type],
    )
  },

  /**
   * Update a webhook
   */
  async update(id, user_id, data) {
    const fields = []
    const values = []
    let idx = 3

    if (data.name !== undefined) { fields.push(`name = $${idx}`); values.push(data.name); idx++ }
    if (data.url !== undefined) { fields.push(`url = $${idx}`); values.push(data.url); idx++ }
    if (data.secret !== undefined) { fields.push(`secret = $${idx}`); values.push(data.secret); idx++ }
    if (data.events !== undefined) { fields.push(`events = $${idx}`); values.push(data.events); idx++ }
    if (data.is_active !== undefined) { fields.push(`is_active = $${idx}`); values.push(data.is_active); idx++ }

    if (fields.length === 0) return this.findById(id)

    fields.push('updated_at = NOW()')

    return db.oneOrNone(
      `UPDATE webhooks SET ${fields.join(', ')} WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, user_id, ...values],
    )
  },

  /**
   * Delete a webhook
   */
  async delete(id, user_id) {
    return db.result('DELETE FROM webhooks WHERE id = $1 AND user_id = $2', [id, user_id])
  },

  /**
   * Log a webhook delivery attempt
   */
  async logDelivery({ webhook_id, event_type, payload, status_code, response_body, attempt, max_attempts, success, error_message, next_retry_at }) {
    return db.one(
      `INSERT INTO webhook_deliveries 
       (webhook_id, event_type, payload, status_code, response_body, attempt, max_attempts, success, error_message, delivered_at, next_retry_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, ${success ? 'NOW()' : 'NULL'}, $10)
       RETURNING *`,
      [webhook_id, event_type, JSON.stringify(payload), status_code, response_body, attempt, max_attempts, success, error_message, next_retry_at || null],
    )
  },

  /**
   * Get delivery history for a webhook
   */
  async getDeliveries(webhook_id, { limit = 20, offset = 0 } = {}) {
    return db.any(
      `SELECT * FROM webhook_deliveries 
       WHERE webhook_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [webhook_id, limit, offset],
    )
  },

  /**
   * Get pending retries
   */
  async getPendingRetries() {
    return db.any(
      `SELECT wd.*, w.url, w.secret 
       FROM webhook_deliveries wd
       JOIN webhooks w ON w.id = wd.webhook_id
       WHERE wd.success = false 
         AND wd.attempt < wd.max_attempts
         AND wd.next_retry_at IS NOT NULL
         AND wd.next_retry_at <= NOW()
         AND w.is_active = true
       ORDER BY wd.next_retry_at ASC
       LIMIT 50`,
    )
  },

  /**
   * Update delivery after retry
   */
  async updateDelivery(id, { status_code, response_body, attempt, success, error_message, next_retry_at }) {
    return db.oneOrNone(
      `UPDATE webhook_deliveries 
       SET status_code = $2, response_body = $3, attempt = $4, success = $5, 
           error_message = $6, delivered_at = ${success ? 'NOW()' : 'delivered_at'}, 
           next_retry_at = $7
       WHERE id = $1
       RETURNING *`,
      [id, status_code, response_body, attempt, success, error_message, next_retry_at || null],
    )
  },
}

module.exports = WebhookRepo
