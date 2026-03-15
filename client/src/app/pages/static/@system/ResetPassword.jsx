import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/app/components/@system/ui/button'
import { Input } from '@/app/components/@system/ui/input'
import { Label } from '@/app/components/@system/ui/label'

function validatePassword(password) {
  const checks = {
    length: password.length >= 8 && password.length <= 128,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    digit: /\d/.test(password),
  }
  return { checks, isValid: Object.values(checks).every(Boolean) }
}

function PasswordStrength({ password }) {
  if (!password) return null
  const { checks } = validatePassword(password)
  const requirements = [
    { key: 'length', label: '8+ characters', met: checks.length },
    { key: 'uppercase', label: 'Uppercase letter', met: checks.uppercase },
    { key: 'lowercase', label: 'Lowercase letter', met: checks.lowercase },
    { key: 'digit', label: 'Number', met: checks.digit },
  ]
  return (
    <div className="space-y-1 mt-2">
      {requirements.map(req => (
        <div key={req.key} className="flex items-center gap-2 text-xs">
          {req.met
            ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            : <XCircle className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />}
          <span className={req.met ? 'text-emerald-500' : 'text-muted-foreground'}>{req.label}</span>
        </div>
      ))}
    </div>
  )
}

export default function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    const { isValid } = validatePassword(password)
    if (!isValid) {
      setError('Password does not meet requirements')
      return
    }

    if (!token) {
      setError('Invalid or missing reset token')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/users/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Failed to reset password')
        return
      }
      navigate('/login?reset=1')
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft size={14} />
            Back to sign in
          </Link>
          <h1 className="text-2xl font-semibold text-foreground">Set new password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a strong password for your account
          </p>
        </div>

        {!token ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-4 text-sm text-destructive">
            Invalid reset link. Please request a new one.{' '}
            <Link to="/forgot-password" className="underline">
              Request reset
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <PasswordStrength password={password} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type="password"
                required
                autoComplete="new-password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Updating password...' : 'Update password'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
