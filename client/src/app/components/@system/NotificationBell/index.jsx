import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Bell, CheckCheck, Circle } from 'lucide-react'
import { cn } from '@/app/lib/@system/utils'

/**
 * NotificationBell — in-app notification center in the header.
 *
 * Props:
 *   notifications  {Array?}    — notification objects. Default: [].
 *   onMarkAllRead  {function?} — called when "Mark all read" is clicked.
 *
 * Notification object shape:
 *   {
 *     id:     string,
 *     title:  string,
 *     body?:  string,
 *     time?:  string,   — relative string, e.g. '2 min ago'
 *     read?:  boolean,
 *     href?:  string,   — optional link target
 *   }
 *
 * @custom: fetch notifications from your API and pass as props.
 * Example:
 *   const [notifs, setNotifs] = useState([])
 *   useEffect(() => {
 *     fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } })
 *       .then(r => r.json())
 *       .then(d => setNotifs(d.notifications))
 *   }, [])
 *   <NotificationBell notifications={notifs} onMarkAllRead={markAll} />
 *
 * Example API endpoints to implement:
 *   GET    /api/notifications           → { notifications: [...] }
 *   POST   /api/notifications/read-all  → mark all as read
 *   PATCH  /api/notifications/:id       → { read: true }
 */
export default function NotificationBell({ notifications = [], onMarkAllRead }) {
  const unread = notifications.filter(n => !n.read).length

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="relative flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background"
          aria-label={
            unread > 0
              ? `${unread} unread notification${unread === 1 ? '' : 's'}`
              : 'Notifications'
          }
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          {unread > 0 && (
            <span
              className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground leading-none"
              aria-hidden="true"
            >
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-[320px] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card shadow-lg animate-in fade-in-0 zoom-in-95 duration-150 overflow-hidden"
        >
          {/* Header row */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
            {unread > 0 && onMarkAllRead && (
              <DropdownMenu.Item
                onSelect={onMarkAllRead}
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors cursor-pointer select-none outline-none"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Mark all read
              </DropdownMenu.Item>
            )}
          </div>

          {notifications.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <div className="rounded-full bg-muted p-3 mb-3">
                <Bell className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              </div>
              <p className="text-sm font-medium text-foreground">No notifications</p>
              <p className="text-xs text-muted-foreground mt-1">You're all caught up.</p>
            </div>
          ) : (
            /* Notification list */
            <ul className="max-h-80 overflow-y-auto py-1" role="list">
              {notifications.map(({ id, title, body, time, read, href }) => {
                const inner = (
                  <div
                    className={cn(
                      'flex items-start gap-3 px-4 py-3',
                      read ? 'opacity-60' : ''
                    )}
                  >
                    <div className="mt-1 shrink-0">
                      <Circle
                        className={cn(
                          'h-2 w-2',
                          read
                            ? 'text-muted-foreground/40 fill-muted-foreground/40'
                            : 'text-primary fill-primary'
                        )}
                        aria-hidden="true"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground leading-snug">{title}</p>
                      {body && (
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{body}</p>
                      )}
                      {time && (
                        <p className="text-[11px] text-muted-foreground/60 mt-1">{time}</p>
                      )}
                    </div>
                  </div>
                )

                return (
                  <li key={id} className="border-b border-border last:border-0">
                    <DropdownMenu.Item asChild>
                      {href ? (
                        <a
                          href={href}
                          className="block outline-none hover:bg-accent/50 transition-colors"
                        >
                          {inner}
                        </a>
                      ) : (
                        <div className="outline-none">{inner}</div>
                      )}
                    </DropdownMenu.Item>
                  </li>
                )
              })}
            </ul>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
