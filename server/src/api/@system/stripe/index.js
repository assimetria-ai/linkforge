// @system — Stripe checkout + webhook + portal
// All Stripe SDK and SubscriptionRepo calls are delegated to the Billing service.
'use strict'

const express  = require('express')
const router   = express.Router()
const Billing  = require('../../../lib/@system/Billing')
const { authenticate } = require('../../../lib/@system/Helpers/auth')
const logger   = require('../../../lib/@system/Logger')

// ─── Checkout ────────────────────────────────────────────────────────────────

// POST /api/stripe/create-checkout-session
router.post('/stripe/create-checkout-session', authenticate, async (req, res, next) => {
  try {
    const { priceId, trialDays } = req.body
    if (!priceId) return res.status(400).json({ message: 'priceId is required' })

    const result = await Billing.createCheckoutSession(req.user, priceId, { trialDays })
    res.json(result)
  } catch (err) {
    next(err)
  }
})

// ─── Customer Portal ─────────────────────────────────────────────────────────

// POST /api/stripe/create-portal-session
router.post('/stripe/create-portal-session', authenticate, async (req, res, next) => {
  try {
    const result = await Billing.createPortalSession(req.user)
    res.json(result)
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ message: err.message })
    next(err)
  }
})

// ─── Cancel / Uncancel ───────────────────────────────────────────────────────

// POST /api/stripe/cancel-subscription
router.post('/stripe/cancel-subscription', authenticate, async (req, res, next) => {
  try {
    await Billing.cancelSubscription(req.user)
    res.json({ message: 'Subscription will cancel at period end', cancel_at_period_end: true })
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ message: err.message })
    next(err)
  }
})

// POST /api/stripe/uncancel-subscription
router.post('/stripe/uncancel-subscription', authenticate, async (req, res, next) => {
  try {
    await Billing.uncancelSubscription(req.user)
    res.json({ message: 'Subscription cancellation reversed', cancel_at_period_end: false })
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ message: err.message })
    next(err)
  }
})

// ─── Webhook ─────────────────────────────────────────────────────────────────
// NOTE: The webhook route is mounted directly in app.js BEFORE body parsing middleware
// to preserve the raw body required for signature verification. See app.js for implementation.
// The webhook handler logic is in ./webhook-handler.js

module.exports = router
