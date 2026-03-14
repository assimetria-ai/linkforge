// @custom — Linkforge Dashboard: link stats, recent links, click analytics
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Link2,
  MousePointerClick,
  TrendingUp,
  Globe,
  Plus,
  BarChart3,
  ExternalLink,
  Copy,
  Clock,
  AlertTriangle,
  Users,
  Wand2,
} from 'lucide-react'
import { useAuthContext } from '../../../store/@system/auth'
import { HomePageSkeleton } from '../../../components/@system/Skeleton/Skeleton'
import { Button } from '../../../components/@system/ui/button'
import {
  DashboardLayout,
  StatCard,
  StatCardGrid,
  RecentActivityList,
  QuickActions,
  DataTable,
  WelcomeCard,
} from '../../../components/@system/Dashboard'
import { getLinks, getTopLinks, getExpiringLinks } from '../../../api/@custom/links'
import { api } from '../../../lib/@system/api'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function formatNumber(n) {
  if (n === null || n === undefined) return '0'
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(n)
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuthContext()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalLinks: 0, totalClicks: 0, uniqueVisitors: 0, topCountries: 0 })
  const [recentLinks, setRecentLinks] = useState([])
  const [topLinks, setTopLinks] = useState([])
  const [expiringLinks, setExpiringLinks] = useState([])
  const [error, setError] = useState(null)

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [linksRes, topRes, expiringRes, summaryRes] = await Promise.allSettled([
        getLinks({ limit: 10, offset: 0 }),
        getTopLinks({ limit: 5 }),
        getExpiringLinks({ days: 7 }),
        api.get('/analytics/summary'),
      ])

      // Recent links — response shape: { links: [...], total: n }
      const recentLinksList = linksRes.status === 'fulfilled' ? (linksRes.value?.links || []) : []
      if (recentLinksList.length > 0 || linksRes.status === 'fulfilled') {
        setRecentLinks(recentLinksList.slice(0, 10))
      }

      // Top links — response shape: { links: [...] }
      if (topRes.status === 'fulfilled' && topRes.value?.links) {
        setTopLinks(topRes.value.links.slice(0, 5))
      }

      // Expiring links — response shape: { links: [...] }
      if (expiringRes.status === 'fulfilled' && expiringRes.value?.links) {
        setExpiringLinks(expiringRes.value.links.slice(0, 5))
      }

      // Analytics summary — response shape: { links: { total_links, total_clicks, ... } }
      if (summaryRes.status === 'fulfilled' && summaryRes.value?.links) {
        const summary = summaryRes.value.links
        setStats({
          totalLinks: summary.total_links || linksRes.value?.total || recentLinksList.length || 0,
          totalClicks: summary.total_clicks || 0,
          uniqueVisitors: summary.unique_visitors || 0,
          topCountries: summary.top_countries?.length || 0,
        })
      } else {
        // Fallback: derive stats from links list
        setStats(prev => ({
          ...prev,
          totalLinks: linksRes.value?.total || recentLinksList.length || prev.totalLinks,
        }))
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  if (loading) {
    return <HomePageSkeleton />
  }

  // ─── Quick Actions ───────────────────────────────────────────────────────

  const quickActions = [
    {
      id: 'create-link',
      icon: Plus,
      label: 'Create Link',
      onClick: () => navigate('/app/links'),
    },
    {
      id: 'utm-builder',
      icon: Wand2,
      label: 'UTM Builder',
      onClick: () => navigate('/app/utm'),
    },
    {
      id: 'view-analytics',
      icon: BarChart3,
      label: 'View Analytics',
      onClick: () => navigate('/app/links'),
    },
    {
      id: 'manage-teams',
      icon: Users,
      label: 'Manage Teams',
      onClick: () => navigate('/app/teams'),
    },
    {
      id: 'custom-domains',
      icon: Globe,
      label: 'Custom Domains',
      onClick: () => navigate('/app/domains'),
    },
  ]

  // ─── Activity Feed from recent links ──────────────────────────────────────

  const activityItems = recentLinks.slice(0, 5).map((link, i) => ({
    id: link.id || i,
    icon: Link2,
    title: link.title || link.original_url || 'New link created',
    description: link.slug ? `/${link.slug}` : link.short_url || '',
    timestamp: link.created_at || new Date().toISOString(),
    variant: 'default',
  }))

  // ─── Top Links Table ──────────────────────────────────────────────────────

  const topLinksColumns = [
    {
      key: 'title',
      label: 'Link',
      sortable: false,
      render: (value, row) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-sm truncate max-w-[200px]">
            {value || row.original_url || 'Untitled'}
          </span>
          <span className="text-xs text-muted-foreground truncate max-w-[200px]">
            /{row.slug || ''}
          </span>
        </div>
      ),
    },
    {
      key: 'clicks',
      label: 'Clicks',
      sortable: true,
      render: (value) => (
        <span className="font-semibold tabular-nums">{formatNumber(value || 0)}</span>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (value) => (
        <span className="text-xs text-muted-foreground">{timeAgo(value)}</span>
      ),
    },
  ]

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <DashboardLayout
      title="Dashboard"
      subtitle={`Welcome back${user?.name ? `, ${user.name}` : ''}`}
      actions={
        <Button onClick={() => navigate('/app/links')} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          New Link
        </Button>
      }
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
          <button onClick={fetchDashboardData} className="ml-auto underline text-xs">
            Retry
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div data-tour="stats">
        <StatCardGrid>
          <StatCard
            title="Total Links"
            value={formatNumber(stats.totalLinks)}
            icon={Link2}
            description="All time"
          />
          <StatCard
            title="Total Clicks"
            value={formatNumber(stats.totalClicks)}
            icon={MousePointerClick}
            description="All time"
          />
          <StatCard
            title="Unique Visitors"
            value={formatNumber(stats.uniqueVisitors)}
            icon={TrendingUp}
            description="All time"
          />
          <StatCard
            title="Countries"
            value={formatNumber(stats.topCountries)}
            icon={Globe}
            description="Reached"
          />
        </StatCardGrid>
      </div>

      {/* Expiring Links Warning */}
      {expiringLinks.length > 0 && (
        <div className="mt-6 p-4 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              {expiringLinks.length} link{expiringLinks.length !== 1 ? 's' : ''} expiring soon
            </h3>
          </div>
          <div className="space-y-1">
            {expiringLinks.slice(0, 3).map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-400"
              >
                <span className="truncate max-w-[60%]">/{link.slug || 'untitled'}</span>
                <span>{link.expires_at ? new Date(link.expires_at).toLocaleDateString() : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-6" data-tour="quick-actions">
        <QuickActions actions={quickActions} />
      </div>

      {/* Main Content Grid */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div data-tour="activity">
          <RecentActivityList
            activities={activityItems.length > 0 ? activityItems : [{
              id: 0,
              icon: Link2,
              title: 'No links yet',
              description: 'Create your first short link to get started',
              timestamp: new Date().toISOString(),
              variant: 'default',
            }]}
            title="Recent Links"
          />
        </div>

        {/* Top Performing Links */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Top Performing Links</h3>
          {topLinks.length > 0 ? (
            <DataTable
              data={topLinks}
              columns={topLinksColumns}
              pageSize={5}
              emptyMessage="No link data yet"
            />
          ) : (
            <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>No click data yet</p>
              <p className="text-xs mt-1">Create and share links to see analytics here</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

export default DashboardPage
