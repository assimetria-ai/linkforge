import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/app/lib/@system/utils'

// ── StatCard ──────────────────────────────────────────────────────────────────

/**
 * StatCard — metric tile with optional icon and trend indicator.
 *
 * Props:
 *   label    Metric label (e.g. "Total Users")
 *   value    Metric value (string or number, e.g. "2,418" or "—")
 *   Icon     Lucide icon component (optional)
 *   trend    'up' | 'down' | 'neutral'  (optional)
 *   delta    Change label (e.g. "+12%", "−3 today")  (optional)
 *   loading  Show skeleton state when true
 *   className Extra classes
 *
 * Usage:
 *   import { StatCard } from '@/app/components/@system/Card'
 *   import { Users } from 'lucide-react'
 *
 *   <StatCard label="Total Users" value="2,418" Icon={Users} trend="up" delta="+12%" />
 */

const TREND_META = {
  up:      { Icon: TrendingUp,   color: 'text-emerald-500' },
  down:    { Icon: TrendingDown, color: 'text-destructive' },
  neutral: { Icon: Minus,        color: 'text-muted-foreground' },
}

export function StatCard({ label, value, Icon, trend, delta, loading = false, className }) {
  const trendMeta = trend ? TREND_META[trend] : null
  const TrendIcon = trendMeta?.Icon

  return (
    <div className={cn('rounded-xl border border-border bg-card p-5', className)}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {Icon && (
          <div className="rounded-lg bg-accent p-2 shrink-0">
            <Icon className="h-4 w-4 text-accent-foreground" aria-hidden="true" />
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="h-7 w-24 rounded bg-muted animate-pulse" />
          {delta && <div className="h-4 w-16 rounded bg-muted animate-pulse" />}
        </div>
      ) : (
        <>
          <p className="text-2xl font-semibold text-foreground">{value ?? '—'}</p>
          {trendMeta && delta && (
            <div className={cn('flex items-center gap-1 mt-1.5', trendMeta.color)}>
              <TrendIcon className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="text-xs font-medium">{delta}</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── ContentCard ───────────────────────────────────────────────────────────────

/**
 * ContentCard — titled content card wrapper.
 *
 * Props:
 *   title      Card heading (optional)
 *   action     Element rendered in the header's trailing slot (optional)
 *   padding    Override inner padding: 'sm' | 'md' (default) | 'none'
 *   className  Extra classes
 *   children   Card body content
 *
 * Usage:
 *   import { ContentCard } from '@/app/components/@system/Card'
 *
 *   <ContentCard title="Recent activity" action={<button>View all</button>}>
 *     <p>Content here</p>
 *   </ContentCard>
 */

const PADDING = {
  sm:   'p-4',
  md:   'p-5',
  none: '',
}

export function ContentCard({ title, action, padding = 'md', className, children }) {
  const hasHeader = title || action
  return (
    <div className={cn('rounded-xl border border-border bg-card', PADDING[padding], className)}>
      {hasHeader && (
        <div className="flex items-center justify-between mb-4">
          {title && <h2 className="text-sm font-semibold text-foreground">{title}</h2>}
          {action && <div className="text-xs text-muted-foreground">{action}</div>}
        </div>
      )}
      {children}
    </div>
  )
}

// Default export: ContentCard for convenience
export default ContentCard
