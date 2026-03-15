import { cn } from '@/app/lib/@system/utils'

/**
 * Loading — centered spinner for async states.
 *
 * Props:
 *   text      Optional label below the spinner
 *   size      'sm' | 'md' (default) | 'lg'
 *   fullPage  If true, fills the viewport (useful for page-level loaders)
 *   className Extra classes on the wrapper
 *
 * Usage:
 *   import Loading from '@/app/components/@system/Loading'
 *
 *   // Inline
 *   {loading && <Loading text="Fetching data..." />}
 *
 *   // Full-page
 *   {loading && <Loading fullPage />}
 */

const SIZE = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-[3px]',
}

export default function Loading({ text, size = 'md', fullPage = false, className }) {
  const inner = (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div
        className={cn(
          'rounded-full border-muted border-t-primary animate-spin',
          SIZE[size]
        )}
        role="status"
        aria-label={text || 'Loading'}
      />
      {text && <p className="text-xs text-muted-foreground">{text}</p>}
    </div>
  )

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
        {inner}
      </div>
    )
  }

  return <div className="flex items-center justify-center py-10">{inner}</div>
}

/**
 * ButtonSpinner — tiny inline spinner for loading button states.
 *
 * Usage:
 *   <button disabled={saving}>
 *     {saving ? <><ButtonSpinner /> Saving...</> : 'Save'}
 *   </button>
 */
export function ButtonSpinner({ className }) {
  return (
    <span
      className={cn('inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin', className)}
      aria-hidden="true"
    />
  )
}
