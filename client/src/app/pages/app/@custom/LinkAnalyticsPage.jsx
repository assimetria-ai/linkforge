// @custom — Linkforge: Link Analytics Dashboard with click tracking
import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Link2, BarChart3, Globe, Copy, Check, ExternalLink,
  TrendingUp, MousePointer, Monitor, Smartphone, Tablet, Users,
  Clock, MapPin, ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react'
import { DashboardLayout } from '../../../components/@system/Dashboard'
import { LINKFORGE_NAV_ITEMS } from '../../../config/@custom/navigation'
import { Button } from '../../../components/@system/ui/button'
import { getLink, getLinkAnalytics, getLinkClickEvents } from '../../../api/@custom/links'
import { QrCodePanel } from '../../../components/@custom/QrCodePanel'

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

function StatBox({ icon: Icon, label, value, subValue, trend, color = 'text-primary' }) {
  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : Minus
  const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground'
  return (
    <div className="border rounded-lg p-4 bg-card">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className={color} />
        <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {subValue && (
        <div className="flex items-center gap-1 mt-1">
          {trend && <TrendIcon size={12} className={trendColor} />}
          <span className={`text-xs ${trendColor}`}>{subValue}</span>
        </div>
      )}
    </div>
  )
}

// ─── Simple bar chart (CSS-based, no deps) ───────────────────────────────────

