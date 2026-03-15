import { useState, useEffect, useRef } from 'react'
import { RefreshCw, AlertCircle, Terminal } from 'lucide-react'
import { cn } from '@/app/lib/@system/utils'

const LEVELS = ['all', 'trace', 'debug', 'info', 'warn', 'error', 'fatal']

const LEVEL_STYLES = {
  trace: { dot: 'bg-gray-400',    text: 'text-gray-500 dark:text-gray-400',              row: '' },
  debug: { dot: 'bg-blue-400',    text: 'text-blue-600 dark:text-blue-400',               row: '' },
  info:  { dot: 'bg-emerald-400', text: 'text-emerald-600 dark:text-emerald-400',         row: '' },
  warn:  { dot: 'bg-amber-400',   text: 'text-amber-600 dark:text-amber-400',             row: 'bg-amber-500/5' },
  error: { dot: 'bg-red-400',     text: 'text-red-600 dark:text-red-400',                 row: 'bg-red-500/5' },
  fatal: { dot: 'bg-red-600',     text: 'text-red-700 dark:text-red-300 font-semibold',   row: 'bg-red-500/10' },
}

function getToken() {
  return localStorage.getItem('app_jwt')
}

function formatTime(ts) {
  if (!ts) return ''
  try {
    return new Date(ts).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return ''
  }
}

function LevelBadge({ level }) {
  const s = LEVEL_STYLES[level] || LEVEL_STYLES.info
  return (
    <span className={cn('inline-flex items-center gap-1 font-mono text-xs font-medium uppercase', s.text)}>
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', s.dot)} aria-hidden="true" />
      {level}
    </span>
  )
}

export default function Logs() {
  const [level, setLevel] = useState('all')
  const [entries, setEntries] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const intervalRef = useRef(null)

  async function fetchLogs(lvl) {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ limit: '200' })
      if (lvl !== 'all') params.set('level', lvl)
      const res = await fetch(`/api/logs?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (!res.ok) throw new Error('Failed to load logs.')
      const data = await res.json()
      // API returns oldest-first; reverse for newest-first display
      setEntries([...(data.entries || [])].reverse())
      setTotal(data.total || 0)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLogs(level) }, [level]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!autoRefresh) {
      clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = setInterval(() => fetchLogs(level), 5000)
    return () => clearInterval(intervalRef.current)
  }, [autoRefresh, level]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Logs</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Structured application logs from the in-memory ring buffer.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Level filter */}
        <div className="flex flex-wrap gap-1.5">
          {LEVELS.map(l => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              className={cn(
                'rounded-lg border px-2.5 py-1 text-xs font-medium capitalize transition-colors',
                level === l
                  ? 'border-primary bg-primary/5 text-foreground'
                  : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <button
              type="button"
              role="switch"
              aria-checked={autoRefresh}
              onClick={() => setAutoRefresh(v => !v)}
              className={cn(
                'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
                autoRefresh ? 'bg-primary' : 'bg-muted'
              )}
            >
              <span
                className={cn(
                  'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
                  autoRefresh ? 'translate-x-4' : 'translate-x-0.5'
                )}
              />
            </button>
            <span className="text-xs text-muted-foreground">Auto-refresh</span>
          </label>
          <button
            onClick={() => fetchLogs(level)}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40 transition-colors"
          >
            <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} aria-hidden="true" />
            Refresh
          </button>
        </div>
      </div>

      {!error && entries.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Showing {entries.length} entries{total > 0 && ` · ${total} total in buffer`}
        </p>
      )}

      {/* Log entries */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {error ? (
          <div className="flex items-center gap-2 px-5 py-4">
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : loading && entries.length === 0 ? (
          <div className="space-y-px p-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-9 rounded bg-muted animate-pulse" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-3 mb-3">
              <Terminal className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-foreground">No log entries</p>
            <p className="text-xs text-muted-foreground mt-1">
              Entries appear here as the application runs.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile card list — visible below sm breakpoint */}
            <ul className="sm:hidden divide-y divide-border" role="list">
              {entries.map((entry, i) => {
                const s = LEVEL_STYLES[entry.levelLabel] || {}
                return (
                  <li key={i} className={cn('px-4 py-3', s.row)}>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <LevelBadge level={entry.levelLabel} />
                      <span className="text-xs font-mono text-muted-foreground shrink-0">
                        {formatTime(entry.time)}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-foreground break-all leading-relaxed">
                      {entry.msg || entry.message || JSON.stringify(entry)}
                      {entry.err?.message && (
                        <span className="text-destructive/80"> — {entry.err.message}</span>
                      )}
                    </p>
                  </li>
                )
              })}
            </ul>

            {/* Desktop table — visible on sm+ */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground w-24 whitespace-nowrap">
                      Time
                    </th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground w-20">
                      Level
                    </th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                      Message
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, i) => {
                    const s = LEVEL_STYLES[entry.levelLabel] || {}
                    return (
                      <tr
                        key={i}
                        className={cn(
                          'border-b border-border/50 hover:bg-accent/30 transition-colors',
                          s.row
                        )}
                      >
                        <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                          {formatTime(entry.time)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <LevelBadge level={entry.levelLabel} />
                        </td>
                        <td className="px-4 py-2 text-foreground break-all">
                          {entry.msg || entry.message || JSON.stringify(entry)}
                          {entry.err?.message && (
                            <span className="ml-2 text-destructive/80">— {entry.err.message}</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
