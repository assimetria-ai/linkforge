import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/app/store/@system/auth'

/** Handles OAuth redirect: /auth/oauth/callback?token=<session_token> */
export default function OAuthCallback() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    const oauthError = params.get('error')
    if (token) {
      login(token)
        .then(() => navigate('/', { replace: true }))
        .catch(() => setError('Sign-in failed. Please try again.'))
    } else if (oauthError) {
      navigate(`/login?error=${encodeURIComponent(oauthError)}`, { replace: true })
    } else {
      navigate('/login', { replace: true })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <p className="text-sm text-destructive">{error}</p>
          <Link
            to="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return null
}
