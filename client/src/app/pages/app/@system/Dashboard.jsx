import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  LayoutDashboard, Users, Activity, TrendingUp, TrendingDown,
  Plus, ArrowRight, Sparkles, Check, X, ChevronRight, ChevronDown, Circle,
} from 'lucide-react'
import { useAuth } from '@/app/store/@system/auth'
import OnboardingWizard, { useOnboarding } from '@/app/components/@system/OnboardingWizard'
import { cn } from '@/app/lib/@system/utils'

// ---- Stat card ---------------------------------------------------------------

/**
 * StatCard — reusable metric display card with optional trend indicator.
 *
 * Props:
 *   label   {string}           — e.g. 'Total Users'
 *   value   {string|number}    — e.g. '1,024' or '—'
 *   Icon    {Component}        — Lucide icon component
 *   delta   {string?}          — optional change string, e.g. '+12%' or '-3%'
 *   trend   {'up'|'down'|null} — direction used for delta colouring
 *
 * Example:
 *   <StatCard label="Total Users" value="1,024" Icon={Users} delta="+12%" trend="up" />
 */
function StatCard({ label, value, Icon, delta, trend }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <div className="rounded-lg bg-accent p-2">
          <Icon className="h-4 w-4 text-accent-foreground" aria-hidden="true" />
        </div>
      </div>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
      {delta && (
        <div className="flex items-center gap-1 mt-1.5">
          {trend === 'up' && (
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
          )}
          {trend === 'down' && (
            <TrendingDown className="h-3.5 w-3.5 text-red-500" aria-hidden="true" />
          )}
          <span
            className={cn(
              'text-xs font-medium',
              trend === 'up'   ? 'text-emerald-600 dark:text-emerald-400' :
              trend === 'down' ? 'text-red-600 dark:text-red-400' :
                                 'text-muted-foreground'
            )}
          >
            {delta}
          </span>
          <span className="text-xs text-muted-foreground">vs last period</span>
        </div>
      )}
    </div>
  )
}

// @custom: replace with real data from your API.
// Optionally pass `delta` and `trend` to show change indicators.
const STATS = [
  { label: 'Total Users',     value: '—', Icon: Users,      delta: null, trend: null },
  { label: 'Active Sessions', value: '—', Icon: Activity,   delta: null, trend: null },
  { label: 'Growth',          value: '—', Icon: TrendingUp, delta: null, trend: null },
]

const QUICK_ACTIONS = [
  { label: 'Add item', Icon: Plus,      href: '#' },
  { label: 'View all', Icon: ArrowRight, href: '#' },
]

// ---- Announcement banner -----------------------------------------------------

/**
 * AnnouncementBanner — generic dismissable banner for workspace-wide messages.
 *
 * Props:
 *   title       {string}                              — headline text (required)
 *   description {string?}                             — body text
 *   variant     {'default'|'info'|'success'|'warning'} — colour theme, default: 'default'
 *   tag         {string?}                             — small label above title, e.g. 'New'
 *   cta         {{ label, to?, href? }?}              — optional call-to-action link
 *   onDismiss   {function?}                           — if provided, shows a dismiss button
 *
 * Example:
 *   <AnnouncementBanner
 *     tag="New"
 *     title="Dark mode is here"
 *     description="You can now switch themes in Settings."
 *     variant="info"
 *     cta={{ label: 'Open Settings', to: '/settings?tab=appearance' }}
 *     onDismiss={handleDismiss}
 *   />
 */
const BANNER_VARIANTS = {
  default: {
    wrap:  'border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent',
    label: 'text-primary',
  },
  info: {
    wrap:  'border-blue-500/20 bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent',
    label: 'text-blue-600 dark:text-blue-400',
  },
  success: {
    wrap:  'border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent',
    label: 'text-emerald-600 dark:text-emerald-400',
  },
  warning: {
    wrap:  'border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent',
    label: 'text-amber-600 dark:text-amber-400',
  },
}

