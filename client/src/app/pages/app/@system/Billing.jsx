// @system — Billing page with Stripe checkout integration
// Displays the user's current subscription, available plans, and billing actions.
// Requires the @system/Stripe backend routes and SubscriptionRepo to be configured.

import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ExternalLink,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import {
  getMySubscription,
  getPlans,
  createCheckoutSession,
  createPortalSession,
  cancelSubscription,
  uncancelSubscription,
  formatAmount,
  formatInterval,
} from '../../../api/@system/stripe'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function statusBadgeColor(status) {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case 'trialing':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    case 'past_due':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    case 'cancelled':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
  }
}

function statusLabel(status, cancelAtPeriodEnd) {
  if (status === 'active' && cancelAtPeriodEnd) return 'Cancelling'
  switch (status) {
    case 'active':
      return 'Active'
    case 'trialing':
      return 'Trial'
    case 'past_due':
      return 'Past Due'
    case 'cancelled':
      return 'Cancelled'
    default:
      return 'Inactive'
  }
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Billing() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [subscription, setSubscription] = useState(null)
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [error, setError] = useState('')
  const [showSuccess, setShowSuccess] = useState(
    searchParams.get('checkout') === 'success'
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [subRes, plansRes] = await Promise.all([
        getMySubscription(),
        getPlans(),
      ])
      setSubscription(subRes.subscription)
      setPlans(plansRes.plans)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load billing info'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Strip ?checkout=success from the URL after showing the banner
  useEffect(() => {
    if (showSuccess) {
      const next = new URLSearchParams(searchParams)
      next.delete('checkout')
      setSearchParams(next, { replace: true })
    }
  }, [showSuccess]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCheckout(priceId) {
    setActionLoading(priceId)
    setError('')
    try {
      await createCheckoutSession(priceId)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to start checkout'
      )
      setActionLoading(null)
    }
  }

  async function handlePortal() {
    setActionLoading('portal')
    setError('')
    try {
      await createPortalSession()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to open billing portal'
      )
      setActionLoading(null)
    }
  }

  async function handleCancel() {
    if (
      !confirm(
        'Cancel your subscription? You will keep access until the end of the billing period.'
      )
    )
      return
    setActionLoading('cancel')
    setError('')
    try {
      await cancelSubscription()
      await load()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to cancel subscription'
      )
    } finally {
      setActionLoading(null)
    }
  }

  async function handleUncancel() {
    setActionLoading('uncancel')
    setError('')
    try {
      await uncancelSubscription()
      await load()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to reverse cancellation'
      )
    } finally {
      setActionLoading(null)
    }
  }

  const hasActiveSub =
    subscription && ['active', 'trialing'].includes(subscription.status)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            Billing
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your subscription and payment details.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent disabled:opacity-50"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
          />
          Refresh
        </button>
      </div>

      {/* Success banner */}
      {showSuccess && (
        <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
          <div className="flex-1">
            <p className="font-medium text-green-800 dark:text-green-200">
              Payment successful!
            </p>
            <p className="mt-0.5 text-sm text-green-700 dark:text-green-300">
              Your subscription is now active. It may take a moment to reflect
              below.
            </p>
          </div>
          <button
            onClick={() => setShowSuccess(false)}
            className="text-green-500 hover:text-green-700"
            aria-label="Dismiss"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-8">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading billing info…
        </div>
      ) : (
        <>
          {/* Current subscription */}
          <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-semibold text-foreground">
                Current Plan
              </h2>
              {subscription && (
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeColor(
                    subscription.status
                  )}`}
                >
                  {statusLabel(
                    subscription.status,
                    subscription.cancel_at_period_end
                  )}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Your active Stripe subscription.
            </p>

            {subscription ? (
              <div className="space-y-4">
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Subscription ID</dt>
                    <dd className="mt-0.5 font-mono text-xs break-all">
                      {subscription.stripe_subscription_id}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Plan</dt>
                    <dd className="mt-0.5 capitalize">
                      {subscription.plan ?? 'Unknown'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Period start</dt>
                    <dd className="mt-0.5">
                      {formatDate(subscription.current_period_start)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">
                      {subscription.cancel_at_period_end
                        ? 'Access until'
                        : 'Renews'}
                    </dt>
                    <dd className="mt-0.5">
                      {formatDate(subscription.current_period_end)}
                    </dd>
                  </div>
                </dl>

                {subscription.cancel_at_period_end && (
                  <p className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                    Your subscription will not renew after{' '}
                    {formatDate(subscription.current_period_end)}.
                  </p>
                )}

                {subscription.status === 'past_due' && (
                  <p className="text-sm text-destructive">
                    Your last payment failed. Update your payment method to
                    avoid interruption.
                  </p>
                )}

                <div className="flex flex-wrap gap-2 border-t pt-4">
                  <button
                    onClick={handlePortal}
                    disabled={!!actionLoading}
                    className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent disabled:opacity-50"
                  >
                    {actionLoading === 'portal' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ExternalLink className="h-3.5 w-3.5" />
                    )}
                    Manage Billing
                  </button>

                  {hasActiveSub && !subscription.cancel_at_period_end && (
                    <button
                      onClick={handleCancel}
                      disabled={!!actionLoading}
                      className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
                    >
                      {actionLoading === 'cancel' && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      )}
                      Cancel Plan
                    </button>
                  )}

                  {hasActiveSub && subscription.cancel_at_period_end && (
                    <button
                      onClick={handleUncancel}
                      disabled={!!actionLoading}
                      className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent disabled:opacity-50"
                    >
                      {actionLoading === 'uncancel' && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      )}
                      Keep My Plan
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  You don&apos;t have an active subscription.
                </p>
                <Link
                  to="/pricing"
                  className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  View Plans
                </Link>
              </div>
            )}
          </div>

          {/* Available plans — shown when no active subscription */}
          {!hasActiveSub && plans.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 text-foreground">
                Choose a Plan
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {plans.map((plan) => (
                  <div
                    key={plan.priceId}
                    className="relative rounded-lg border bg-card p-6"
                  >
                    {plan.metadata?.popular === 'true' && (
                      <div className="absolute -top-2.5 left-4">
                        <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
                          Most Popular
                        </span>
                      </div>
                    )}
                    <h3 className="text-base font-semibold text-foreground">
                      {plan.name}
                    </h3>
                    {plan.description && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {plan.description}
                      </p>
                    )}
                    <div className="mt-4">
                      <span className="text-2xl font-bold text-foreground">
                        {formatAmount(plan.amount, plan.currency)}
                      </span>
                      <span className="text-muted-foreground text-sm">
                        {formatInterval(plan.interval, plan.intervalCount)}
                      </span>
                    </div>
                    {plan.trialDays && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {plan.trialDays}-day free trial included
                      </p>
                    )}
                    <button
                      className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      onClick={() => handleCheckout(plan.priceId)}
                      disabled={!!actionLoading}
                    >
                      {actionLoading === plan.priceId ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ExternalLink className="h-4 w-4" />
                      )}
                      Get {plan.name}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <p className="text-xs text-muted-foreground">
            Payments are securely processed by Stripe. We never store your card
            details.
          </p>
        </>
      )}
    </div>
  )
}
