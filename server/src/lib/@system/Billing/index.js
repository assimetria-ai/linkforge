// @system — Billing service: orchestrates Stripe SDK + SubscriptionRepo
// All route handlers should call these methods rather than touching Stripe or
// SubscriptionRepo directly.
'use strict'

const stripe          = require('../Stripe')
const SubscriptionRepo = require('../../../db/repos/@system/SubscriptionRepo')
const logger          = require('../Logger')
const { getPlanByPriceId } = require('./plans')

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Build a 404-status error for missing subscriptions.
 * @param {string} message
 * @returns {Error}
 */
function notFound(message) {
  const err = new Error(message)
  err.status = 404
  return err
}

/**
 * Map a Stripe Subscription object to SubscriptionRepo upsert fields.
 * @param {object} stripeSub - Stripe Subscription object (expanded or event payload).
 * @param {string|number} userId
 * @returns {object}
 */
function stripeSubToFields(stripeSub, userId) {
  const priceId = stripeSub.items?.data?.[0]?.price?.id ?? null
  return {
    user_id:              userId,
    stripe_customer_id:   stripeSub.customer,
    stripe_price_id:      priceId,
    plan:                 getPlanByPriceId(priceId),
    status:               stripeSub.status,
    cancel_at_period_end: stripeSub.cancel_at_period_end ?? false,
    current_period_start: stripeSub.current_period_start
      ? new Date(stripeSub.current_period_start * 1000) : null,
    current_period_end:   stripeSub.current_period_end
      ? new Date(stripeSub.current_period_end * 1000) : null,
    trial_end:            stripeSub.trial_end
      ? new Date(stripeSub.trial_end * 1000) : null,
  }
}

// ─── Billing service ──────────────────────────────────────────────────────────

