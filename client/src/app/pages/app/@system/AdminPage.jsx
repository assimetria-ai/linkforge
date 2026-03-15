// @system — admin dashboard: user management, subscriptions, stats
import { useEffect, useState, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Home, Settings, Shield, CreditCard, Activity, Key, RefreshCw,
  Search, Users, TrendingUp, UserCheck, CalendarDays, ChevronLeft,
  ChevronRight, Mail, Lock, Zap, Globe,
} from 'lucide-react'
import { Header } from '../../../components/@system/Header/Header'
import { Sidebar, SidebarSection, SidebarItem } from '../../../components/@system/Sidebar/Sidebar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/@system/Card/Card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/@system/Table/Table'
import { Button } from '../../../components/@system/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../components/@system/Tabs/Tabs'
import { useAuthContext } from '../../../store/@system/auth'
import { api } from '../../../lib/@system/api'
import { AdminUsersTableSkeleton } from '../../../components/@system/Skeleton/Skeleton'


const NAV_ITEMS = [
  { icon: Home, label: 'Dashboard', to: '/app' },
  { icon: Activity, label: 'Activity', to: '/app/activity' },
  { icon: CreditCard, label: 'Billing', to: '/app/billing' },
  { icon: Key, label: 'API Keys', to: '/app/api-keys' },
  { icon: Settings, label: 'Settings', to: '/app/settings' },
]

const PAGE_SIZE = 20

// ── Toggle switch ────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
        checked ? 'bg-primary' : 'bg-muted'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, loading }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold">
              {loading ? <span className="inline-block h-7 w-16 animate-pulse rounded bg-muted" /> : value}
            </p>
          </div>
          <div className="rounded-full bg-primary/10 p-3">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Status badge ─────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  active:    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  trialing:  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  canceled:  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  past_due:  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
}

function StatusBadge({ status }) {
  const cls = STATUS_STYLES[status] ?? 'bg-muted text-muted-foreground'
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status ?? '—'}
    </span>
  )
}

