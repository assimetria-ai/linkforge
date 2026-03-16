const db = require('../../../lib/@system/PostgreSQL')

const SubscriptionRepo = {
  async findById(id) {
    return db.oneOrNone('SELECT * FROM subscriptions WHERE id = $1', [id])
  },

  async findByUserId(userId) {
    return db.any('SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC', [userId])
  },

  async findActiveByUserId(userId) {
    return db.oneOrNone(
      "SELECT * FROM subscriptions WHERE user_id = $1 AND status IN ('active', 'trialing') ORDER BY created_at DESC LIMIT 1",
      [userId],
    )
  },

  async findByStripeSubscriptionId(stripeSubscriptionId) {
    return db.oneOrNone('SELECT * FROM subscriptions WHERE stripe_subscription_id = $1', [stripeSubscriptionId])
  },

  async findByStripeCustomerId(stripeCustomerId) {
    return db.oneOrNone(
      'SELECT * FROM subscriptions WHERE stripe_customer_id = $1 ORDER BY created_at DESC LIMIT 1',
      [stripeCustomerId],
    )
  },

  async create({ user_id, stripe_subscription_id, stripe_customer_id, stripe_price_id, status = 'inactive', current_period_start, current_period_end, cancel_at_period_end = false }) {
    return db.one(
      `INSERT INTO subscriptions
         (user_id, stripe_subscription_id, stripe_customer_id, stripe_price_id, status, current_period_start, current_period_end, cancel_at_period_end)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [user_id, stripe_subscription_id, stripe_customer_id, stripe_price_id, status, current_period_start, current_period_end, cancel_at_period_end],
    )
  },

  async update(id, fields) {
    const allowed = ['stripe_subscription_id', 'stripe_customer_id', 'stripe_price_id', 'status', 'current_period_start', 'current_period_end', 'cancel_at_period_end']
    const entries = Object.entries(fields).filter(([k, v]) => allowed.includes(k) && v !== undefined)
    if (!entries.length) return this.findById(id)
    const sets = entries.map(([k], i) => `${k} = $${i + 2}`).join(', ')
    const values = entries.map(([, v]) => v)
    return db.one(
      `UPDATE subscriptions SET ${sets}, updated_at = now() WHERE id = $1 RETURNING *`,
      [id, ...values],
    )
  },

  async upsertByStripeSubscriptionId({ user_id, stripe_subscription_id, stripe_customer_id, stripe_price_id, status, current_period_start, current_period_end, cancel_at_period_end }) {
    const existing = await this.findByStripeSubscriptionId(stripe_subscription_id)
    if (existing) {
      return this.update(existing.id, { stripe_customer_id, stripe_price_id, status, current_period_start, current_period_end, cancel_at_period_end })
    }
    return this.create({ user_id, stripe_subscription_id, stripe_customer_id, stripe_price_id, status, current_period_start, current_period_end, cancel_at_period_end })
  },

  async updateStatus(id, status) {
    return db.oneOrNone(
      'UPDATE subscriptions SET status = $2, updated_at = now() WHERE id = $1 RETURNING *',
      [id, status],
    )
  },

  async deleteByUserId(userId) {
    return db.result('DELETE FROM subscriptions WHERE user_id = $1', [userId])
  },
}

module.exports = SubscriptionRepo