export function AnnouncementBanner({ title, description, variant = 'default', tag, cta, onDismiss }) {
  const styles = BANNER_VARIANTS[variant] || BANNER_VARIANTS.default
  return (
    <div className={cn('relative rounded-xl overflow-hidden border p-4 sm:p-5', styles.wrap)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {tag && (
            <p className={cn('text-xs font-semibold uppercase tracking-wide mb-1', styles.label)}>
              {tag}
            </p>
          )}
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {description && (
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
          )}
          {cta && (
            <div className="mt-3">
              {cta.to ? (
                <Link
                  to={cta.to}
                  className={cn(
                    'inline-flex items-center gap-1 text-xs font-medium hover:opacity-80 transition-opacity',
                    styles.label
                  )}
                >
                  {cta.label} <ChevronRight className="h-3 w-3" />
                </Link>
              ) : (
                <a
                  href={cta.href}
                  className={cn(
                    'inline-flex items-center gap-1 text-xs font-medium hover:opacity-80 transition-opacity',
                    styles.label
                  )}
                >
                  {cta.label} <ChevronRight className="h-3 w-3" />
                </a>
              )}
            </div>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

// ---- Welcome banner ----------------------------------------------------------

const WELCOME_BANNER_KEY = 'welcome_banner_dismissed'

function useWelcomeBanner() {
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem(WELCOME_BANNER_KEY) === 'true'
  )

  function dismiss() {
    localStorage.setItem(WELCOME_BANNER_KEY, 'true')
    setDismissed(true)
  }

  return { dismissed, dismiss }
}

// ---- Setup checklist ---------------------------------------------------------

const CHECKLIST_KEY = 'setup_checklist'
const CHECKLIST_DISMISSED_KEY = 'setup_checklist_dismissed'

const CHECKLIST_ITEMS = [
  { id: 'explore',       label: 'Explore the dashboard',     description: 'Take a look around your workspace.' },
  { id: 'profile',       label: 'Complete your profile',     description: 'Add your name in Settings.',                        to: '/settings' },
  { id: 'notifications', label: 'Configure notifications',   description: 'Choose what you want to be notified about.',        to: '/settings?tab=notifications' },
]

function useSetupChecklist() {
  const [checked, setChecked] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(CHECKLIST_KEY)) || {}
      // Auto-mark "explore" done on first dashboard visit
      if (!stored.explore) {
        stored.explore = true
        localStorage.setItem(CHECKLIST_KEY, JSON.stringify(stored))
      }
      return stored
    } catch {
      const init = { explore: true }
      localStorage.setItem(CHECKLIST_KEY, JSON.stringify(init))
      return init
    }
  })

  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem(CHECKLIST_DISMISSED_KEY) === 'true'
  )

  function check(id) {
    setChecked(prev => {
      const next = { ...prev, [id]: true }
      localStorage.setItem(CHECKLIST_KEY, JSON.stringify(next))
      return next
    })
  }

  function dismiss() {
    localStorage.setItem(CHECKLIST_DISMISSED_KEY, 'true')
    setDismissed(true)
  }

  const allDone = CHECKLIST_ITEMS.every(item => checked[item.id])
  return { checked, check, dismissed, dismiss, allDone }
}

