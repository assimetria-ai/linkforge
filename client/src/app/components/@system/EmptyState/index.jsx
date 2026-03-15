import { cn } from '@/app/lib/@system/utils'

/**
 * EmptyState — generic empty placeholder for lists, tables, and search results.
 *
 * Props:
 *   icon        Lucide icon component (optional)
 *   title       Main message (required)
 *   description Supporting text (optional)
 *   action      { label, onClick } or { label, href } — CTA button (optional)
 *   className   Extra classes on the outer wrapper
 *
 * Usage:
 *   import EmptyState from '@/app/components/@system/EmptyState'
 *   import { FileX } from 'lucide-react'
 *
 *   <EmptyState
 *     icon={FileX}
 *     title="No items yet"
 *     description="Create your first item to get started."
 *     action={{ label: 'New item', onClick: () => setOpen(true) }}
 *   />
 */
export default function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center px-4', className)}>
      {Icon && (
        <div className="rounded-full bg-muted p-3 mb-4">
          <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </div>
      )}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">{description}</p>
      )}
      {action && (
        <div className="mt-4">
          {action.href ? (
            <a
              href={action.href}
              className="inline-flex items-center rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {action.label}
            </a>
          ) : (
            <button
              type="button"
              onClick={action.onClick}
              className="inline-flex items-center rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
