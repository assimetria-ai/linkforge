// @system — route guard that redirects unauthenticated users to /login
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthContext } from '@/app/store/@system/auth'
import { Spinner } from '../Loading/Spinner'
import { EmailVerificationBanner } from '../EmailVerificationBanner/EmailVerificationBanner'

function resolveOnboardingPath(status) {
  if (!status.has_brand) return '/app/onboarding/brand'
  if (!status.has_subscription) return '/app/onboarding/plan'
  if (!status.completed) return '/app/onboarding/setup'
  return null
}

export function ProtectedRoute({ children, role }) {
  const { user, loading, onboardingStatus, onboardingLoading, isAuthenticated } = useAuthContext()
  const location = useLocation()

  if (loading || onboardingLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  const onboardingTarget = resolveOnboardingPath(onboardingStatus)
  const isOnboardingRoute = location.pathname.startsWith('/app/onboarding')

  if (onboardingTarget && location.pathname !== onboardingTarget) {
    return <Navigate to={onboardingTarget} replace />
  }

  if (!onboardingTarget && isOnboardingRoute) {
    return <Navigate to="/app" replace />
  }

  if (role === 'admin' && user?.role !== 'admin') {
    return <Navigate to="/app" replace />
  }

  return (
    <>
      <EmailVerificationBanner />
      {children}
    </>
  )
}
