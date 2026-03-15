import { Menu } from 'lucide-react'
import UserMenu from '@/app/components/@system/UserMenu'
import NotificationBell from '@/app/components/@system/NotificationBell'
import ThemeToggle from '@/app/components/@system/ThemeToggle'

/**
 * Header — top bar with hamburger (mobile), notification bell, and user menu.
 *
 * Props:
 *   onMenuToggle  {function}  — called when the hamburger button is clicked.
 *
 * @custom: to show real notifications, pass `notifications` and `onMarkAllRead`
 * props to NotificationBell. Example:
 *   const [notifs, setNotifs] = useState([])
 *   <NotificationBell notifications={notifs} onMarkAllRead={markAll} />
 */
export default function Header({ onMenuToggle }) {
  return (
    // left-0 on mobile (full width), left-64 on desktop (offset by sidebar)
    <header
      className="fixed top-0 right-0 left-0 md:left-64 z-20 flex h-16 items-center gap-2 border-b border-border bg-background/90 backdrop-blur-sm"
      style={{
        paddingLeft: 'max(1rem, env(safe-area-inset-left))',
        paddingRight: 'max(1rem, env(safe-area-inset-right))',
      }}
    >
      {/* Hamburger — visible on mobile only */}
      <button
        onClick={onMenuToggle}
        className="md:hidden flex items-center justify-center rounded-lg p-2 -ml-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        aria-label="Toggle navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex-1" />

      <ThemeToggle />

      {/* @custom: pass notifications={[...]} to show real data */}
      <NotificationBell />

      <UserMenu />
    </header>
  )
}
