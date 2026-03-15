import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import * as Tabs from '@radix-ui/react-tabs'
import {
  Sun, Moon, ShieldCheck, MailCheck, Monitor, Smartphone, Key, CreditCard, Check,
  Globe, Plus, Copy,
} from 'lucide-react'
import { useAuth } from '@/app/store/@system/auth'
import { cn } from '@/app/lib/@system/utils'

// ---- Avatar -----------------------------------------------------------------

function getInitials(name, email) {
  if (name) {
    const parts = name.trim().split(/\s+/)
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase()
  }
  return email ? email[0].toUpperCase() : '?'
}

function Avatar({ name, email, size = 'lg' }) {
  const initials = getInitials(name, email)
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-primary/10 text-primary font-semibold select-none shrink-0',
        size === 'lg' ? 'h-16 w-16 text-xl' : 'h-10 w-10 text-sm'
      )}
      aria-hidden="true"
    >
      {initials}
    </div>
  )
}

// ---- Profile ----------------------------------------------------------------

function ProfileSection({ user }) {
  const [name, setName] = useState(user?.name || '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const token = localStorage.getItem('app_jwt')
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: name.trim() }),
      })
      setMessage({ ok: res.ok, text: res.ok ? 'Profile updated.' : 'Failed to update profile.' })
    } catch {
      setMessage({ ok: false, text: 'Something went wrong. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-6 max-w-md">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <Avatar name={user?.name} email={user?.email} size="lg" />
          <div>
            <p className="text-sm font-medium text-foreground">{user?.name || 'No name set'}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
            <div className="flex items-center gap-3 mt-1.5">
              {user?.emailVerified ? (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                  <MailCheck className="h-3 w-3" />
                  Email verified
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">Email not verified</span>
              )}
              {user?.role && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <ShieldCheck className="h-3 w-3" />
                  {user.role}
                </span>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Email</label>
            <input
              type="email"
              disabled
              value={user?.email || ''}
              className="w-full rounded-lg border border-input bg-muted px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">Email address cannot be changed here.</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="profile-name" className="text-sm font-medium text-foreground">
              Name
            </label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Your name"
            />
          </div>

          {message && (
            <p className={cn('text-sm', message.ok ? 'text-muted-foreground' : 'text-destructive')}>
              {message.text}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </form>
      </div>

      {/* Danger zone */}
      <DangerZoneSection />
    </div>
  )
}

// ---- Danger zone ------------------------------------------------------------

function DangerZoneSection() {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      const token = localStorage.getItem('app_jwt')
      await fetch('/api/users/me', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      localStorage.clear()
      window.location.href = '/login'
    } catch {
      setDeleting(false)
      setConfirming(false)
    }
  }

  async function handleExport() {
    setExportLoading(true)
    try {
      const token = localStorage.getItem('app_jwt')
      const res = await fetch('/api/users/me/export', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'my-data.json'
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch {
      // no-op — export is best-effort
    } finally {
      setExportLoading(false)
    }
  }

  return (
    <div className="max-w-md space-y-4 pt-6 border-t border-border">
      <div>
        <h3 className="text-sm font-semibold text-destructive">Danger zone</h3>
        <p className="text-xs text-muted-foreground mt-0.5">These actions are permanent and cannot be undone.</p>
      </div>

      {/* Export data */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between rounded-xl border border-border bg-card p-4">
        <div>
          <p className="text-sm font-medium text-foreground">Export my data</p>
          <p className="text-xs text-muted-foreground mt-0.5">Download a copy of your account data as JSON.</p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={exportLoading}
          className="self-start shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50 transition-colors"
        >
          {exportLoading ? 'Exporting...' : 'Export'}
        </button>
      </div>

      {/* Delete account */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        <div>
          <p className="text-sm font-medium text-foreground">Delete account</p>
          <p className="text-xs text-muted-foreground mt-0.5">Permanently remove your account and all associated data.</p>
        </div>
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="self-start shrink-0 rounded-lg border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
          >
            Delete account
          </button>
        ) : (
          <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
            <p className="text-xs font-medium text-destructive">Are you sure?</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 transition-colors"
              >
                {deleting ? 'Deleting...' : 'Yes, delete'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ---- Password strength meter ------------------------------------------------

/**
 * PasswordStrengthMeter — visual strength indicator for a password input.
 * Scores 0–5 based on length, uppercase, digits, and symbols.
 *
 * Usage:
 *   <PasswordStrengthMeter password={value} />
 */
function getPasswordStrength(pw) {
  if (!pw) return 0
  let score = 0
  if (pw.length >= 8)            score++
  if (pw.length >= 12)           score++
  if (/[A-Z]/.test(pw))         score++
  if (/[0-9]/.test(pw))         score++
  if (/[^A-Za-z0-9]/.test(pw))  score++
  return score // 0–5
}

const STRENGTH_LABELS  = ['', 'Very weak', 'Weak', 'Fair', 'Strong', 'Very strong']
const STRENGTH_CLASSES = ['', 'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500', 'bg-emerald-500']

function PasswordStrengthMeter({ password }) {
  const strength = getPasswordStrength(password)
  if (!password) return null
  return (
    <div className="space-y-1.5 pt-1">
      <div className="flex gap-1" role="meter" aria-valuenow={strength} aria-valuemin={0} aria-valuemax={5} aria-label="Password strength">
        {[1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors duration-300',
              i <= strength ? STRENGTH_CLASSES[strength] : 'bg-muted'
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{STRENGTH_LABELS[strength]}</p>
    </div>
  )
}

// ---- Security — password ----------------------------------------------------

function PasswordSection() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (next !== confirm) {
      setMessage({ ok: false, text: 'New passwords do not match.' })
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      const token = localStorage.getItem('app_jwt')
      const res = await fetch('/api/users/me/password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ current_password: current, new_password: next }),
      })
      if (res.ok) {
        setMessage({ ok: true, text: 'Password updated successfully.' })
        setCurrent('')
        setNext('')
        setConfirm('')
      } else {
        const data = await res.json().catch(() => ({}))
        setMessage({ ok: false, text: data.message || 'Failed to update password.' })
      }
    } catch {
      setMessage({ ok: false, text: 'Something went wrong. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-md">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Change password</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Use a strong, unique password for your account.</p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="current-pw" className="text-sm font-medium text-foreground">
          Current password
        </label>
        <input
          id="current-pw"
          type="password"
          required
          autoComplete="current-password"
          value={current}
          onChange={e => setCurrent(e.target.value)}
          className={inputClass}
          placeholder="••••••••"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="new-pw" className="text-sm font-medium text-foreground">
          New password
        </label>
        <input
          id="new-pw"
          type="password"
          required
          autoComplete="new-password"
          value={next}
          onChange={e => setNext(e.target.value)}
          className={inputClass}
          placeholder="••••••••"
        />
        <PasswordStrengthMeter password={next} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="confirm-pw" className="text-sm font-medium text-foreground">
          Confirm new password
        </label>
        <input
          id="confirm-pw"
          type="password"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          className={inputClass}
          placeholder="••••••••"
        />
      </div>

      {message && (
        <p className={cn('text-sm', message.ok ? 'text-muted-foreground' : 'text-destructive')}>
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {saving ? 'Updating...' : 'Update password'}
      </button>
    </form>
  )
}

// ---- Security — sessions ----------------------------------------------------

/**
 * SessionsSection — lists active sessions and allows revoking other devices.
 *
 * @custom: replace MOCK_SESSIONS with a real API call to GET /api/sessions
 */
const DEVICE_ICONS = { mobile: Smartphone, desktop: Monitor }

const MOCK_SESSIONS = [
  { id: '1', device: 'Chrome on macOS', type: 'desktop', location: 'Current location', lastSeen: 'Now', current: true },
  { id: '2', device: 'Safari on iPhone', type: 'mobile', location: 'Unknown location', lastSeen: '2 hours ago', current: false },
]

function SessionsSection() {
  const [sessions, setSessions] = useState(MOCK_SESSIONS)
  const [revoking, setRevoking] = useState(false)

  const otherSessions = sessions.filter(s => !s.current)

  async function revokeAll() {
    setRevoking(true)
    try {
      const token = localStorage.getItem('app_jwt')
      await fetch('/api/sessions', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      setSessions(prev => prev.filter(s => s.current))
    } catch {
      // silent — UI optimism; re-fetch on page reload
    } finally {
      setRevoking(false)
    }
  }

  return (
    <div className="space-y-5 max-w-md pt-6 border-t border-border">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Active sessions</h3>
        <p className="text-xs text-muted-foreground mt-0.5">These devices are currently signed in to your account.</p>
      </div>

      <div className="space-y-2">
        {sessions.map(s => {
          const DeviceIcon = DEVICE_ICONS[s.type] || Monitor
          return (
            <div key={s.id} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="rounded-lg bg-accent p-2 shrink-0">
                  <DeviceIcon className="h-4 w-4 text-accent-foreground" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{s.device}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.location} &middot; {s.lastSeen}</p>
                </div>
              </div>
              {s.current && (
                <span className="shrink-0 text-xs font-medium text-emerald-600 dark:text-emerald-400">Current</span>
              )}
            </div>
          )
        })}
      </div>

      {otherSessions.length > 0 && (
        <button
          type="button"
          onClick={revokeAll}
          disabled={revoking}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50 transition-colors"
        >
          {revoking ? 'Signing out...' : `Sign out ${otherSessions.length === 1 ? 'other device' : `${otherSessions.length} other devices`}`}
        </button>
      )}
    </div>
  )
}

// ---- Security — two-factor auth ---------------------------------------------

/**
 * TwoFactorSection — UI for enabling/disabling TOTP-based 2FA.
 *
 * @custom: wire up to your 2FA API (e.g., TOTP via speakeasy or otplib on the server).
 *   - On enable: POST /api/users/me/2fa/setup  → returns { qr_url, secret }
 *   - On verify: POST /api/users/me/2fa/verify → body { code }
 *   - On disable: DELETE /api/users/me/2fa
 */
function TwoFactorSection() {
  const [enabled, setEnabled]     = useState(false)
  const [showSetup, setShowSetup] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [code, setCode]           = useState('')

  function handleToggle() {
    if (enabled) {
      // @custom: call DELETE /api/users/me/2fa
      setEnabled(false)
    } else {
      setShowSetup(true)
    }
  }

  async function handleVerify(e) {
    e.preventDefault()
    setVerifying(true)
    try {
      // @custom: verify code with API
      // const res = await fetch('/api/users/me/2fa/verify', { method: 'POST', ... })
      await new Promise(r => setTimeout(r, 800)) // stub
      setEnabled(true)
      setShowSetup(false)
      setCode('')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="max-w-md space-y-4 pt-6 border-t border-border">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Two-factor authentication</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Add an extra layer of security to your account.</p>
      </div>

      {/* Authenticator app row */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-accent p-2 shrink-0">
              <Smartphone className="h-4 w-4 text-accent-foreground" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Authenticator app</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {enabled ? 'Configured and active.' : 'Use Google Authenticator, Authy, or similar.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleToggle}
            className={cn(
              'shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
              enabled
                ? 'border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground'
                : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            {enabled ? 'Disable' : 'Enable'}
          </button>
        </div>

        {/* Setup flow */}
        {showSetup && (
          <div className="mt-4 pt-4 border-t border-border space-y-4">
            {/* QR code placeholder */}
            <div className="flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 h-32">
              {/* @custom: render QR code from API here, e.g. <img src={qrUrl} /> */}
              <div className="text-center">
                <Key className="h-6 w-6 text-muted-foreground mx-auto mb-2" aria-hidden="true" />
                <p className="text-xs text-muted-foreground">QR code appears here</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">@custom: use your TOTP library</p>
              </div>
            </div>
            <form onSubmit={handleVerify} className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="totp-code" className="text-sm font-medium text-foreground">
                  Verification code
                </label>
                <input
                  id="totp-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  autoComplete="one-time-code"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring tracking-[0.3em] font-mono"
                  placeholder="000000"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowSetup(false); setCode('') }}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verifying || code.length < 6}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {verifying ? 'Verifying...' : 'Verify and enable'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Backup codes — shown once 2FA is enabled */}
      {enabled && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-accent p-2 shrink-0">
                <Key className="h-4 w-4 text-accent-foreground" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Backup codes</p>
                <p className="text-xs text-muted-foreground mt-0.5">Use these if you lose access to your authenticator.</p>
              </div>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              View codes
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ---- Security — connected accounts -----------------------------------------

/**
 * ConnectedAccountsSection — lists OAuth providers and lets users connect/disconnect.
 *
 * @custom: on mount, fetch connected providers from GET /api/users/me/connections.
 *   - Connect:    window.location.href = '/api/auth/{provider}'
 *   - Disconnect: DELETE /api/users/me/connections/{provider}
 */
const OAUTH_PROVIDERS = [
  { id: 'google', label: 'Google', description: 'Sign in faster with your Google account.' },
  { id: 'github', label: 'GitHub', description: 'Sign in faster with your GitHub account.' },
]

function ConnectedAccountsSection() {
  // @custom: replace with real data — GET /api/users/me/connections → string[]
  const [connected, setConnected] = useState([])
  const [loading, setLoading] = useState(null) // provider id being toggled

  async function disconnect(providerId) {
    setLoading(providerId)
    try {
      const token = localStorage.getItem('app_jwt')
      await fetch(`/api/users/me/connections/${providerId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      setConnected(prev => prev.filter(p => p !== providerId))
    } catch {
      // silent — re-fetch on next page load
    } finally {
      setLoading(null)
    }
  }

  function connect(providerId) {
    window.location.href = `/api/auth/${providerId}`
  }

  return (
    <div className="max-w-md space-y-4 pt-6 border-t border-border">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Connected accounts</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Link social accounts for faster sign-in.</p>
      </div>
      <div className="space-y-2">
        {OAUTH_PROVIDERS.map(({ id, label, description }) => {
          const isConnected = connected.includes(id)
          return (
            <div key={id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-accent p-2 shrink-0">
                    <Globe className="h-4 w-4 text-accent-foreground" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => isConnected ? disconnect(id) : connect(id)}
                  disabled={loading === id}
                  className={cn(
                    'shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50',
                    isConnected
                      ? 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
                      : 'border-primary/40 text-primary hover:bg-primary/5'
                  )}
                >
                  {loading === id ? '...' : isConnected ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---- Security — API keys ----------------------------------------------------

/**
 * ApiKeysSection — generate and revoke personal API keys.
 *
 * @custom: wire up to your API:
 *   - GET    /api/users/me/api-keys       → list keys (never return plaintext values)
 *   - POST   /api/users/me/api-keys       → { name } → { key: { id, name, prefix, created_at }, plaintext }
 *   - DELETE /api/users/me/api-keys/{id}  → revoke key
 *
 * Example:
 *   <ApiKeysSection />
 */
function ApiKeysSection() {
  // @custom: fetch existing keys on mount — GET /api/users/me/api-keys
  const [keys, setKeys] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [generating, setGenerating] = useState(false)
  const [revealedKey, setRevealedKey] = useState(null) // { id, value } — shown once
  const [copied, setCopied] = useState(false)

  async function handleGenerate(e) {
    e.preventDefault()
    if (!keyName.trim()) return
    setGenerating(true)
    try {
      // @custom: POST /api/users/me/api-keys { name: keyName.trim() }
      // const { key, plaintext } = await res.json()
      // Stub — replace with real API call:
      const id = Date.now().toString()
      const prefix = 'sk_' + Math.random().toString(36).slice(2, 7)
      const plaintext = prefix + Math.random().toString(36).slice(2, 34)
      const stub = { id, name: keyName.trim(), prefix, created_at: new Date().toISOString(), last_used: null }
      setKeys(prev => [stub, ...prev])
      setRevealedKey({ id, value: plaintext })
      setKeyName('')
      setShowCreate(false)
      setCopied(false)
    } finally {
      setGenerating(false)
    }
  }

  function handleCopy() {
    if (!revealedKey) return
    navigator.clipboard.writeText(revealedKey.value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleRevoke(id) {
    // @custom: DELETE /api/users/me/api-keys/{id}
    setKeys(prev => prev.filter(k => k.id !== id))
    if (revealedKey?.id === id) setRevealedKey(null)
  }

  const inputClass =
    'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <div className="max-w-md space-y-4 pt-6 border-t border-border">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">API keys</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Authenticate with the API using personal keys.</p>
        </div>
        <button
          type="button"
          onClick={() => { setShowCreate(s => !s); setKeyName('') }}
          className="shrink-0 flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          New key
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleGenerate} className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="api-key-name" className="text-sm font-medium text-foreground">
              Key name
            </label>
            <input
              id="api-key-name"
              type="text"
              required
              autoFocus
              value={keyName}
              onChange={e => setKeyName(e.target.value)}
              placeholder="e.g. My integration"
              className={inputClass}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={generating || !keyName.trim()}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {generating ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </form>
      )}

      {/* One-time reveal — copy now */}
      {revealedKey && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
            Copy your key now — it will not be shown again.
          </p>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
            <code className="flex-1 text-xs font-mono text-foreground truncate select-all">
              {revealedKey.value}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {copied
                ? <><Check className="h-3 w-3 text-emerald-500" aria-hidden="true" /> Copied</>
                : <><Copy className="h-3 w-3" aria-hidden="true" /> Copy</>
              }
            </button>
          </div>
          <button
            type="button"
            onClick={() => setRevealedKey(null)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Keys list */}
      {keys.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center rounded-xl border border-dashed border-border">
          <Key className="h-5 w-5 text-muted-foreground mb-2" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">No API keys yet</p>
          <p className="text-xs text-muted-foreground mt-1">Generate a key to access the API programmatically.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map(k => (
            <div key={k.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              <div className="rounded-lg bg-accent p-2 shrink-0">
                <Key className="h-4 w-4 text-accent-foreground" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{k.name}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {k.prefix}{'•••'}
                  {' · '}
                  {'Created '}
                  {new Date(k.created_at).toLocaleDateString()}
                  {k.last_used && ` · Last used ${new Date(k.last_used).toLocaleDateString()}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRevoke(k.id)}
                className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                aria-label={`Revoke key "${k.name}"`}
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SecuritySection() {
  return (
    <div className="space-y-8">
      <PasswordSection />
      <SessionsSection />
      <TwoFactorSection />
      <ConnectedAccountsSection />
      <ApiKeysSection />
    </div>
  )
}

// ---- Notifications ----------------------------------------------------------

const NOTIFICATION_ITEMS = [
  {
    key: 'email_updates',
    label: 'Product updates',
    description: 'Receive release notes and feature announcements.',
  },
  {
    key: 'security_alerts',
    label: 'Security alerts',
    description: 'Get notified about sign-ins and security events.',
  },
  {
    key: 'marketing',
    label: 'Tips and offers',
    description: 'Occasional tips, guides, and promotional content.',
  },
]

function NotificationsSection() {
  const [prefs, setPrefs] = useState(() =>
    Object.fromEntries(NOTIFICATION_ITEMS.map(p => [p.key, true]))
  )
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  function toggle(key) {
    setPrefs(p => ({ ...p, [key]: !p[key] }))
  }

  async function handleSave() {
    setSaving(true)
    setMessage(null)
    try {
      const token = localStorage.getItem('app_jwt')
      const res = await fetch('/api/users/me/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(prefs),
      })
      setMessage({ ok: res.ok, text: res.ok ? 'Preferences saved.' : 'Failed to save preferences.' })
    } catch {
      setMessage({ ok: false, text: 'Something went wrong. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5 max-w-md">
      <div className="space-y-3">
        {NOTIFICATION_ITEMS.map(({ key, label, description }) => (
          <div
            key={key}
            className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-4"
          >
            <div>
              <p className="text-sm font-medium text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs[key]}
              onClick={() => toggle(key)}
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
                prefs[key] ? 'bg-primary' : 'bg-muted'
              )}
            >
              <span
                className={cn(
                  'pointer-events-none block h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
                  prefs[key] ? 'translate-x-5' : 'translate-x-0.5'
                )}
              />
            </button>
          </div>
        ))}
      </div>

      {message && (
        <p className={cn('text-sm', message.ok ? 'text-muted-foreground' : 'text-destructive')}>
          {message.text}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {saving ? 'Saving...' : 'Save preferences'}
      </button>
    </div>
  )
}

// ---- Appearance -------------------------------------------------------------

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark',  label: 'Dark',  Icon: Moon },
]

function AppearanceSection() {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'light' || stored === 'dark') return stored
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  function applyTheme(value) {
    document.documentElement.classList.toggle('dark', value === 'dark')
    localStorage.setItem('theme', value)
    setTheme(value)
  }

  return (
    <div className="space-y-5 max-w-md">
      <div>
        <p className="text-sm font-medium text-foreground mb-1">Theme</p>
        <p className="text-xs text-muted-foreground mb-4">Choose your preferred color scheme.</p>
        <div className="grid grid-cols-2 gap-3">
          {THEME_OPTIONS.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => applyTheme(value)}
              className={cn(
                'flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition-colors',
                theme === value
                  ? 'border-primary bg-primary/5 text-foreground'
                  : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {label}
              {theme === value && (
                <span className="text-xs text-primary font-normal">Active</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---- Billing ----------------------------------------------------------------

/**
 * BillingSection — plan overview, upgrade CTA, and billing history placeholder.
 *
 * @custom: replace CURRENT_PLAN with data from your auth/billing context.
 *   handleUpgrade should create a Stripe Checkout session:
 *   POST /api/billing/checkout → { url } → window.location.href = url
 */
const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'For individuals getting started.',
    features: ['Up to 3 projects', '1 team member', 'Basic analytics', 'Community support'],
    highlighted: false,
    cta: null,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$19',
    period: 'per month',
    description: 'For growing teams that need more.',
    features: ['Unlimited projects', 'Up to 10 team members', 'Advanced analytics', 'Priority support', 'API access'],
    highlighted: true,
    cta: 'Upgrade to Pro',
  },
]

// @custom: replace with current plan from your auth/billing context
const CURRENT_PLAN_ID = 'free'

function BillingSection() {
  const [upgrading, setUpgrading] = useState(false)

  async function handleUpgrade(planId) {
    setUpgrading(true)
    try {
      // @custom: create a Stripe Checkout session and redirect
      // const res = await fetch('/api/billing/checkout', { method: 'POST', ... })
      // const { url } = await res.json()
      // window.location.href = url
      await new Promise(r => setTimeout(r, 800)) // stub
    } finally {
      setUpgrading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      {/* Current plan summary */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Current plan</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-semibold text-foreground capitalize">{CURRENT_PLAN_ID}</span>
              {CURRENT_PLAN_ID === 'free' && (
                <span className="text-xs text-muted-foreground">— Free forever</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Active</span>
          </div>
        </div>
      </div>

      {/* Plan comparison */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {PLANS.map(plan => (
          <div
            key={plan.id}
            className={cn(
              'rounded-xl border bg-card p-5 flex flex-col',
              plan.highlighted ? 'border-primary/40' : 'border-border',
              CURRENT_PLAN_ID === plan.id && 'ring-1 ring-primary/20'
            )}
          >
            {plan.highlighted && (
              <span className="self-start rounded-full bg-primary/10 text-primary text-xs font-semibold px-2.5 py-0.5 mb-3">
                Most popular
              </span>
            )}
            <p className="text-sm font-semibold text-foreground">{plan.name}</p>
            <div className="flex items-baseline gap-1 mt-1 mb-1">
              <span className="text-2xl font-bold text-foreground">{plan.price}</span>
              <span className="text-xs text-muted-foreground">/{plan.period}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">{plan.description}</p>
            <ul className="space-y-2 flex-1 mb-5">
              {plan.features.map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
            {CURRENT_PLAN_ID === plan.id ? (
              <div className="rounded-lg border border-border px-4 py-2 text-center text-sm font-medium text-muted-foreground">
                Current plan
              </div>
            ) : plan.cta ? (
              <button
                type="button"
                onClick={() => handleUpgrade(plan.id)}
                disabled={upgrading}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {upgrading ? 'Redirecting...' : plan.cta}
              </button>
            ) : null}
          </div>
        ))}
      </div>

      {/* Billing history */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Billing history</h3>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <CreditCard className="h-6 w-6 text-muted-foreground mb-2" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">No billing history yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Invoices will appear here after your first payment.</p>
        </div>
      </div>
    </div>
  )
}

// ---- Preferences ------------------------------------------------------------

/**
 * PreferencesSection — locale and display preferences (language, timezone, date format).
 *
 * Persists to localStorage. @custom: also send to API:
 *   PATCH /api/users/me/preferences  { language, timezone, date_format }
 *
 * Example:
 *   <PreferencesSection />
 */
const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'pt', label: 'Português' },
  { value: 'de', label: 'Deutsch' },
]

const TIMEZONES = [
  { value: 'UTC',                  label: 'UTC — Coordinated Universal Time' },
  { value: 'America/New_York',     label: 'Eastern Time (ET)' },
  { value: 'America/Chicago',      label: 'Central Time (CT)' },
  { value: 'America/Denver',       label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles',  label: 'Pacific Time (PT)' },
  { value: 'Europe/London',        label: 'London (GMT/BST)' },
  { value: 'Europe/Paris',         label: 'Paris (CET/CEST)' },
  { value: 'Europe/Lisbon',        label: 'Lisbon (WET/WEST)' },
  { value: 'Asia/Tokyo',           label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai',        label: 'Shanghai (CST)' },
  { value: 'Australia/Sydney',     label: 'Sydney (AEST/AEDT)' },
]

const DATE_FORMATS = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY  (e.g. 03/09/2026)' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY  (e.g. 09/03/2026)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD  (e.g. 2026-03-09)' },
  { value: 'D MMM YYYY', label: 'D MMM YYYY  (e.g. 9 Mar 2026)' },
]

function PreferencesSection() {
  const [language, setLanguage] = useState(
    () => localStorage.getItem('pref_language') || 'en'
  )
  const [timezone, setTimezone] = useState(() => {
    const stored = localStorage.getItem('pref_timezone')
    if (stored) return stored
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone
    return TIMEZONES.some(t => t.value === detected) ? detected : 'UTC'
  })
  const [dateFormat, setDateFormat] = useState(
    () => localStorage.getItem('pref_date_format') || 'MM/DD/YYYY'
  )
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  async function handleSave() {
    setSaving(true)
    setMessage(null)
    try {
      localStorage.setItem('pref_language', language)
      localStorage.setItem('pref_timezone', timezone)
      localStorage.setItem('pref_date_format', dateFormat)
      // @custom: persist to API
      // const token = localStorage.getItem('app_jwt')
      // await fetch('/api/users/me/preferences', {
      //   method: 'PATCH',
      //   headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      //   body: JSON.stringify({ language, timezone, date_format: dateFormat }),
      // })
      setMessage({ ok: true, text: 'Preferences saved.' })
    } catch {
      setMessage({ ok: false, text: 'Something went wrong. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  const selectClass =
    'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <div className="space-y-6 max-w-md">
      <div className="space-y-5">

        {/* Language */}
        <div className="space-y-1.5">
          <label htmlFor="pref-language" className="text-sm font-medium text-foreground">
            Language
          </label>
          <select
            id="pref-language"
            value={language}
            onChange={e => setLanguage(e.target.value)}
            className={selectClass}
          >
            {LANGUAGES.map(l => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">Language used throughout the interface.</p>
        </div>

        {/* Timezone */}
        <div className="space-y-1.5">
          <label htmlFor="pref-timezone" className="text-sm font-medium text-foreground">
            Time zone
          </label>
          <select
            id="pref-timezone"
            value={timezone}
            onChange={e => setTimezone(e.target.value)}
            className={selectClass}
          >
            {TIMEZONES.map(tz => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">All dates and times will use this time zone.</p>
        </div>

        {/* Date format */}
        <div className="space-y-1.5">
          <label htmlFor="pref-date-format" className="text-sm font-medium text-foreground">
            Date format
          </label>
          <select
            id="pref-date-format"
            value={dateFormat}
            onChange={e => setDateFormat(e.target.value)}
            className={selectClass}
          >
            {DATE_FORMATS.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>

      </div>

      {message && (
        <p className={cn('text-sm', message.ok ? 'text-muted-foreground' : 'text-destructive')}>
          {message.text}
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {saving ? 'Saving...' : 'Save preferences'}
      </button>
    </div>
  )
}

// ---- Page -------------------------------------------------------------------

const TABS = [
  { value: 'profile',       label: 'Profile' },
  { value: 'security',      label: 'Security' },
  { value: 'notifications', label: 'Notifications' },
  { value: 'appearance',    label: 'Appearance' },
  { value: 'preferences',   label: 'Preferences' },
  { value: 'billing',       label: 'Billing' },
]

export default function Settings() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  // Sync active tab with URL query param (?tab=...)
  // This makes links like /settings?tab=notifications work correctly.
  const activeTab = TABS.some(t => t.value === searchParams.get('tab'))
    ? searchParams.get('tab')
    : 'profile'

  function handleTabChange(value) {
    setSearchParams(value === 'profile' ? {} : { tab: value }, { replace: true })
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Settings</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Manage your account and preferences.
        </p>
      </div>

      <Tabs.Root value={activeTab} onValueChange={handleTabChange}>
        <Tabs.List
          className="flex gap-0 overflow-x-auto scroll-smooth scrollbar-hide border-b border-border mb-6"
          aria-label="Settings sections"
        >
          {TABS.map(({ value, label }) => (
            <Tabs.Trigger
              key={value}
              value={value}
              className={cn(
                'shrink-0 whitespace-nowrap px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors border-b-2 border-transparent -mb-px',
                'hover:text-foreground',
                'data-[state=active]:border-primary data-[state=active]:text-foreground'
              )}
            >
              {label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="profile">
          <ProfileSection user={user} />
        </Tabs.Content>

        <Tabs.Content value="security">
          <SecuritySection />
        </Tabs.Content>

        <Tabs.Content value="notifications">
          <NotificationsSection />
        </Tabs.Content>

        <Tabs.Content value="appearance">
          <AppearanceSection />
        </Tabs.Content>

        <Tabs.Content value="preferences">
          <PreferencesSection />
        </Tabs.Content>

        <Tabs.Content value="billing">
          <BillingSection />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  )
}
