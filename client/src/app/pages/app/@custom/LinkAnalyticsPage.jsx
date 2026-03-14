// @custom — Linkforge: Link Analytics Dashboard with real click data
import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Link2, BarChart3, Globe, Copy, Check, ExternalLink,
  TrendingUp, MousePointer, Monitor, Smartphone, Tablet, Clock,
  MapPin, RefreshCw, ArrowUpRight, Calendar, Users
} from 'lucide-react'
import { DashboardLayout } from '../../../components/@system/Dashboard'
import { LINKFORGE_NAV_ITEMS } from '../../../config/@custom/navigation'
import { Button } from '../../../components/@system/ui/button'
import { getLink } from '../../../api/@custom/links'
import { QrCodePanel } from '../../../components/@custom/QrCodePanel'
import { api } from '../../../lib/@system/api'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={handleCopy} className="inline-flex items-center gap-1 px-2 py-1 text-xs border rounded hover:bg-muted transition-colors">
      {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function StatBox({ icon: Icon, label, value, color = 'text-primary', subtitle }) {
  return (
    <div className="border rounded-lg p-4 bg-card">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className={color} />
        <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  )
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatPercent(count, total) {
  if (!total) return '0%'
  return `${Math.round((count / total) * 100)}%`
}

// ─── Bar Chart (simple CSS-based) ────────────────────────────────────────────

function SimpleBarChart({ data, labelKey = 'date', valueKey = 'clicks', maxBars = 30 }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No data available yet
      </div>
    )
  }

  const sliced = data.slice(-maxBars)
  const maxVal = Math.max(...sliced.map(d => d[valueKey] || 0), 1)

  return (
    <div className="flex items-end gap-1 h-40">
      {sliced.map((item, i) => {
        const val = item[valueKey] || 0
        const pct = (val / maxVal) * 100
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group" title={`${item[labelKey]}: ${val} clicks`}>
            <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              {val}
            </span>
            <div
              className="w-full bg-primary/80 rounded-t hover:bg-primary transition-colors min-h-[2px]"
              style={{ height: `${Math.max(pct, 2)}%` }}
            />
            {sliced.length <= 14 && (
              <span className="text-[9px] text-muted-foreground truncate w-full text-center">
                {formatDate(item[labelKey])}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Horizontal Bar List ─────────────────────────────────────────────────────

function HorizontalBarList({ items, labelKey = 'name', valueKey = 'count', icon: DefaultIcon, emptyText = 'No data yet' }) {
  if (!items || items.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">{emptyText}</p>
  }

  const maxVal = Math.max(...items.map(d => d[valueKey] || 0), 1)
  const total = items.reduce((sum, d) => sum + (d[valueKey] || 0), 0)

  return (
    <div className="space-y-2">
      {items.slice(0, 10).map((item, i) => {
        const val = item[valueKey] || 0
        const pct = (val / maxVal) * 100
        return (
          <div key={i} className="group">
            <div className="flex items-center justify-between text-sm mb-1">
              <div className="flex items-center gap-2 truncate">
                {DefaultIcon && <DefaultIcon size={14} className="text-muted-foreground flex-shrink-0" />}
                <span className="truncate">{item[labelKey] || 'Direct / Unknown'}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-muted-foreground text-xs">{formatPercent(val, total)}</span>
                <span className="font-medium tabular-nums">{val.toLocaleString()}</span>
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div className="bg-primary rounded-full h-1.5 transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Events Table ────────────────────────────────────────────────────────────

function ClickEventsTable({ events }) {
  if (!events || events.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">No click events recorded yet</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground text-xs">
            <th className="text-left py-2 pr-4">Time</th>
            <th className="text-left py-2 pr-4">Referrer</th>
            <th className="text-left py-2 pr-4">Country</th>
            <th className="text-left py-2 pr-4">Device</th>
            <th className="text-left py-2">Browser</th>
          </tr>
        </thead>
        <tbody>
          {events.map((evt, i) => (
            <tr key={evt.id || i} className="border-b last:border-0 hover:bg-muted/50">
              <td className="py-2 pr-4 whitespace-nowrap text-xs text-muted-foreground">
                {new Date(evt.clicked_at || evt.created_at).toLocaleString()}
              </td>
              <td className="py-2 pr-4 truncate max-w-[200px]">
                {evt.referrer ? (
                  <span className="text-xs">{new URL(evt.referrer).hostname}</span>
                ) : (
                  <span className="text-xs text-muted-foreground">Direct</span>
                )}
              </td>
              <td className="py-2 pr-4 text-xs">{evt.country || '—'}</td>
              <td className="py-2 pr-4 text-xs">{evt.device_type || evt.platform || '—'}</td>
              <td className="py-2 text-xs">{evt.browser || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function LinkAnalyticsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [link, setLink] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dateRange, setDateRange] = useState(30)
  const [refreshing, setRefreshing] = useState(false)
  const [showEvents, setShowEvents] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true)
      const [linkRes, analyticsRes, eventsRes] = await Promise.allSettled([
        getLink(id),
        api.get(`/analytics/links/${id}?days=${dateRange}`),
        api.get(`/analytics/links/${id}/events?limit=50`),
      ])

      if (linkRes.status === 'fulfilled') {
        setLink(linkRes.value?.link || linkRes.value?.data?.link || linkRes.value)
      }
      if (analyticsRes.status === 'fulfilled') {
        setAnalytics(analyticsRes.value?.data || analyticsRes.value)
      }
      if (eventsRes.status === 'fulfilled') {
        const evtData = eventsRes.value?.data || eventsRes.value
        setEvents(evtData?.events || [])
      }
    } catch (err) {
      setError('Failed to load analytics')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [id, dateRange])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <DashboardLayout navItems={LINKFORGE_NAV_ITEMS}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-48" />
          <div className="h-4 bg-muted rounded w-72" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-muted rounded-lg" />)}
          </div>
          <div className="h-48 bg-muted rounded-lg" />
        </div>
      </DashboardLayout>
    )
  }

  if (error || !link) {
    return (
      <DashboardLayout navItems={LINKFORGE_NAV_ITEMS}>
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">{error || 'Link not found'}</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/app/links')}>
            Back to Links
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  const shortUrl = `${window.location.origin}/${link.slug}`
  const totalClicks = analytics?.total_clicks ?? link.clicks ?? 0
  const uniqueVisitors = analytics?.unique_visitors ?? 0
  const daysSinceCreation = Math.max(1, Math.floor((Date.now() - new Date(link.created_at).getTime()) / (1000 * 60 * 60 * 24)))
  const avgClicksPerDay = (totalClicks / daysSinceCreation).toFixed(1)
  const conversionRate = totalClicks > 0 && uniqueVisitors > 0
    ? ((uniqueVisitors / totalClicks) * 100).toFixed(1)
    : '0'

  return (
    <DashboardLayout navItems={LINKFORGE_NAV_ITEMS}>
      <div className="space-y-6">
        {/* Back + Header */}
        <div>
          <button onClick={() => navigate('/app/links')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft size={16} />
            Back to Links
          </button>
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Link2 size={20} className="text-primary" />
                <h1 className="text-xl font-bold font-mono">{shortUrl}</h1>
                <CopyButton text={shortUrl} />
              </div>
              <a href={link.target_url || link.original_url} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground mt-1 flex items-center gap-1">
                <ExternalLink size={12} />
                {link.target_url || link.original_url}
              </a>
              {link.description && (
                <p className="text-sm text-muted-foreground mt-1">{link.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(Number(e.target.value))}
                className="text-xs border rounded px-2 py-1.5 bg-background"
              >
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
              <Button variant="outline" size="sm" onClick={fetchData} disabled={refreshing}>
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              </Button>
              <span className={`px-2 py-1 text-xs rounded-full ${link.is_active !== false ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                {link.is_active !== false ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatBox icon={MousePointer} label="Total Clicks" value={totalClicks.toLocaleString()} subtitle={`Last ${dateRange} days`} />
          <StatBox icon={Users} label="Unique Visitors" value={uniqueVisitors.toLocaleString()} color="text-violet-500" subtitle={`${conversionRate}% unique`} />
          <StatBox icon={TrendingUp} label="Avg/Day" value={avgClicksPerDay} color="text-green-500" subtitle="Clicks per day" />
          <StatBox icon={Calendar} label="Age" value={`${daysSinceCreation}d`} color="text-blue-500" subtitle={`Created ${new Date(link.created_at).toLocaleDateString()}`} />
        </div>

        {/* Click Timeline */}
        <div className="border rounded-lg p-4 bg-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 size={16} />
              Click Timeline
            </h3>
            <span className="text-xs text-muted-foreground">Last {dateRange} days</span>
          </div>
          <SimpleBarChart
            data={analytics?.timeline || []}
            labelKey="date"
            valueKey="clicks"
          />
        </div>

        {/* Breakdown Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Referrers */}
          <div className="border rounded-lg p-4 bg-card">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <ArrowUpRight size={16} />
              Top Referrers
            </h3>
            <HorizontalBarList
              items={analytics?.referrers || []}
              labelKey="referrer"
              valueKey="count"
              icon={ExternalLink}
              emptyText="No referrer data yet"
            />
          </div>

          {/* Countries */}
          <div className="border rounded-lg p-4 bg-card">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <MapPin size={16} />
              Top Countries
            </h3>
            <HorizontalBarList
              items={analytics?.countries || []}
              labelKey="country"
              valueKey="count"
              icon={Globe}
              emptyText="No geographic data yet"
            />
          </div>

          {/* Platforms / Devices */}
          <div className="border rounded-lg p-4 bg-card">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Monitor size={16} />
              Platforms
            </h3>
            <HorizontalBarList
              items={analytics?.platforms || []}
              labelKey="platform"
              valueKey="count"
              icon={Smartphone}
              emptyText="No platform data yet"
            />
          </div>
        </div>

        {/* QR Code */}
        <QrCodePanel linkId={link.id} slug={link.slug} />

        {/* Recent Click Events */}
        <div className="border rounded-lg p-4 bg-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Clock size={16} />
              Recent Click Events
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setShowEvents(!showEvents)}>
              {showEvents ? 'Hide' : 'Show'} Events
            </Button>
          </div>
          {showEvents && <ClickEventsTable events={events} />}
          {!showEvents && (
            <p className="text-xs text-muted-foreground">
              {events.length > 0 ? `${events.length} recent events recorded` : 'No events yet'} — click Show Events to view details
            </p>
          )}
        </div>

        {/* Link Details */}
        <div className="border rounded-lg p-4 bg-card">
          <h3 className="text-sm font-medium mb-3">Link Details</h3>
          <dl className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
            <dt className="text-muted-foreground">Slug</dt>
            <dd className="font-mono">{link.slug}</dd>
            <dt className="text-muted-foreground">Destination</dt>
            <dd className="truncate">{link.target_url || link.original_url}</dd>
            <dt className="text-muted-foreground">Status</dt>
            <dd>{link.is_active !== false ? 'Active' : 'Inactive'}</dd>
            {link.utm_source && (
              <>
                <dt className="text-muted-foreground">UTM Source</dt>
                <dd>{link.utm_source}</dd>
              </>
            )}
            {link.utm_medium && (
              <>
                <dt className="text-muted-foreground">UTM Medium</dt>
                <dd>{link.utm_medium}</dd>
              </>
            )}
            {link.utm_campaign && (
              <>
                <dt className="text-muted-foreground">UTM Campaign</dt>
                <dd>{link.utm_campaign}</dd>
              </>
            )}
            {link.expires_at && (
              <>
                <dt className="text-muted-foreground">Expires</dt>
                <dd>{new Date(link.expires_at).toLocaleString()}</dd>
              </>
            )}
            {link.click_limit && (
              <>
                <dt className="text-muted-foreground">Click Limit</dt>
                <dd>{link.click_limit}</dd>
              </>
            )}
            <dt className="text-muted-foreground">Created</dt>
            <dd>{new Date(link.created_at).toLocaleString()}</dd>
            <dt className="text-muted-foreground">Last Updated</dt>
            <dd>{link.updated_at ? new Date(link.updated_at).toLocaleString() : 'Never'}</dd>
          </dl>
        </div>
      </div>
    </DashboardLayout>
  )
}
