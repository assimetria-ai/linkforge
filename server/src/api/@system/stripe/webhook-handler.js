// @system — Stripe webhook event handlers
const stripe = require('../../../lib/@system/Stripe')
const logger = require('../../../lib/@system/Logger')

// ─── Core Dependencies ───────────────────────────────────────────────────────
// Import repositories for subscription persistence
const SubscriptionRepo = require('../../../db/repos/@system/SubscriptionRepo')
const UserRepo = require('../../../db/repos/@system/UserRepo')

// ─── Main Webhook Handler ────────────────────────────────────────────────────

/**
 * Process Stripe webhook events and persist subscription changes
 * @param {Object} event - Verified Stripe webhook event
 */
async function handleWebhookEvent(event) {
  const { type, data } = event
  const obj = data.object

  switch (type) {
    // Checkout completed — link stripe customer to user and upsert subscription
    case 'checkout.session.completed': {
      if (obj.mode !== 'subscription') break
      const userId = obj.client_reference_id ?? obj.metadata?.user_id
      if (!userId) {
        logger.warn({ sessionId: obj.id }, 'checkout.session.completed: no user_id in metadata')
        break
      }

      // Persist stripe customer id on the user record for future event resolution
      await UserRepo.updateStripeCustomerId(Number(userId), obj.customer)

      const stripeSubscription = await stripe.subscriptions.retrieve(obj.subscription)
      const item = stripeSubscription.items.data[0]

      await SubscriptionRepo.upsertByStripeSubscriptionId({
        user_id: Number(userId),
        stripe_subscription_id: stripeSubscription.id,
        stripe_customer_id: obj.customer,
        stripe_price_id: item.price.id,
        status: stripeSubscription.status,
        current_period_start: new Date(stripeSubscription.current_period_start * 1000),
        current_period_end: new Date(stripeSubscription.current_period_end * 1000),
        cancel_at_period_end: stripeSubscription.cancel_at_period_end,
      })

      logger.info({ userId, subscriptionId: stripeSubscription.id }, 'checkout completed — subscription created')
      break
    }

    // Subscription created (can arrive before or independently of checkout.session.completed)
    case 'customer.subscription.created': {
      // Resolve user via stripe customer id
      const user = await UserRepo.findByStripeCustomerId(obj.customer)
      const userId = obj.metadata?.user_id ? Number(obj.metadata.user_id) : user?.id
      if (!userId) {
        logger.warn({ customerId: obj.customer, subscriptionId: obj.id }, 'subscription.created: could not resolve user')
        break
      }
      const item = obj.items.data[0]
      await SubscriptionRepo.upsertByStripeSubscriptionId({
        user_id: userId,
        stripe_subscription_id: obj.id,
        stripe_customer_id: obj.customer,
        stripe_price_id: item?.price?.id,
        status: obj.status,
        current_period_start: new Date(obj.current_period_start * 1000),
        current_period_end: new Date(obj.current_period_end * 1000),
        cancel_at_period_end: obj.cancel_at_period_end,
      })
      logger.info({ userId, subscriptionId: obj.id, status: obj.status }, 'subscription created')
      break
    }

    // Subscription updated (plan change, renewal, cancellation toggle)
    case 'customer.subscription.updated': {
      const existing = await SubscriptionRepo.findByStripeSubscriptionId(obj.id)
      if (!existing) {
        logger.warn({ subscriptionId: obj.id }, 'customer.subscription.updated: subscription not found locally')
        break
      }

      const item = obj.items.data[0]
      await SubscriptionRepo.update(existing.id, {
        stripe_customer_id: obj.customer,
        stripe_price_id: item?.price?.id,
        status: obj.status,
        current_period_start: new Date(obj.current_period_start * 1000),
        current_period_end: new Date(obj.current_period_end * 1000),
        cancel_at_period_end: obj.cancel_at_period_end,
      })

      logger.info({ subscriptionId: obj.id, status: obj.status }, 'subscription updated')
      break
    }

    // Subscription cancelled / ended
    case 'customer.subscription.deleted': {
      const existing = await SubscriptionRepo.findByStripeSubscriptionId(obj.id)
      if (!existing) break

      await SubscriptionRepo.updateStatus(existing.id, 'cancelled')
      logger.info({ subscriptionId: obj.id }, 'subscription cancelled')
      break
    }

    // Payment failed — mark subscription as past_due
    case 'invoice.payment_failed': {
      const subId = obj.subscription
      if (!subId) break

      const existing = await SubscriptionRepo.findByStripeSubscriptionId(subId)
      if (!existing) break

      await SubscriptionRepo.updateStatus(existing.id, 'past_due')
      logger.warn({ subscriptionId: subId, invoiceId: obj.id }, 'payment failed — subscription marked past_due')
      break
    }

    // Invoice paid — refresh period dates and ensure subscription is active
    case 'invoice.payment_succeeded': {
      const subId = obj.subscription
      if (!subId) break

      const existing = await SubscriptionRepo.findByStripeSubscriptionId(subId)
      if (!existing) break

      // Fetch fresh subscription to get updated period dates
      const freshSub = await stripe.subscriptions.retrieve(subId)
      await SubscriptionRepo.update(existing.id, {
        stripe_customer_id: freshSub.customer,
        status: freshSub.status,
        current_period_start: new Date(freshSub.current_period_start * 1000),
        current_period_end: new Date(freshSub.current_period_end * 1000),
        cancel_at_period_end: freshSub.cancel_at_period_end,
      })
      logger.info({ subscriptionId: subId, status: freshSub.status }, 'invoice paid — subscription refreshed')
      break
    }

    default:
      logger.debug({ eventType: type }, 'unhandled stripe event type')
  }
}

module.exports = { handleWebhookEvent }
