// @system — app sidebar layout component with mobile drawer support
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { cn } from '@/app/lib/@system/utils'
import { useEffect } from 'react'

/**
 * Sidebar — Desktop sidebar / Mobile drawer
 * @param {Object} props
 * @param {React.ReactNode} props.children - Sidebar content
 * @param {string} [props.className] - Additional CSS classes
 * @param {boolean} [props.mobileOpen] - Mobile drawer open state
 * @param {Function} [props.onMobileClose] - Mobile drawer close handler
 */
function Sidebar({ children, className, mobileOpen, onMobileClose }) {
  // Prevent body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          // Desktop: always visible
          'hidden lg:flex h-full w-64 flex-col border-r bg-background px-3 py-4',
          // Mobile: drawer
          mobileOpen && 'fixed inset-y-0 left-0 z-50 flex w-[280px] shadow-xl',
          className
        )}
      >
        {/* Mobile close button */}
        {mobileOpen && (
          <div className="flex items-center justify-between mb-4 lg:hidden">
            <span className="font-semibold text-sm text-muted-foreground">Menu</span>
            <button
              onClick={onMobileClose}
              className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent transition-colors"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {children}
      </aside>
    </>
  )
}

function SidebarLogo({ name, href = '/app', className }) {
  return (
    <div className={cn('mb-6 px-3', className)}>
      <Link
        to={href}
        className="flex items-center gap-2 text-foreground hover:opacity-80 transition-opacity"
      >
        <span className="font-bold text-base lg:text-lg tracking-tight">{name}</span>
      </Link>
    </div>
  )
}

function SidebarSection({ children, className }) {
  return <div className={cn('flex flex-col gap-1', className)}>{children}</div>
}

function SidebarItem({ icon, label, active, onClick, className }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
        // Larger touch target for mobile
        'min-h-[44px]',
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        className
      )}
    >
      {icon}
      {label}
    </button>
  )
}

export { Sidebar, SidebarLogo, SidebarSection, SidebarItem }
