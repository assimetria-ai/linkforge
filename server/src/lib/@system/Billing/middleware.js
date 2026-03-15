// @system — Billing middleware: subscription gating + attachment
'use strict'

const Billing         = require('./index')
const { meetsMinPlan } = require('./plans')
const logger          = require('../Logger')

/**
 * Middleware: attach req.subscription for the authenticated user.
 * Runs a single DB query (findActiveByUserId) and stores the result on the
 * request. Always calls next() — req.subscription is null when the user has
 * no active subscription or when req.user is not set.
 *
 * Requires the `authenticate` middleware to run first so that req.user is set.
 *
 * @type {import('express').RequestHandler}
 */
async function attachSubscription(req, res, next) {
  try {
    if (!req.user?.id) return next()
    req.subscription = await Billing.getSubscriptionStatus(req.user.id)
  } catch (err) {
    logger.warn({ err }, 'attachSubscription: failed to load subscription, continuing without it')
    req.subscription = null
  }
  next()
}

/**
 * Middleware factory: gate a route behind a minimum subscription tier.
 *
 * Uses req.subscription when already attached by attachSubscription (no extra
 * DB query). Falls back to a fresh DB lookup when req.subscription is absent.
 *
 * Requires `authenticate` to run first so that req.user is set.
 *
 * @param {'free'|'pro'|'enterprise'} minPlan - Minimum required plan tier.
 * @returns {import('express').RequestHandler}
 *
 * @example
 * router.get('/pro-feature', authenticate, requirePlan('pro'), handler)
 * router.get('/pro-feature', authenticate, attachSubscription, requirePlan('pro'), handler)
 */
function requirePlan(minPlan) {
  return async (req, res, next) => {
    try {
      // Use already-attached subscription plan or do a fresh lookup
      const currentPlan = req.subscription?.plan
        ?? await Billing.getPlan(req.user?.id)

      if (!meetsMinPlan(currentPlan, minPlan)) {
        return res.status(403).json({
          message:      `This feature requires a ${minPlan} plan or higher.`,
          requiredPlan: minPlan,
          currentPlan:  currentPlan ?? 'free',
        })
      }

      next()
    } catch (err) {
      next(err)
    }
  }
}

module.exports = { attachSubscription, requirePlan }
