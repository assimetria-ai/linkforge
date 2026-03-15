// @system — SubscriptionRepo: database access layer for the subscriptions table

'use strict'

const db = require('../../../lib/@system/PostgreSQL')

const SubscriptionRepo = {
  /** Find all subscriptions for a user, newest first. */
  async findByUserId(userId) {
    return db.manyOrNone(
      'SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    )
  },

  /** Find the most recent active/trialing/past_due subscription for a user. */
  async findActiveByUserId(userId) {
    return db.oneOrNone(
      `SELECT * FROM subscriptions
        WHERE user_id = $1
          AND status IN ('active', 'trialing', 'past_due')
        ORDER BY created_at DESC
        LIMIT 1`,
      [userId]
    )
  },

  /** Find a subscription by Stripe subscription ID. */
  async findByStripeSubscriptionId(stripeSubscriptionId) {
    return db.oneOrNone(
      'SELECT * FROM subscriptions WHERE stripe_subscription_id = $1',
      [stripeSubscriptionId]
    )
  },

  /** Find the most recent subscription for a Stripe customer ID. */
  async findByStripeCustomerId(stripeCustomerId) {
    return db.oneOrNone(
      `SELECT * FROM subscriptions
        WHERE stripe_customer_id = $1
        ORDER BY created_at DESC
        LIMIT 1`,
      [stripeCustomerId]
    )
  },

  /**
   * Upsert a subscription by stripe_subscription_id.
   * Inserts if not present; updates all mutable fields if it already exists.
   */
  async upsertByStripeSubscriptionId(stripeSubscriptionId, fields) {
    const {
      user_id,
      stripe_customer_id,
      stripe_price_id,
      plan = 'pro',
      status = 'active',
      cancel_at_period_end = false,
      current_period_start,
      current_period_end,
      trial_end,
    } = fields

    return db.one(
      `INSERT INTO subscriptions
         (user_id, stripe_customer_id, stripe_subscription_id, stripe_price_id,
          plan, status, cancel_at_period_end,
          current_period_start, current_period_end, trial_end)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (stripe_subscription_id) DO UPDATE
         SET stripe_customer_id   = EXCLUDED.stripe_customer_id,
             stripe_price_id      = EXCLUDED.stripe_price_id,
             plan                 = EXCLUDED.plan,
             status               = EXCLUDED.status,
             cancel_at_period_end = EXCLUDED.cancel_at_period_end,
             current_period_start = EXCLUDED.current_period_start,
             current_period_end   = EXCLUDED.current_period_end,
             trial_end            = EXCLUDED.trial_end,
             updated_at           = now()
       RETURNING *`,
      [
        user_id, stripe_customer_id, stripeSubscriptionId, stripe_price_id,
        plan, status, cancel_at_period_end,
        current_period_start ?? null, current_period_end ?? null, trial_end ?? null,
      ]
    )
  },

  /**
   * Update mutable fields on an existing subscription row.
   * Only provided (non-undefined) fields are changed.
   */
  async update(id, fields) {
    const {
      plan,
      status,
      cancel_at_period_end,
      current_period_start,
      current_period_end,
      trial_end,
    } = fields

    return db.oneOrNone(
      `UPDATE subscriptions
          SET plan                 = COALESCE($2, plan),
              status               = COALESCE($3, status),
              cancel_at_period_end = COALESCE($4, cancel_at_period_end),
              current_period_start = COALESCE($5, current_period_start),
              current_period_end   = COALESCE($6, current_period_end),
              trial_end            = COALESCE($7, trial_end),
              updated_at           = now()
        WHERE id = $1
       RETURNING *`,
      [
        id,
        plan ?? null,
        status ?? null,
        cancel_at_period_end ?? null,
        current_period_start ?? null,
        current_period_end ?? null,
        trial_end ?? null,
      ]
    )
  },

  /** Create a new subscription row. Returns the full inserted row. */
  async create(fields) {
    const {
      user_id,
      stripe_customer_id,
      stripe_subscription_id,
      stripe_price_id,
      plan = 'free',
      status = 'active',
      cancel_at_period_end = false,
      current_period_start,
      current_period_end,
      trial_end,
    } = fields

    return db.one(
      `INSERT INTO subscriptions
         (user_id, stripe_customer_id, stripe_subscription_id, stripe_price_id,
          plan, status, cancel_at_period_end,
          current_period_start, current_period_end, trial_end)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        user_id, stripe_customer_id, stripe_subscription_id, stripe_price_id,
        plan, status, cancel_at_period_end,
        current_period_start ?? null, current_period_end ?? null, trial_end ?? null,
      ]
    )
  },
}

module.exports = SubscriptionRepo