const Billing = {

  // ── Checkout & portal ────────────────────────────────────────────────────

  /**
   * Create a Stripe Checkout session for a new subscription.
   * @param {{ id: string|number, email: string }} user
   * @param {string} priceId - Stripe price ID.
   * @param {{ trialDays?: number }} [opts]
   * @returns {Promise<{ url: string }>}
   */
  async createCheckoutSession(user, priceId, opts = {}) {
    const { trialDays } = opts

    const params = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.APP_URL}/app/billing?checkout=success`,
      cancel_url:  `${process.env.APP_URL}/pricing`,
      customer_email: user.email,
      client_reference_id: String(user.id),
      metadata: { user_id: String(user.id) },
    }

    if (trialDays && Number(trialDays) > 0) {
      params.subscription_data = {
        trial_period_days: Number(trialDays),
        metadata: { user_id: String(user.id) },
      }
    }

    const session = await stripe.checkout.sessions.create(params)
    logger.info({ userId: user.id, sessionId: session.id }, 'checkout session created')
    return { url: session.url }
  },

  /**
   * Create a Stripe Billing Portal session for subscription management.
   * @param {{ id: string|number }} user
   * @returns {Promise<{ url: string }>}
   */
  async createPortalSession(user) {
    const subscription = await SubscriptionRepo.findActiveByUserId(user.id)
    if (!subscription?.stripe_customer_id) {
      throw notFound('No active subscription found')
    }

    const session = await stripe.billingPortal.sessions.create({
      customer:   subscription.stripe_customer_id,
      return_url: `${process.env.APP_URL}/app/billing`,
    })

    logger.info({ userId: user.id }, 'portal session created')
    return { url: session.url }
  },

  // ── Cancellation ─────────────────────────────────────────────────────────

  /**
   * Schedule a subscription to cancel at the end of the current billing period.
   * @param {{ id: string|number }} user
   * @returns {Promise<object>} Updated subscription DB row.
   */
  async cancelSubscription(user) {
    const subscription = await SubscriptionRepo.findActiveByUserId(user.id)
    if (!subscription?.stripe_subscription_id) {
      throw notFound('No active subscription found')
    }

    const updated = await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true,
    })

    const row = await SubscriptionRepo.update(subscription.id, {
      cancel_at_period_end: true,
      current_period_end: new Date(updated.current_period_end * 1000),
    })

    logger.info({ userId: user.id, subscriptionId: subscription.stripe_subscription_id },
      'subscription scheduled for cancellation')
    return row
  },

  /**
   * Reverse a pending cancellation, keeping the subscription active.
   * @param {{ id: string|number }} user
   * @returns {Promise<object>} Updated subscription DB row.
   */
  async uncancelSubscription(user) {
    const subscription = await SubscriptionRepo.findActiveByUserId(user.id)
    if (!subscription?.stripe_subscription_id) {
      throw notFound('No active subscription found')
    }

    const updated = await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: false,
    })

    const row = await SubscriptionRepo.update(subscription.id, {
      cancel_at_period_end: false,
      current_period_end: new Date(updated.current_period_end * 1000),
    })

    logger.info({ userId: user.id, subscriptionId: subscription.stripe_subscription_id },
      'subscription cancellation reversed')
    return row
  },

  // ── Status queries ────────────────────────────────────────────────────────

  /**
   * Get the current subscription status for a user from the DB.
   * Returns null (not an error) when the user has no subscription.
   * @param {string|number} userId
   * @returns {Promise<object|null>}
   */
  async getSubscriptionStatus(userId) {
    return SubscriptionRepo.findActiveByUserId(userId)
  },

  /**
   * Return the user's current plan slug ('free' | 'pro' | 'enterprise').
   * Falls back to 'free' when no active subscription exists.
   * @param {string|number} userId
   * @returns {Promise<string>}
   */
  async getPlan(userId) {
    const sub = await SubscriptionRepo.findActiveByUserId(userId)
    return sub?.plan ?? 'free'
  },

  /**
   * Return true when the user is on the pro plan (or higher).
   * @param {string|number} userId
   * @returns {Promise<boolean>}
   */
  async isPro(userId) {
    const plan = await Billing.getPlan(userId)
    return plan === 'pro' || plan === 'enterprise'
  },

  /**
   * Return true when the user is in a trial period.
   * @param {string|number} userId
   * @returns {Promise<boolean>}
   */
  async isTrial(userId) {
    const sub = await SubscriptionRepo.findActiveByUserId(userId)
    return sub?.status === 'trialing'
  },

  // ── Stripe sync ───────────────────────────────────────────────────────────

  /**
   * Upsert a subscription row from a Stripe Subscription object.
   * When userId is null the repo is queried by stripe_customer_id to resolve it.
   * Returns null (with a warning) when userId cannot be resolved.
   * @param {object} stripeSub - Full Stripe Subscription object.
   * @param {string|number|null} userId
   * @returns {Promise<object|null>} Upserted DB row, or null.
   */
  async syncSubscriptionFromStripe(stripeSub, userId) {
    let resolvedUserId = userId

    if (!resolvedUserId) {
      const existing = await SubscriptionRepo.findByStripeCustomerId(stripeSub.customer)
      resolvedUserId = existing?.user_id ?? null
    }

    if (!resolvedUserId) {
      logger.warn(
        { stripeSubscriptionId: stripeSub.id, stripeCustomerId: stripeSub.customer },
        'syncSubscriptionFromStripe: cannot resolve user_id — skipping',
      )
      return null
    }

    const row = await SubscriptionRepo.upsertByStripeSubscriptionId(
      stripeSub.id,
      stripeSubToFields(stripeSub, resolvedUserId),
    )

    logger.info(
      { userId: resolvedUserId, stripeSubscriptionId: stripeSub.id, status: stripeSub.status },
      'subscription synced from stripe',
    )
    return row
  },

  // ── Webhook dispatcher ────────────────────────────────────────────────────

  /**
   * Handle a verified Stripe webhook event with full DB persistence.
   * Called by the webhook HTTP handler after signature verification.
   * @param {import('stripe').Stripe.Event} event - Verified Stripe event object.
   * @returns {Promise<void>}
   */
  async handleWebhookEvent(event) {
    const { type, data } = event
    const obj = data.object

    switch (type) {

      // ── Checkout completed ─────────────────────────────────────────────
      case 'checkout.session.completed': {
        if (obj.mode !== 'subscription') break

        const userId = obj.client_reference_id ?? obj.metadata?.user_id
        if (!userId) {
          logger.warn({ sessionId: obj.id },
            'checkout.session.completed: no user_id in session — skipping')
          break
        }

        // Retrieve the full subscription object (checkout session only carries the ID)
        const stripeSub = await stripe.subscriptions.retrieve(obj.subscription)
        await Billing.syncSubscriptionFromStripe(stripeSub, userId)

        logger.info({ userId, subscriptionId: obj.subscription }, 'checkout completed')
        break
      }

      // ── Subscription created ───────────────────────────────────────────
      case 'customer.subscription.created': {
        await Billing.syncSubscriptionFromStripe(obj, null)
        logger.info({ subscriptionId: obj.id, status: obj.status }, 'subscription created')
        break
      }

      // ── Subscription updated (renewal, plan change, cancellation toggle) ─
      case 'customer.subscription.updated': {
        await Billing.syncSubscriptionFromStripe(obj, null)
        logger.info({ subscriptionId: obj.id, status: obj.status }, 'subscription updated')
        break
      }

      // ── Subscription cancelled / ended ─────────────────────────────────
      case 'customer.subscription.deleted': {
        const sub = await SubscriptionRepo.findByStripeSubscriptionId(obj.id)
        if (sub) {
          await SubscriptionRepo.update(sub.id, { status: 'canceled' })
          logger.info({ userId: sub.user_id, subscriptionId: obj.id }, 'subscription cancelled')
        } else {
          logger.warn({ subscriptionId: obj.id }, 'customer.subscription.deleted: row not found')
        }
        break
      }

      // ── Invoice paid (may follow a payment_failed recovery) ────────────
      case 'invoice.payment_succeeded': {
        if (!obj.subscription) break
        const sub = await SubscriptionRepo.findByStripeSubscriptionId(obj.subscription)
        if (sub && sub.status !== 'active') {
          await SubscriptionRepo.update(sub.id, { status: 'active' })
          logger.info({ subscriptionId: obj.subscription }, 'subscription reactivated after payment')
        } else {
          logger.info({ subscriptionId: obj.subscription }, 'invoice paid')
        }
        break
      }

      // ── Invoice payment failed ─────────────────────────────────────────
      case 'invoice.payment_failed': {
        if (!obj.subscription) break
        const sub = await SubscriptionRepo.findByStripeSubscriptionId(obj.subscription)
        if (sub) {
          await SubscriptionRepo.update(sub.id, { status: 'past_due' })
          logger.warn(
            { userId: sub.user_id, subscriptionId: obj.subscription, invoiceId: obj.id },
            'payment failed — subscription marked past_due',
          )
        }
        break
      }

      default:
        logger.debug({ eventType: type }, 'unhandled stripe event type')
    }
  },
}

module.exports = Billing
