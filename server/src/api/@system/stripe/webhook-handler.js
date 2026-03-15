// @system — Stripe webhook event handler
// Delegates all business logic and DB persistence to the Billing service.
'use strict'

const logger  = require('../../../lib/@system/Logger')
const Billing = require('../../../lib/@system/Billing')

/**
 * Process a verified Stripe webhook event.
 * Called by the webhook HTTP handler after Stripe signature verification.
 * @param {import('stripe').Stripe.Event} event - Verified Stripe event object.
 * @returns {Promise<void>}
 */
async function handleStripeWebhook(event) {
  try {
    await Billing.handleWebhookEvent(event)
  } catch (err) {
    logger.error({ err, eventType: event.type }, 'stripe webhook handler error')
    throw err
  }
}

module.exports = { handleStripeWebhook }