function MiniBarChart({ data, labelKey = 'label', valueKey = 'count', maxBars = 10, color = 'bg-primary' }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
  }
  const sorted = [...data].sort((a, b) => b[valueKey] - a[valueKey]).slice(0, maxBars)
  const max = Math.max(...sorted.map(d => d[valueKey]), 1)

  return (
    <div className="space-y-2">
      {sorted.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-28 truncate text-right" title={item[labelKey]}>
            {item[labelKey] || 'Direct'}
          </span>
          <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
            <div
              className={`h-full ${color} rounded-full transition-all duration-500`}
              style={{ width: `${(item[valueKey] / max) * 100}%`, minWidth: item[valueKey] > 0 ? '2px' : '0' }}
            />
          </div>
          <span className="text-xs font-mono font-medium w-12 text-right">{item[valueKey].toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Timeline sparkline ──────────────────────────────────────────────────────

function TimelineChart({ data }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No click data yet</p>
  }

  const max = Math.max(...data.map(d => d.clicks), 1)
  const barWidth = Math.max(4, Math.floor(100 / data.length))

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-px h-32 w-full">
        {data.map((d, i) => (
          <div
            key={i}
            className="flex-1 bg-primary/80 hover:bg-primary rounded-t transition-all duration-200 cursor-default group relative"
            style={{ height: `${Math.max((d.clicks / max) * 100, 2)}%` }}
            title={`${d.date}: ${d.clicks} clicks`}
          >
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-popover border rounded px-2 py-1 text-xs shadow-md whitespace-nowrap z-10">
              <div className="font-medium">{d.clicks} clicks</div>
              <div className="text-muted-foreground">{d.date}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  )
}

// ─── Recent clicks table ─────────────────────────────────────────────────────

function RecentClicksTable({ events }) {
  if (!events || events.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">No clicks recorded yet</p>
  }

  const getDeviceIcon = (ua) => {
    if (!ua) return Monitor
    const lower = ua.toLowerCase()
    if (lower.includes('mobile') || lower.includes('iphone') || lower.includes('android')) return Smartphone
    if (lower.includes('tablet') || lower.includes('ipad')) return Tablet
    return Monitor
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2 pr-4 text-xs text-muted-foreground font-medium">Time</th>
            <th className="py-2 pr-4 text-xs text-muted-foreground font-medium">Device</th>
            <th className="py-2 pr-4 text-xs text-muted-foreground font-medium">Location</th>
            <th className="py-2 pr-4 text-xs text-muted-foreground font-medium">Referrer</th>
          </tr>
        </thead>
        <tbody>
          {events.map((evt, i) => {
            const DeviceIcon = getDeviceIcon(evt.user_agent)
            return (
              <tr key={i} className="border-b border-border/50 hover:bg-muted/50">
                <td className="py-2 pr-4 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} className="text-muted-foreground" />
                    <span className="text-xs">{new Date(evt.created_at).toLocaleString()}</span>
                  </div>
                </td>
                <td className="py-2 pr-4">
                  <DeviceIcon size={14} className="text-muted-foreground" />
                </td>
                <td className="py-2 pr-4">
                  <div className="flex items-center gap-1.5">
                    <MapPin size={12} className="text-muted-foreground" />
                    <span className="text-xs">{evt.country || evt.ip_country || 'Unknown'}</span>
                  </div>
                </td>
                <td className="py-2 pr-4">
                  <span className="text-xs text-muted-foreground truncate max-w-[200px] block">
                    {evt.referrer || 'Direct'}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function LinkAnalyticsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [link, setLink] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [days, setDays] = useState(30)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const [linkData, analyticsData, eventsData] = await Promise.all([
          getLink(id),
          getLinkAnalytics(id, { days }).catch(() => null),
          getLinkClickEvents(id, { limit: 20 }).catch(() => ({ events: [] })),
        ])
        setLink(linkData.link || linkData)
        setAnalytics(analyticsData)
        setEvents(eventsData.events || [])
      } catch (err) {
        setError('Link not found')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, days])

  if (loading) {
    return (
      <DashboardLayout navItems={LINKFORGE_NAV_ITEMS}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-48" />
          <div className="h-4 bg-muted rounded w-72" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-muted rounded-lg" />)}
          </div>
          <div className="h-40 bg-muted rounded-lg" />
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
  const bounceRate = totalClicks > 0 && uniqueVisitors > 0
    ? `${((1 - uniqueVisitors / totalClicks) * 100).toFixed(0)}% returning`
    : null

  return (
    <DashboardLayout navItems={LINKFORGE_NAV_ITEMS}>
      <div className="space-y-6">
        {/* Back + Header */}
        <div>
          <button onClick={() => navigate('/app/links')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft size={16} />
            Back to Links
          </button>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Link2 size={20} className="text-primary" />
                <h1 className="text-xl font-bold font-mono">{shortUrl}</h1>
                <CopyButton text={shortUrl} />
              </div>
              <a href={link.target_url} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground mt-1 flex items-center gap-1">
                <ExternalLink size={12} />
                <span className="truncate max-w-md">{link.target_url}</span>
              </a>
              {link.description && (
                <p className="text-sm text-muted-foreground mt-1">{link.description}</p>
              )}
            </div>
            <span className={`px-2 py-1 text-xs rounded-full ${link.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
              {link.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatBox icon={MousePointer} label="Total Clicks" value={totalClicks.toLocaleString()} subValue={`${avgClicksPerDay}/day avg`} trend={totalClicks > 0 ? 'up' : undefined} />
          <StatBox icon={Users} label="Unique Visitors" value={uniqueVisitors.toLocaleString()} subValue={bounceRate} color="text-blue-500" />
          <StatBox icon={TrendingUp} label="Avg/Day" value={avgClicksPerDay} color="text-green-500" />
          <StatBox icon={Globe} label="Created" value={new Date(link.created_at).toLocaleDateString()} subValue={`${daysSinceCreation}d ago`} color="text-purple-500" />
        </div>

        {/* Timeline */}
        <div className="border rounded-lg p-4 bg-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <BarChart3 size={16} />
              Click Timeline
            </h3>
            <div className="flex gap-1">
              {[7, 14, 30, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`px-2 py-1 text-xs rounded ${days === d ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
          <TimelineChart data={analytics?.timeline} />
        </div>

        {/* Breakdown charts row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Referrers */}
          <div className="border rounded-lg p-4 bg-card">
            <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
              <ExternalLink size={16} />
              Top Referrers
            </h3>
            <MiniBarChart data={analytics?.referrers} labelKey="referrer" valueKey="count" color="bg-blue-500" />
          </div>

          {/* Countries */}
          <div className="border rounded-lg p-4 bg-card">
            <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
              <MapPin size={16} />
              Countries
            </h3>
            <MiniBarChart data={analytics?.countries} labelKey="country" valueKey="count" color="bg-green-500" />
          </div>
        </div>

        {/* Platforms */}
        <div className="border rounded-lg p-4 bg-card">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <Monitor size={16} />
            Platforms & Devices
          </h3>
          <MiniBarChart data={analytics?.platforms} labelKey="platform" valueKey="count" color="bg-purple-500" />
        </div>

        {/* Recent Clicks */}
        <div className="border rounded-lg p-4 bg-card">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <Clock size={16} />
            Recent Clicks
          </h3>
          <RecentClicksTable events={events} />
        </div>

        {/* QR Code */}
        <QrCodePanel linkId={link.id} slug={link.slug} />

        {/* Link Details */}
        <div className="border rounded-lg p-4 bg-card">
          <h3 className="text-sm font-medium mb-3">Link Details</h3>
          <dl className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
            <dt className="text-muted-foreground">Slug</dt>
            <dd className="font-mono">{link.slug}</dd>
            <dt className="text-muted-foreground">Destination</dt>
            <dd className="truncate">{link.target_url}</dd>
            <dt className="text-muted-foreground">Status</dt>
            <dd>{link.is_active ? 'Active' : 'Inactive'}</dd>
            {link.expires_at && (
              <>
                <dt className="text-muted-foreground">Expires</dt>
                <dd>{new Date(link.expires_at).toLocaleString()}</dd>
              </>
            )}
            {link.click_limit && (
              <>
                <dt className="text-muted-foreground">Click Limit</dt>
                <dd>{totalClicks} / {link.click_limit}</dd>
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
