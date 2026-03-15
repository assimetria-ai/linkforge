import { useRef, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import * as Dialog from '@radix-ui/react-dialog'
import { LayoutDashboard, Settings, Users, HardDrive, ScrollText, Mail, Shield, X } from 'lucide-react'
import { cn } from '@/app/lib/@system/utils'
import { useAuth } from '@/app/store/@system/auth'

// @custom: add your product's navigation items here
const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/teams',     label: 'Teams',     Icon: Users },
  { to: '/files',     label: 'Files',     Icon: HardDrive },
  { to: '/email',     label: 'Email',     Icon: Mail },
  { to: '/logs',      label: 'Logs',      Icon: ScrollText },
  { to: '/settings',  label: 'Settings',  Icon: Settings },
]

function NavItems({ onNavigate, user }) {
  const items = [...NAV_ITEMS]
  if (user?.role === 'admin') {
    items.push({ to: '/admin', label: 'Admin', Icon: Shield })
  }
  return (
    <ul className="space-y-0.5" role="list">
      {items.map(({ to, label, Icon }) => (
        <li key={to}>
          <NavLink
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {label}
          </NavLink>
        </li>
      ))}
    </ul>
  )
}

function SidebarInner({ onClose }) {
  const location = useLocation()
  const { logout, user } = useAuth()
  const prevPathname = useRef(location.pathname)

  // Close mobile drawer when the route changes
  useEffect(() => {
    if (prevPathname.current !== location.pathname) {
      prevPathname.current = location.pathname
      onClose?.()
    }
  }, [location.pathname, onClose])

  return (
    <div className="flex h-full w-64 max-w-[85vw] flex-col bg-card border-r border-border">
      {/* Brand */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
        {/* @custom: replace with your product name or logo */}
        <span className="font-semibold text-foreground">MyApp</span>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden flex items-center justify-center rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Main navigation">
        <NavItems onNavigate={onClose} user={user} />
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-border p-3 pb-safe">
        {user?.email && (
          <p className="mb-1 truncate px-3 py-1 text-xs text-muted-foreground">
            {user.email}
          </p>
        )}
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}

export default function Sidebar({ open, onClose, isMobile }) {
  // Mobile: slide-in drawer via Radix Dialog
  if (isMobile) {
    return (
      <Dialog.Root open={open} onOpenChange={v => !v && onClose()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 animate-in fade-in-0 duration-200" />
          <Dialog.Content
            className="fixed left-0 top-0 z-50 h-full animate-in slide-in-from-left duration-200 focus:outline-none"
            aria-describedby={undefined}
          >
            <Dialog.Title className="sr-only">Navigation</Dialog.Title>
            <SidebarInner onClose={onClose} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    )
  }

  // Desktop: always-visible fixed sidebar
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 md:flex">
      <SidebarInner />
    </aside>
  )
}