function SetupChecklist({ checked, check, allDone, onDismiss }) {
  const done = CHECKLIST_ITEMS.filter(i => checked[i.id]).length
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <button
            onClick={() => setCollapsed(c => !c)}
            className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity"
            aria-expanded={!collapsed}
          >
            <h2 className="text-sm font-semibold text-foreground">Get started</h2>
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 text-muted-foreground transition-transform duration-200',
                collapsed && '-rotate-90'
              )}
              aria-hidden="true"
            />
          </button>
          <p className="text-xs text-muted-foreground mt-0.5">{done} of {CHECKLIST_ITEMS.length} completed</p>
        </div>
        <button
          onClick={onDismiss}
          className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          aria-label="Dismiss checklist"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-muted mb-4 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${(done / CHECKLIST_ITEMS.length) * 100}%` }}
        />
      </div>

      {!collapsed && (
        <div className="space-y-1">
          {CHECKLIST_ITEMS.map(({ id, label, description, to }) => {
            const isDone = !!checked[id]
            return (
              <div
                key={id}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
                  isDone ? 'opacity-50' : 'hover:bg-accent/50'
                )}
              >
                <button
                  type="button"
                  onClick={() => !isDone && check(id)}
                  disabled={isDone}
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                    isDone
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border hover:border-primary'
                  )}
                  aria-label={isDone ? `${label} completed` : `Mark "${label}" as done`}
                >
                  {isDone && <Check className="h-3 w-3" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium', isDone ? 'line-through text-muted-foreground' : 'text-foreground')}>
                    {label}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{description}</p>
                </div>
                {!isDone && to && (
                  <Link
                    to={to}
                    className="flex shrink-0 items-center gap-0.5 text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    Go <ChevronRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---- Profile completion card -------------------------------------------------

const PROFILE_COMPLETION_DISMISSED_KEY = 'profile_completion_dismissed'

/**
 * ProfileCompletionCard — shows account setup progress with actionable steps.
 *
 * Items are evaluated against the current user object and localStorage keys.
 * Hides automatically when all items are complete or when dismissed.
 *
 * @custom: update COMPLETION_ITEMS to match what a "complete" account looks
 *   like in your product. Each item needs:
 *     id    {string}   — unique key
 *     label {string}   — displayed text
 *     done  {function} — (user) => boolean, returns true when step is complete
 *     to    {string}   — internal route for the action link
 *
 * Example:
 *   <ProfileCompletionCard user={user} />
 */
const COMPLETION_ITEMS = [
  {
    id: 'name',
    label: 'Add your name',
    done: u => !!u?.name,
    to: '/settings',
  },
  {
    id: 'bio',
    label: 'Write a short bio',
    done: u => !!u?.bio,
    to: '/settings',
  },
  {
    id: 'notifications',
    label: 'Set notification preferences',
    done: () => localStorage.getItem('notifications_saved') === 'true',
    to: '/settings?tab=notifications',
  },
  {
    id: 'team',
    label: 'Create or join a team',
    done: () => localStorage.getItem('team_joined') === 'true',
    to: '/teams',
  },
]

function useProfileCompletion(user) {
  const items = COMPLETION_ITEMS.map(item => ({
    ...item,
    isDone: item.done(user),
  }))
  const doneCount = items.filter(i => i.isDone).length
  const percent   = Math.round((doneCount / items.length) * 100)
  return { items, doneCount, total: items.length, percent }
}

function ProfileCompletionCard({ user }) {
  const { items, doneCount, total, percent } = useProfileCompletion(user)
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(PROFILE_COMPLETION_DISMISSED_KEY) === 'true'
  )

  if (percent === 100 || dismissed) return null

  function dismiss() {
    localStorage.setItem(PROFILE_COMPLETION_DISMISSED_KEY, 'true')
    setDismissed(true)
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4 mb-1">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Complete your account</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {doneCount} of {total} steps &mdash; {percent}%
          </p>
        </div>
        <button
          onClick={dismiss}
          className="shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-muted mb-4 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Item list */}
      <div className="space-y-1">
        {items.map(({ id, label, isDone, to }) => (
          <div
            key={id}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
              isDone ? 'opacity-50' : 'hover:bg-accent/50'
            )}
          >
            <div
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                isDone
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border'
              )}
            >
              {isDone && <Check className="h-3 w-3" />}
            </div>
            <p
              className={cn(
                'flex-1 min-w-0 text-sm',
                isDone ? 'line-through text-muted-foreground' : 'text-foreground'
              )}
            >
              {label}
            </p>
            {!isDone && (
              <Link
                to={to}
                className="flex shrink-0 items-center gap-0.5 text-xs text-primary hover:text-primary/80 transition-colors"
              >
                Go <ChevronRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- Activity feed -----------------------------------------------------------

/**
 * ActivityFeed — reusable component for displaying a list of typed events.
 *
 * Each item shape:
 *   { id, text, time, Icon?, iconBg?, iconColor? }
 *
 * Pass `items={[]}` or omit to show the empty state.
 *
 * Example:
 *   const items = [
 *     { id: '1', text: 'New user signed up', time: '2 min ago', Icon: UserPlus, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-500' },
 *     { id: '2', text: 'Item published', time: '1 hr ago', Icon: FileCheck },
 *   ]
 */
function ActivityFeedEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="rounded-full bg-muted p-3 mb-3">
        <Activity className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium text-foreground">No activity yet</p>
      <p className="text-xs text-muted-foreground mt-1">Events will appear here as your team works.</p>
    </div>
  )
}

function ActivityFeed({ items = [] }) {
  if (!items.length) return <ActivityFeedEmpty />

  return (
    <ul className="space-y-1" role="list">
      {items.map(({ id, text, time, Icon, iconBg, iconColor }) => (
        <li
          key={id}
          className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-accent/50 transition-colors"
        >
          <div className={cn('rounded-full p-1.5 shrink-0 mt-0.5', iconBg || 'bg-muted')}>
            {Icon
              ? <Icon className={cn('h-3.5 w-3.5', iconColor || 'text-muted-foreground')} aria-hidden="true" />
              : <Circle className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground leading-snug">{text}</p>
            {time && <p className="text-xs text-muted-foreground mt-0.5">{time}</p>}
          </div>
        </li>
      ))}
    </ul>
  )
}

// ---- Helpers -----------------------------------------------------------------

function getTimeGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// ---- Page --------------------------------------------------------------------

// @custom: replace with real data from your API
const ACTIVITY_ITEMS = []

export default function Dashboard() {
  const { user } = useAuth()
  const { open, complete, reset } = useOnboarding()
  const { checked, check, dismissed: checklistDismissed, dismiss: dismissChecklist, allDone } = useSetupChecklist()
  const { dismissed: bannerDismissed, dismiss: dismissBanner } = useWelcomeBanner()

  const name = user?.name || (user?.email ? user.email.split('@')[0] : null)
  const greeting = name ? `${getTimeGreeting()}, ${name}` : getTimeGreeting()

  return (
    <div className="space-y-6 max-w-5xl">
      <OnboardingWizard open={open} onComplete={complete} onDismiss={complete} />

      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">{greeting}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Here's what's happening today.</p>
        </div>
        <button
          onClick={reset}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Show onboarding
        </button>
      </div>

      {/* Welcome banner — shown until dismissed */}
      {!bannerDismissed && (
        <AnnouncementBanner
          tag="Getting started"
          title="Welcome to your workspace"
          description="Complete the checklist below to get the most out of your account. It only takes a few minutes."
          onDismiss={dismissBanner}
        />
      )}

      {/* Setup checklist — hidden once dismissed or all done */}
      {!checklistDismissed && !allDone && (
        <SetupChecklist
          checked={checked}
          check={check}
          allDone={allDone}
          onDismiss={dismissChecklist}
        />
      )}

      {/* Profile completion — guides users to fill out their account details */}
      <ProfileCompletionCard user={user} />

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STATS.map(({ label, value, Icon, delta, trend }) => (
          <StatCard key={label} label={label} value={value} Icon={Icon} delta={delta} trend={trend} />
        ))}
      </div>

      {/* Quick actions */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">Quick actions</h2>
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
          {QUICK_ACTIONS.map(({ label, Icon, href }) => (
            <a
              key={label}
              href={href}
              className="flex items-center justify-center sm:justify-start gap-2 rounded-lg border border-border px-3 py-2.5 sm:py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors w-full sm:w-auto"
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </a>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">Recent activity</h2>
          <LayoutDashboard className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </div>
        <ActivityFeed items={ACTIVITY_ITEMS} />
      </div>
    </div>
  )
}
