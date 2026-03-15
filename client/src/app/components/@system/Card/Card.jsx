// @system — shadcn/ui card primitives with mobile-responsive padding
import { cn } from '@/app/lib/@system/utils'

function Card({ className, ...props }) {
  return (
    <div
      className={cn('rounded-lg border bg-card text-card-foreground shadow-sm', className)}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }) {
  return (
    <div
      className={cn('flex flex-col space-y-1.5 p-4 sm:p-6', className)}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }) {
  return (
    <h3
      className={cn('text-xl sm:text-2xl font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }) {
  return (
    <p className={cn('text-xs sm:text-sm text-muted-foreground', className)} {...props} />
  )
}

function CardContent({ className, ...props }) {
  return <div className={cn('p-4 sm:p-6 pt-0', className)} {...props} />
}

function CardFooter({ className, ...props }) {
  return (
    <div
      className={cn('flex flex-col gap-2 sm:flex-row sm:items-center p-4 sm:p-6 pt-0', className)}
      {...props}
    />
  )
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
