import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Github, CheckCircle2, XCircle } from 'lucide-react'
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

export default function Register() {
  const navigate = useNavigate()

  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function set(field) {
    return e => setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirm) {
      setError('Passwords do not match')
      return
    }

    const { isValid } = validatePassword(form.password)
    if (!isValid) {
      setError('Password does not meet requirements')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Registration failed')
        return
      }
      navigate('/login?registered=1')
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-foreground">Create account</h1>
          <p className="mt-1 text-sm text-muted-foreground">Fill in your details to get started</p>
        </div>

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
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              type="text"
              required
              autoComplete="name"
              value={form.name}
              onChange={set('name')}
              placeholder="Your name"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={set('email')}
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              autoComplete="new-password"
              value={form.password}
              onChange={set('password')}
              placeholder="••••••••"
            />
            <PasswordStrength password={form.password} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              type="password"
              required
              autoComplete="new-password"
              value={form.confirm}
              onChange={set('confirm')}
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Creating account...' : 'Create account'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-foreground hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
