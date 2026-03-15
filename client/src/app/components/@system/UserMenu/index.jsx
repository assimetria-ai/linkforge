import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Link } from 'react-router-dom'
import { Settings, Users, LogOut, ChevronDown } from 'lucide-react'
import { useAuth } from '@/app/store/@system/auth'
import { cn } from '@/app/lib/@system/utils'

function getInitials(name, email) {
  if (name) {
    const parts = name.trim().split(/\s+/)
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase()
  }
  return email ? email[0].toUpperCase() : '?'
}

const itemClass =
  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground ' +
  'hover:bg-accent hover:text-foreground transition-colors cursor-pointer select-none ' +
  'outline-none data-[highlighted]:bg-accent data-[highlighted]:text-foreground'

/**
 * UserMenu — header dropdown for the authenticated user.
 *
 * Shows an avatar button that opens a dropdown with:
 *   - User name, email, and role
 *   - Links to Settings and Teams
 *   - Sign out action
 *
 * Usage: <UserMenu /> — reads user from AuthContext automatically.
 *
 * @custom: add product-specific nav items to MENU_ITEMS below.
 */

// @custom: add links relevant to your product
const MENU_ITEMS = [
  { label: 'Settings', Icon: Settings, to: '/settings' },
  { label: 'Teams',    Icon: Users,    to: '/teams' },
]

export default function UserMenu() {
  const { user, logout } = useAuth()
  const initials = getInitials(user?.name, user?.email)

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background"
          aria-label="User menu"
        >
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold select-none"
            aria-hidden="true"
          >
            {initials}
          </div>
          {user?.name && (
            <span className="hidden sm:block text-sm font-medium text-foreground max-w-[120px] truncate">
              {user.name}
            </span>
          )}
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-[200px] rounded-xl border border-border bg-card p-1.5 shadow-lg animate-in fade-in-0 zoom-in-95 duration-150"
        >
          {/* Identity */}
          <div className="px-3 py-2 mb-1">
            {user?.name && (
              <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
            )}
            <p className={cn('text-muted-foreground truncate', user?.name ? 'text-xs' : 'text-sm font-medium text-foreground')}>
              {user?.email}
            </p>
            {user?.role && (
              <p className="text-[11px] text-muted-foreground/70 mt-0.5 capitalize">{user.role}</p>
            )}
          </div>

          <DropdownMenu.Separator className="h-px bg-border my-1 -mx-1.5" />

          {MENU_ITEMS.map(({ label, Icon, to }) => (
            <DropdownMenu.Item key={to} asChild>
              <Link to={to} className={itemClass}>
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {label}
              </Link>
            </DropdownMenu.Item>
          ))}

          <DropdownMenu.Separator className="h-px bg-border my-1 -mx-1.5" />

          <DropdownMenu.Item onSelect={logout} className={itemClass}>
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