// ── Settings section ─────────────────────────────────────────────────────────
function SettingsSection({ title, icon: Icon, children }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pb-1 border-b">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{title}</h3>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function SettingsRow({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between rounded-lg px-1 py-3 hover:bg-muted/30 transition-colors">
      <div>
        <p className="font-medium text-sm">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export function AdminPage() {
  const { user } = useAuthContext()
  const location = useLocation()

  function formatDate(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric' })
  }

  // ── Analytics state ────────────────────────────────────────────────────────
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsError, setStatsError] = useState('')

  async function fetchStats() {
    setStatsLoading(true)
    setStatsError('')
    try {
      const data = await api.get('/admin/users/stats')
      setStats(data)
    } catch (err) {
      setStatsError(err instanceof Error ? err.message : 'Failed to load stats')
    } finally {
      setStatsLoading(false)
    }
  }

  // ── Users state ────────────────────────────────────────────────────────────
  const [users, setUsers] = useState([])
  const [usersTotal, setUsersTotal] = useState(0)
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState('')
  const [search, setSearch] = useState('')
  const [usersPage, setUsersPage] = useState(1)
  const [roleUpdating, setRoleUpdating] = useState(null) // userId being updated

  const fetchUsers = useCallback(async (page = 1, searchVal = '') => {
    setUsersLoading(true)
    setUsersError('')
    try {
      const qs = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) })
      if (searchVal.length >= 2) qs.set('search', searchVal)
      const data = await api.get(`/admin/users?${qs}`)
      setUsers(data.users ?? [])
      setUsersTotal(data.total ?? data.users?.length ?? 0)
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setUsersLoading(false)
    }
  }, [])

  async function handleRoleToggle(u) {
    const newRole = u.role === 'admin' ? 'user' : 'admin'
    setRoleUpdating(u.id)
    try {
      await api.patch(`/admin/users/${u.id}/role`, { role: newRole })
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role: newRole } : x))
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : 'Failed to update role')
    } finally {
      setRoleUpdating(null)
    }
  }

  // ── Subscriptions state ────────────────────────────────────────────────────
  const [subscriptions, setSubscriptions] = useState([])
  const [subsLoading, setSubsLoading] = useState(false)
  const [subsError, setSubsError] = useState('')
  const [subsPage, setSubsPage] = useState(1)
  const [subsStatusFilter, setSubsStatusFilter] = useState('')

  async function fetchSubscriptions(page = 1, status = '') {
    setSubsLoading(true)
    setSubsError('')
    try {
      const qs = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) })
      if (status) qs.set('status', status)
      const data = await api.get(`/admin/subscriptions?${qs}`)
      setSubscriptions(data.subscriptions ?? [])
    } catch (err) {
      setSubsError(err instanceof Error ? err.message : 'Failed to load subscriptions')
    } finally {
      setSubsLoading(false)
    }
  }

  // ── Platform settings state ────────────────────────────────────────────────
  const [platformSettings, setPlatformSettings] = useState({
    maintenanceMode: false,
    registrationOpen: true,
    requireEmailVerification: true,
    twoFactorEnabled: false,
    emailNotifications: true,
    marketingEmails: false,
    digestEmails: true,
    betaFeatures: false,
    apiAccess: true,
    publicProfiles: true,
  })

  function setSetting(key) {
    return (val) => setPlatformSettings(prev => ({ ...prev, [key]: val }))
  }

  // ── Initial loads ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchStats()
    fetchUsers(1, '')
    fetchSubscriptions(1, '')
  }, [fetchUsers])

  // ── Search with debounce ───────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setUsersPage(1)
      fetchUsers(1, search)
    }, 350)
    return () => clearTimeout(timer)
  }, [search, fetchUsers])

  const usersTotalPages = Math.max(1, Math.ceil((usersTotal || users.length) / PAGE_SIZE))

  return (
    <div className="flex h-screen flex-col bg-background">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar>
          <div className="mb-6 px-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Navigation
            </p>
          </div>
          <SidebarSection>
            {NAV_ITEMS.map(({ icon: Icon, label, to }) => (
              <Link to={to} key={to}>
                <SidebarItem
                  icon={<Icon className="h-4 w-4" />}
                  label={label}
                  active={location.pathname === to}
                />
              </Link>
            ))}
            <Link to="/app/admin">
              <SidebarItem
                icon={<Shield className="h-4 w-4" />}
                label="Admin"
                active={location.pathname === '/app/admin'}
              />
            </Link>
          </SidebarSection>
        </Sidebar>

        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Admin</h1>
              <p className="mt-1 text-muted-foreground">Manage users, subscriptions, and platform settings.</p>
            </div>
          </div>

          <Tabs defaultValue="overview">
            <TabsList className="mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
              <TabsTrigger value="settings">Platform</TabsTrigger>
            </TabsList>

            {/* ── Overview tab ── */}
            <TabsContent value="overview">
              <div className="space-y-6">
                {statsError && (
                  <p className="text-sm text-destructive">{statsError}</p>
                )}
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard
                    icon={Users}
                    label="Total Users"
                    value={stats?.total?.toLocaleString() ?? '—'}
                    loading={statsLoading}
                  />
                  <StatCard
                    icon={UserCheck}
                    label="New Today"
                    value={stats?.today?.toLocaleString() ?? '—'}
                    loading={statsLoading}
                  />
                  <StatCard
                    icon={TrendingUp}
                    label="This Week"
                    value={stats?.thisWeek?.toLocaleString() ?? '—'}
                    loading={statsLoading}
                  />
                  <StatCard
                    icon={CalendarDays}
                    label="This Month"
                    value={stats?.thisMonth?.toLocaleString() ?? '—'}
                    loading={statsLoading}
                  />
                </div>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Growth Metrics</CardTitle>
                      <CardDescription>User registration trends.</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchStats}
                      disabled={statsLoading}
                      className="gap-2"
                    >
                      <RefreshCw className={`h-3 w-3 ${statsLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {statsLoading ? (
                      <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="h-5 animate-pulse rounded bg-muted" />
                        ))}
                      </div>
                    ) : stats ? (
                      <div className="space-y-3">
                        {[
                          { label: 'Today vs this week', a: stats.today, b: stats.thisWeek },
                          { label: 'This week vs this month', a: stats.thisWeek, b: stats.thisMonth },
                          { label: 'This month vs total', a: stats.thisMonth, b: stats.total },
                        ].map(({ label, a, b }) => {
                          const pct = b > 0 ? Math.round((a / b) * 100) : 0
                          return (
                            <div key={label}>
                              <div className="mb-1 flex justify-between text-sm">
                                <span className="text-muted-foreground">{label}</span>
                                <span className="font-medium">{pct}%</span>
                              </div>
                              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-primary transition-all"
                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No data available.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ── Users tab ── */}
            <TabsContent value="users">
              <Card>
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle>Users ({usersTotal || users.length})</CardTitle>
                    <CardDescription>All registered users.</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search users…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="h-8 w-48 rounded-md border border-input bg-background pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchUsers(usersPage, search)}
                      disabled={usersLoading}
                      className="gap-2"
                    >
                      <RefreshCw className={`h-3 w-3 ${usersLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {usersError && (
                    <p className="text-sm text-destructive mb-4">{usersError}</p>
                  )}
                  {usersLoading ? (
                    <AdminUsersTableSkeleton />
                  ) : (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users.map((u) => (
                            <TableRow key={u.id}>
                              <TableCell className="font-mono text-xs text-muted-foreground">
                                #{u.id}
                              </TableCell>
                              <TableCell className="font-medium">{u.name ?? '—'}</TableCell>
                              <TableCell>{u.email}</TableCell>
                              <TableCell>
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                    u.role === 'admin'
                                      ? 'bg-primary/10 text-primary'
                                      : 'bg-muted text-muted-foreground'
                                  }`}
                                >
                                  {u.role}
                                </span>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {formatDate(u.created_at)}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={roleUpdating === u.id || u.id === user?.id}
                                  onClick={() => handleRoleToggle(u)}
                                  className="text-xs h-7"
                                >
                                  {roleUpdating === u.id
                                    ? 'Saving…'
                                    : u.role === 'admin' ? 'Demote' : 'Make Admin'}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          {!usersLoading && users.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                {search.length >= 2 ? 'No users match your search.' : 'No users found.'}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>

                      {/* Pagination */}
                      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                        <span>Page {usersPage} of {usersTotalPages}</span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0"
                            disabled={usersPage <= 1}
                            onClick={() => {
                              const p = usersPage - 1
                              setUsersPage(p)
                              fetchUsers(p, search)
                            }}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0"
                            disabled={usersPage >= usersTotalPages || users.length < PAGE_SIZE}
                            onClick={() => {
                              const p = usersPage + 1
                              setUsersPage(p)
                              fetchUsers(p, search)
                            }}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Subscriptions tab ── */}
            <TabsContent value="subscriptions">
              <Card>
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle>Subscriptions</CardTitle>
                    <CardDescription>Active and historical subscriptions.</CardDescription>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={subsStatusFilter}
                      onChange={e => {
                        setSubsStatusFilter(e.target.value)
                        setSubsPage(1)
                        fetchSubscriptions(1, e.target.value)
                      }}
                      className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">All statuses</option>
                      <option value="active">Active</option>
                      <option value="trialing">Trialing</option>
                      <option value="canceled">Canceled</option>
                      <option value="past_due">Past due</option>
                    </select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchSubscriptions(subsPage, subsStatusFilter)}
                      disabled={subsLoading}
                      className="gap-2"
                    >
                      <RefreshCw className={`h-3 w-3 ${subsLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {subsError && (
                    <p className="text-sm text-destructive mb-4">{subsError}</p>
                  )}
                  {subsLoading ? (
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-10 animate-pulse rounded bg-muted" />
                      ))}
                    </div>
                  ) : (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Plan</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Started</TableHead>
                            <TableHead>Ends / Renews</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {subscriptions.map((s) => (
                            <TableRow key={s.id}>
                              <TableCell>
                                <div className="font-medium text-sm">{s.name ?? s.email}</div>
                                <div className="text-xs text-muted-foreground">{s.email}</div>
                              </TableCell>
                              <TableCell className="text-sm">{s.plan_id ?? s.price_id ?? '—'}</TableCell>
                              <TableCell><StatusBadge status={s.status} /></TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {formatDate(s.created_at)}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {formatDate(s.current_period_end ?? s.canceled_at)}
                              </TableCell>
                            </TableRow>
                          ))}
                          {!subsLoading && subscriptions.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                No subscriptions found.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>

                      {/* Pagination */}
                      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                        <span>Page {subsPage}</span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0"
                            disabled={subsPage <= 1}
                            onClick={() => {
                              const p = subsPage - 1
                              setSubsPage(p)
                              fetchSubscriptions(p, subsStatusFilter)
                            }}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0"
                            disabled={subscriptions.length < PAGE_SIZE}
                            onClick={() => {
                              const p = subsPage + 1
                              setSubsPage(p)
                              fetchSubscriptions(p, subsStatusFilter)
                            }}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Platform tab ── */}
            <TabsContent value="settings">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Platform Settings</CardTitle>
                    <CardDescription>
                      Global settings applied to all users. Wire these to feature flags for persistence.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8">

                    <SettingsSection title="General" icon={Globe}>
                      <SettingsRow
                        label="Maintenance Mode"
                        description="Temporarily disable public access to the platform."
                        checked={platformSettings.maintenanceMode}
                        onChange={setSetting('maintenanceMode')}
                      />
                      <SettingsRow
                        label="New User Registration"
                        description="Allow new accounts to be created."
                        checked={platformSettings.registrationOpen}
                        onChange={setSetting('registrationOpen')}
                      />
                      <SettingsRow
                        label="Public Profiles"
                        description="Allow user profiles to be visible to others."
                        checked={platformSettings.publicProfiles}
                        onChange={setSetting('publicProfiles')}
                      />
                    </SettingsSection>

                    <SettingsSection title="Security" icon={Lock}>
                      <SettingsRow
                        label="Require Email Verification"
                        description="New users must verify their email before accessing the app."
                        checked={platformSettings.requireEmailVerification}
                        onChange={setSetting('requireEmailVerification')}
                      />
                      <SettingsRow
                        label="Two-Factor Authentication"
                        description="Enforce 2FA for all accounts."
                        checked={platformSettings.twoFactorEnabled}
                        onChange={setSetting('twoFactorEnabled')}
                      />
                    </SettingsSection>

                    <SettingsSection title="Email" icon={Mail}>
                      <SettingsRow
                        label="Transactional Notifications"
                        description="Send email notifications for account activity."
                        checked={platformSettings.emailNotifications}
                        onChange={setSetting('emailNotifications')}
                      />
                      <SettingsRow
                        label="Marketing Emails"
                        description="Send promotional and marketing content to users."
                        checked={platformSettings.marketingEmails}
                        onChange={setSetting('marketingEmails')}
                      />
                      <SettingsRow
                        label="Weekly Digest"
                        description="Send a weekly activity digest to users."
                        checked={platformSettings.digestEmails}
                        onChange={setSetting('digestEmails')}
                      />
                    </SettingsSection>

                    <SettingsSection title="Features" icon={Zap}>
                      <SettingsRow
                        label="API Access"
                        description="Allow users to generate and use API keys."
                        checked={platformSettings.apiAccess}
                        onChange={setSetting('apiAccess')}
                      />
                      <SettingsRow
                        label="Beta Features"
                        description="Enable experimental features for all users."
                        checked={platformSettings.betaFeatures}
                        onChange={setSetting('betaFeatures')}
                      />
                    </SettingsSection>

                  </CardContent>
                </Card>
                <p className="text-xs text-muted-foreground px-1">
                  {/* @custom — persist toggle state via /admin/settings or feature flag service */}
                  Settings are stored locally. Connect to a persistence layer to save changes across sessions.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}
