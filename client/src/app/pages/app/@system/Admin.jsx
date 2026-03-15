import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Shield, Users, BarChart2, Settings, Search, ChevronLeft, ChevronRight,
  Trash2, AlertCircle, RefreshCw, CheckCircle, XCircle,
} from 'lucide-react'
import { cn } from '@/app/lib/@system/utils'
import { apiFetch } from '@/app/lib/@system/api'
import { useAuth } from '@/app/store/@system/auth'

// ── Helpers ───────────────────────────────────────────────────────────────────

function getToken() {
  return localStorage.getItem('app_jwt')
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function TabButton({ active, onClick, icon: Icon, children }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-medium transition-colors',
        active
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {children}
    </button>
  )
}

function MetricCard({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-foreground tabular-nums">
        {value ?? <span className="h-8 w-16 inline-block animate-pulse rounded bg-muted" />}
      </p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

function ErrorBanner({ message, onDismiss }) {
  if (!message) return null
  return (
    <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
      <AlertCircle className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
      <p className="flex-1 text-sm text-destructive">{message}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss"
        >
          <XCircle className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

// ── Users tab ─────────────────────────────────────────────────────────────────

function UsersTab({ currentUserId }) {
  const [users, setUsers]         = useState([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [search, setSearch]       = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [actionError, setActionError] = useState(null)
  const [pendingId, setPendingId] = useState(null)

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(t)
  }, [search])

  const loadUsers = useCallback(async (page = 1) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page, limit: 20 })
      if (debouncedSearch) params.set('search', debouncedSearch)
      const res = await fetch(`/api/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (!res.ok) throw new Error('Failed to load users.')
      const data = await res.json()
      setUsers(data.users || [])
      setPagination(data.pagination || { page: 1, pages: 1, total: 0 })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch])

  useEffect(() => { loadUsers(1) }, [loadUsers])

  async function handleRoleChange(userId, role) {
    setPendingId(userId)
    setActionError(null)
    const { data, error: err } = await apiFetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    })
    setPendingId(null)
    if (err) { setActionError(err); return }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...data.user } : u))
  }

  async function handleActiveToggle(userId, currentActive) {
    setPendingId(userId)
    setActionError(null)
    const { data, error: err } = await apiFetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: !currentActive }),
    })
    setPendingId(null)
    if (err) { setActionError(err); return }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...data.user } : u))
  }

  async function handleDelete(userId) {
    if (!window.confirm('Permanently delete this user? This cannot be undone.')) return
    setPendingId(userId)
    setActionError(null)
    const { error: err } = await apiFetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
    setPendingId(null)
    if (err) { setActionError(err); return }
    setUsers(prev => prev.filter(u => u.id !== userId))
    setPagination(p => ({ ...p, total: Math.max(0, p.total - 1) }))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full rounded-lg border border-border bg-card pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <button
          onClick={() => loadUsers(pagination.page)}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} aria-hidden="true" />
          Refresh
        </button>
      </div>

      <ErrorBanner message={actionError} onDismiss={() => setActionError(null)} />

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Table header */}
        <div className="hidden sm:grid grid-cols-[1fr_120px_80px_32px] gap-4 border-b border-border px-5 py-3">
          <span className="text-xs font-medium text-muted-foreground">User</span>
          <span className="text-xs font-medium text-muted-foreground">Role</span>
          <span className="text-xs font-medium text-muted-foreground">Active</span>
          <span />
        </div>

        {error ? (
          <p className="px-5 py-8 text-center text-sm text-destructive">{error}</p>
        ) : loading && users.length === 0 ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-3 mb-3">
              <Users className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-foreground">No users found</p>
            {debouncedSearch && (
              <p className="text-xs text-muted-foreground mt-1">Try a different search term.</p>
            )}
          </div>
        ) : (
          <ul role="list" className="divide-y divide-border">
            {users.map(u => {
              const isSelf    = String(u.id) === String(currentUserId)
              const isPending = pendingId === u.id
              return (
                <li
                  key={u.id}
                  className={cn(
                    'grid grid-cols-1 sm:grid-cols-[1fr_120px_80px_32px] gap-2 sm:gap-4 items-start sm:items-center px-5 py-4 transition-colors',
                    isPending && 'opacity-60 pointer-events-none',
                  )}
                >
                  {/* User info */}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {u.name || <span className="text-muted-foreground italic">No name</span>}
                      {isSelf && (
                        <span className="ml-2 text-xs font-normal text-primary">(you)</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Joined {formatDate(u.created_at)}</p>
                  </div>

                  {/* Role */}
                  <div>
                    <label className="sr-only">Role for {u.email}</label>
                    <select
                      value={u.role}
                      onChange={e => handleRoleChange(u.id, e.target.value)}
                      disabled={isSelf}
                      className="w-full rounded-lg border border-border bg-card px-2 py-1.5 text-xs text-foreground disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  {/* Active toggle */}
                  <div>
                    <button
                      onClick={() => handleActiveToggle(u.id, u.is_active)}
                      disabled={isSelf}
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                        u.is_active
                          ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                          : 'bg-muted text-muted-foreground hover:bg-accent',
                      )}
                      aria-label={u.is_active ? 'Deactivate user' : 'Activate user'}
                    >
                      {u.is_active
                        ? <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                        : <XCircle    className="h-3.5 w-3.5" aria-hidden="true" />
                      }
                      {u.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </div>

                  {/* Delete */}
                  <div className="flex justify-end sm:justify-start">
                    <button
                      onClick={() => handleDelete(u.id)}
                      disabled={isSelf}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={`Delete ${u.email}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {pagination.total} {pagination.total === 1 ? 'user' : 'users'}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadUsers(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
              className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40 transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="text-xs text-muted-foreground tabular-nums">
              {pagination.page} / {pagination.pages}
            </span>
            <button
              onClick={() => loadUsers(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages || loading}
              className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40 transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Analytics tab ─────────────────────────────────────────────────────────────

function AnalyticsTab() {
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  async function loadMetrics() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/analytics', {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (!res.ok) throw new Error('Failed to load analytics.')
      const data = await res.json()
      setMetrics(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadMetrics() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <button
          onClick={loadMetrics}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} aria-hidden="true" />
          Refresh
        </button>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total users"
          value={metrics ? metrics.totalUsers.toLocaleString() : null}
          sub="All non-deleted accounts"
        />
        <MetricCard
          label="New last 7 days"
          value={metrics ? metrics.newLast7Days.toLocaleString() : null}
          sub="Signups in past week"
        />
        <MetricCard
          label="New last 30 days"
          value={metrics ? metrics.newLast30Days.toLocaleString() : null}
          sub="Signups in past month"
        />
        <MetricCard
          label="Active sessions"
          value={metrics ? metrics.activeSessions.toLocaleString() : null}
          sub="Non-revoked, non-expired"
        />
      </div>
    </div>
  )
}

// ── Settings tab ──────────────────────────────────────────────────────────────

const SETTING_LABELS = {
  appName:             { label: 'App name',                   type: 'text' },
  registrationEnabled: { label: 'Registration enabled',       type: 'toggle' },
  emailVerifyRequired: { label: 'Email verification required', type: 'toggle' },
  maintenanceMode:     { label: 'Maintenance mode',           type: 'toggle' },
}

function Toggle({ checked, onChange, disabled, id }) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-primary' : 'bg-muted',
      )}
    >
      <span
        className={cn(
          'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0',
        )}
      />
    </button>
  )
}

function SettingsTab() {
  const [settings, setSettings] = useState(null)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState(null)
  const [saved, setSaved]       = useState(false)

  async function loadSettings() {
    setError(null)
    try {
      const res = await fetch('/api/admin/settings', {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (!res.ok) throw new Error('Failed to load settings.')
      const data = await res.json()
      setSettings(data.settings)
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => { loadSettings() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleChange(key, value) {
    setSettings(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    const { data, error: err } = await apiFetch('/api/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    })
    setSaving(false)
    if (err) { setError(err); return }
    setSettings(data.settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (!settings) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <form onSubmit={handleSave} className="space-y-4 max-w-lg">
      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        {Object.entries(SETTING_LABELS).map(([key, meta]) => (
          <div key={key} className="flex items-center justify-between px-5 py-4 gap-4">
            <div className="min-w-0">
              <label
                htmlFor={`setting-${key}`}
                className="block text-sm font-medium text-foreground cursor-pointer"
              >
                {meta.label}
              </label>
            </div>
            {meta.type === 'toggle' ? (
              <Toggle
                id={`setting-${key}`}
                checked={Boolean(settings[key])}
                onChange={val => handleChange(key, val)}
                disabled={saving}
              />
            ) : (
              <input
                id={`setting-${key}`}
                type="text"
                value={settings[key] ?? ''}
                onChange={e => handleChange(key, e.target.value)}
                disabled={saving}
                maxLength={100}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground w-48 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-600">
            <CheckCircle className="h-4 w-4" aria-hidden="true" />
            Saved
          </span>
        )}
      </div>
    </form>
  )
}

// ── Admin page ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'users',     label: 'Users',     Icon: Users },
  { id: 'analytics', label: 'Analytics', Icon: BarChart2 },
  { id: 'settings',  label: 'Settings',  Icon: Settings },
]

export default function Admin() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('users')

  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/dashboard', { replace: true })
    }
  }, [user, navigate])

  if (!user || user.role !== 'admin') return null

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <Shield className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Admin</h1>
          <p className="text-sm text-muted-foreground">Manage users, view analytics, and configure settings.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-border">
        {TABS.map(({ id, label, Icon }) => (
          <TabButton
            key={id}
            active={tab === id}
            onClick={() => setTab(id)}
            icon={Icon}
          >
            {label}
          </TabButton>
        ))}
      </div>

      {tab === 'users'     && <UsersTab     currentUserId={user.id} />}
      {tab === 'analytics' && <AnalyticsTab />}
      {tab === 'settings'  && <SettingsTab  />}
    </div>
  )
}
