import { cn } from '@/app/lib/@system/utils'

// ── Base ──────────────────────────────────────────────────────────────────────

/**
 * Skeleton — animated loading placeholder.
 *
 * Usage:
 *   import { Skeleton } from '@/app/components/@system/Skeleton'
 *   <Skeleton className="h-4 w-32" />
 */
export function Skeleton({ className }) {
  return (
    <div
      className={cn('rounded-md bg-muted animate-pulse', className)}
      aria-hidden="true"
    />
  )
}

// ── Presets ───────────────────────────────────────────────────────────────────

/**
 * SkeletonCard — placeholder for a StatCard tile.
 *
 * Usage:
 *   <SkeletonCard />
 */
export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="h-7 w-20 mb-1.5" />
      <Skeleton className="h-3.5 w-14" />
    </div>
  )
}

/**
 * SkeletonList — placeholder rows for a list/table.
 *
 * Props:
 *   count  Number of rows to show (default: 4)
 *
 * Usage:
 *   <SkeletonList count={5} />
 */
export function SkeletonList({ count = 4 }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5">
          <Skeleton className="h-7 w-7 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * SkeletonText — one or more lines of text placeholder.
 *
 * Props:
 *   lines  Number of lines (default: 3)
 *
 * Usage:
 *   <SkeletonText lines={2} />
 */
export function SkeletonText({ lines = 3 }) {
  const WIDTHS = ['w-full', 'w-5/6', 'w-3/4', 'w-4/5', 'w-2/3']
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn('h-3.5', WIDTHS[i % WIDTHS.length])} />
      ))}
    </div>
  )
}

export default Skeleton
