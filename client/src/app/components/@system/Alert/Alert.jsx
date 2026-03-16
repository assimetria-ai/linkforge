// @system — alert / callout component with semantic variants
import { cva } from 'class-variance-authority'
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react'
import { cn } from '@/app/lib/@system/utils'
import { useState } from 'react'

const alertVariants = cva(
  // Mobile-first responsive padding
  'relative flex items-start gap-3 sm:gap-3 rounded-lg border p-4 sm:p-4 text-sm sm:text-sm',
  {
    variants: {
      variant: {
        default: 'bg-background border-border text-foreground',
<<<<<<< HEAD
        info: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100',
        success: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100',
        warning: 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800 text-yellow-900 dark:text-yellow-100',
        destructive: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100',
=======
        info: 'bg-blue-50 border-blue-200 text-blue-800',
        success: 'bg-green-50 border-green-200 text-green-800',
        warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        destructive: 'bg-red-50 border-red-200 text-red-800',
>>>>>>> e680e9061bfde40992c78336d4fe404d548c4363
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
<<<<<<< HEAD
)
=======
>>>>>>> e680e9061bfde40992c78336d4fe404d548c4363
)

const ICONS = {
  default: AlertCircle,
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  destructive: AlertCircle,
}

export function Alert({ className, variant = 'default', title, dismissible, onClose, children, ...props }) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null
  const Icon = ICONS[variant ?? 'default']

  function handleDismiss() {
    setDismissed(true)
    if (onClose) onClose()
  }

  return (
    <div className={cn(alertVariants({ variant }), className)} role="alert" {...props}>
      {/* Mobile-optimized icon sizing */}
      <Icon className="h-5 w-5 sm:h-4 sm:w-4 mt-0.5 flex-shrink-0" />
      <div className="flex-1 space-y-1">
        {title && <p className="font-semibold text-sm sm:text-sm">{title}</p>}
        {children && <div className="text-sm sm:text-sm opacity-90">{children}</div>}
      </div>
      {(dismissible || onClose) && (
        <button
<<<<<<< HEAD
          onClick={() => setDismissed(true)}
          className={cn(
            'flex-shrink-0 opacity-70 hover:opacity-100 active:opacity-100 transition-opacity',
            'touch-target min-h-touch min-w-touch flex items-center justify-center', // WCAG 2.5.5 compliant
            '-mr-2 sm:-mr-1', // Adjust positioning for larger mobile touch target
          )}
          aria-label="Dismiss alert"
=======
          onClick={handleDismiss}
          className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Dismiss"
>>>>>>> e680e9061bfde40992c78336d4fe404d548c4363
        >
          <X className="h-5 w-5 sm:h-4 sm:w-4" />
        </button>
      )}
    </div>
  )
}
