import { useState, useEffect, useCallback } from 'react'
import { Sun, Moon } from 'lucide-react'

/**
 * ThemeToggle — dark/light mode toggle switch for product dashboards.
 *
 * Renders as a pill-shaped toggle with smooth icon transition.
 * Persists preference to localStorage and respects system preference on first visit.
 * Applies .dark class to <html> element for Tailwind dark: variants.
 *
 * WCAG AA: focus-visible ring, aria-label, reduced-motion support.
 */

const STORAGE_KEY = 'theme'

function getInitialTheme() {
  if (typeof window === 'undefined') return 'light'
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  localStorage.setItem(STORAGE_KEY, theme)
}

export default function ThemeToggle({ className = '' }) {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // Listen for system preference changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    function handleChange(e) {
      const stored = localStorage.getItem(STORAGE_KEY)
      // Only auto-switch if user hasn't manually set a preference
      if (!stored) {
        setTheme(e.matches ? 'dark' : 'light')
      }
    }
    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [])

  const toggle = useCallback(() => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggle}
      className={[
        'relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full',
        'border border-border bg-secondary transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'motion-reduce:transition-none',
        className,
      ].filter(Boolean).join(' ')}
    >
      {/* Track icons */}
      <Sun
        className="absolute left-1.5 h-3.5 w-3.5 text-muted-foreground transition-opacity"
        style={{ opacity: isDark ? 0.4 : 0 }}
        aria-hidden="true"
      />
      <Moon
        className="absolute right-1.5 h-3.5 w-3.5 text-muted-foreground transition-opacity"
        style={{ opacity: isDark ? 0 : 0.4 }}
        aria-hidden="true"
      />
      {/* Thumb */}
      <span
        className={[
          'pointer-events-none flex h-6 w-6 items-center justify-center rounded-full bg-background shadow-sm ring-0',
          'transition-transform motion-reduce:transition-none',
          isDark ? 'translate-x-7' : 'translate-x-0.5',
        ].join(' ')}
      >
        {isDark ? (
          <Moon className="h-3.5 w-3.5 text-foreground" aria-hidden="true" />
        ) : (
          <Sun className="h-3.5 w-3.5 text-foreground" aria-hidden="true" />
        )}
      </span>
    </button>
  )
}
