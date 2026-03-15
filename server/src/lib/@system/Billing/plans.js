// @system — Billing plan definitions + tier helpers
'use strict'

/**
 * Plan tier hierarchy in ascending order of privilege.
 * Used by meetsMinPlan() to compare tiers.
 * @type {string[]}
 */
const PLAN_HIERARCHY = ['free', 'pro', 'enterprise']

/**
 * Canonical plan definitions.
 * priceId fields use getters so they always reflect the current env var values,
 * including in tests that set process.env after module load.
 */
const PLANS = {
  free: {
    name: 'Free',
    priceId: null,
    features: {
      maxUsers: 1,
      storage: '1GB',
      apiCallsPerMonth: 1000,
      customDomains: 0,
      support: 'community',
    },
  },
  pro: {
    name: 'Pro',
    get priceId() { return process.env.STRIPE_PRICE_PRO ?? null },
    features: {
      maxUsers: 10,
      storage: '20GB',
      apiCallsPerMonth: 50000,
      customDomains: 5,
      support: 'email',
    },
  },
  enterprise: {
    name: 'Enterprise',
    get priceId() { return process.env.STRIPE_PRICE_ENTERPRISE ?? null },
    features: {
      maxUsers: -1,      // unlimited
      storage: 'Unlimited',
      apiCallsPerMonth: -1, // unlimited
      customDomains: -1, // unlimited
      support: 'priority',
    },
  },
}

/**
 * Check whether a user's plan meets a minimum tier requirement.
 * Unknown plan slugs are treated as 'free'.
 * @param {string|null|undefined} userPlan - The user's current plan slug.
 * @param {string} minPlan - The minimum required plan slug.
 * @returns {boolean}
 */
function meetsMinPlan(userPlan, minPlan) {
  const userIdx = PLAN_HIERARCHY.indexOf(userPlan ?? 'free')
  const minIdx  = PLAN_HIERARCHY.indexOf(minPlan)
  if (minIdx === -1) throw new Error(`[Billing] Unknown plan: "${minPlan}"`)
  return userIdx >= minIdx
}

/**
 * Resolve a plan slug from a Stripe price ID.
 * Falls back to 'pro' for unrecognised paid price IDs, 'free' when priceId is falsy.
 * @param {string|null|undefined} priceId
 * @returns {string} plan slug
 */
function getPlanByPriceId(priceId) {
  if (!priceId) return 'free'
  for (const [slug, plan] of Object.entries(PLANS)) {
    if (plan.priceId && plan.priceId === priceId) return slug
  }
  return 'pro' // safe default for any paid price ID not explicitly configured
}

module.exports = { PLANS, PLAN_HIERARCHY, meetsMinPlan, getPlanByPriceId }
