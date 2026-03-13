// @custom — Linkforge: Link Analytics Dashboard
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Link2, BarChart3, Globe, Copy, Check, ExternalLink, TrendingUp, MousePointer } from 'lucide-react'
import { DashboardLayout } from '../../../components/@system/Dashboard'
import { LINKFORGE_NAV_ITEMS } from '../../../config/@custom/navigation'
import { Button } from '../../../components/@system/ui/button'
import { getLink } from '../../../api/@custom/links'
import { QrCodePanel } from '../../../components/@custom/QrCodePanel'

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

function StatBox({ icon: Icon, label, value, color = 'text-primary' }) {
  return (
    <div className="border rounded-lg p-4 bg-card">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className={color} />
        <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}

export function LinkAnalyticsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [link, setLink] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const data = await getLink(id)
        setLink(data.link)
      } catch (err) {
        setError('Link not found')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) {
    return (
      <DashboardLayout navItems={LINKFORGE_NAV_ITEMS}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-48" />
          <div className="h-4 bg-muted rounded w-72" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-muted rounded-lg" />)}
          </div>
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
  const daysSinceCreation = Math.max(1, Math.floor((Date.now() - new Date(link.created_at).getTime()) / (1000 * 60 * 60 * 24)))
  const avgClicksPerDay = ((link.clicks || 0) / daysSinceCreation).toFixed(1)

  return (
    <DashboardLayout navItems={LINKFORGE_NAV_ITEMS}>
      <div className="space-y-6">
        {/* Back + Header */}
        <div>
          <button onClick={() => navigate('/app/links')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft size={16} />
            Back to Links
          </button>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Link2 size={20} className="text-primary" />
                <h1 className="text-xl font-bold font-mono">{shortUrl}</h1>
                <CopyButton text={shortUrl} />
              </div>
              <a href={link.target_url} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground mt-1 flex items-center gap-1">
                <ExternalLink size={12} />
                {link.target_url}
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatBox icon={MousePointer} label="Total Clicks" value={(link.clicks || 0).toLocaleString()} />
          <StatBox icon={TrendingUp} label="Avg Clicks/Day" value={avgClicksPerDay} color="text-green-500" />
          <StatBox icon={Globe} label="Created" value={new Date(link.created_at).toLocaleDateString()} color="text-blue-500" />
        </div>

        {/* QR Code */}
        <QrCodePanel linkId={link.id} slug={link.slug} />

        {/* Placeholder for future analytics */}
        <div className="border rounded-lg p-8 text-center bg-card">
          <BarChart3 size={48} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Detailed Analytics Coming Soon</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Click tracking by referrer, geography, device, and time will be available here.
            For now, total click counts are tracked in real-time.
          </p>
        </div>

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
