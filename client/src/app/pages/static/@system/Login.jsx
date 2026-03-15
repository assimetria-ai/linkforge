import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Github } from 'lucide-react'
import { useAuth } from '@/app/store/@system/auth'
import { Button } from '@/app/components/@system/ui/button'
import { Input } from '@/app/components/@system/ui/input'
import { Label } from '@/app/components/@system/ui/label'
import { csrfHeaders } from '@/app/lib/@system/csrf'

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

function LinkedInIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" fill="#0A66C2"/>
    </svg>
  )
}

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(searchParams.get('error') || '')
  const [loading, setLoading] = useState(false)

  // TOTP MFA state
  const [totpStep, setTotpStep] = useState(false)
  const [totpSessionToken, setTotpSessionToken] = useState('')
  const [totpCode, setTotpCode] = useState('')

  const resetSuccess = searchParams.get('reset') === '1'
  const registeredSuccess = searchParams.get('registered') === '1'

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: await csrfHeaders(),
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Invalid credentials')
        return
      }
      if (data.mfaRequired) {
        setTotpSessionToken(data.totpSessionToken)
        setTotpStep(true)
        return
      }
      await login(data.token)
      navigate('/')
    } catch (err) {
      setError(
        err instanceof TypeError
          ? 'Network error. Please check your connection and try again.'
          : 'Something went wrong. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleTotpSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/sessions/totp/verify', {
        method: 'POST',
        headers: await csrfHeaders(),
        body: JSON.stringify({ totpSessionToken, code: totpCode }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Invalid code')
        return
      }
      await login(data.token)
      navigate('/')
    } catch (err) {
      setError(
        err instanceof TypeError
          ? 'Network error. Please check your connection and try again.'
          : 'Something went wrong. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  function handleOAuth(provider) {
    window.location.href = `/api/auth/${provider}`
  }

  if (totpStep) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold text-foreground">Two-factor authentication</h1>
            <p className="mt-1 text-sm text-muted-foreground">Enter the code from your authenticator app</p>
          </div>

          <form onSubmit={handleTotpSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="totp-code">Authenticator code</Label>
              <Input
                id="totp-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={6}
                value={totpCode}
                onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                className="tracking-widest text-center"
                placeholder="000000"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={loading || totpCode.length !== 6} className="w-full">
              {loading ? 'Verifying...' : 'Verify'}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => { setTotpStep(false); setTotpCode(''); setError('') }}
            className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to sign in
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-foreground">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">Enter your credentials to continue</p>
        </div>

        {resetSuccess && (
          <div className="mb-4 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-foreground">
            Password updated. You can sign in with your new password.
          </div>
        )}

        {registeredSuccess && (
          <div className="mb-4 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-foreground">
            Account created. Check your email to verify, then sign in.
          </div>
        )}

        <div className="space-y-3 mb-6">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => handleOAuth('google')}
          >
            <GoogleIcon />
            Continue with Google
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => handleOAuth('github')}
          >
            <Github size={16} />
            Continue with GitHub
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => handleOAuth('linkedin')}
          >
            <LinkedInIcon />
            Continue with LinkedIn
          </Button>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-background px-2 text-muted-foreground">or continue with email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                to="/forgot-password"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-medium text-foreground hover:underline">
            Create account
          </Link>
        </p>
      </div>
    </div>
  )
}
