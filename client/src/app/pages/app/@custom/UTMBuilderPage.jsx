// @custom — Linkforge: UTM Builder with campaign tracking
import { useState, useMemo, useEffect } from 'react'
import { Link2, Copy, Check, Wand2, RotateCcw, BarChart3, Tag, ChevronDown, ChevronUp } from 'lucide-react'
import { DashboardLayout } from '../../../components/@system/Dashboard'
import { LINKFORGE_NAV_ITEMS } from '../../../config/@custom/navigation'
import { Button } from '../../../components/@system/ui/button'
import { createLink, getUtmStats } from '../../../api/@custom/links'

const UTM_PARAMS = [
  { key: 'utm_source', label: 'Source', placeholder: 'google, newsletter, twitter', required: true, hint: 'Where the traffic comes from' },
  { key: 'utm_medium', label: 'Medium', placeholder: 'cpc, email, social', required: true, hint: 'Marketing medium' },
  { key: 'utm_campaign', label: 'Campaign', placeholder: 'spring_sale, product_launch', required: true, hint: 'Campaign name' },
  { key: 'utm_term', label: 'Term', placeholder: 'running+shoes', required: false, hint: 'Paid search keyword (optional)' },
  { key: 'utm_content', label: 'Content', placeholder: 'header_cta, sidebar_banner', required: false, hint: 'Differentiate similar content (optional)' },
]

const PRESETS = [
  { name: 'Google Ads', icon: '🔍', values: { utm_source: 'google', utm_medium: 'cpc' } },
  { name: 'Facebook', icon: '📘', values: { utm_source: 'facebook', utm_medium: 'social' } },
  { name: 'Twitter/X', icon: '🐦', values: { utm_source: 'twitter', utm_medium: 'social' } },
  { name: 'Newsletter', icon: '📧', values: { utm_source: 'newsletter', utm_medium: 'email' } },
  { name: 'LinkedIn', icon: '💼', values: { utm_source: 'linkedin', utm_medium: 'social' } },
  { name: 'Instagram', icon: '📸', values: { utm_source: 'instagram', utm_medium: 'social' } },
]

function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1">
      {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
      {copied ? 'Copied' : label}
    </Button>
  )
}

function UtmStatsPanel({ stats }) {
  const [expanded, setExpanded] = useState(false)

  if (!stats || stats.length === 0) return null

  const displayed = expanded ? stats : stats.slice(0, 5)

  return (
    <div className="border rounded-lg p-4 bg-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <BarChart3 size={16} />
          Campaign Performance
        </h3>
        <span className="text-xs text-muted-foreground">{stats.length} campaigns</span>
      </div>
      <div className="space-y-2">
        {displayed.map((s, i) => (
          <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/30 text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <Tag size={12} className="text-muted-foreground shrink-0" />
              <span className="font-medium truncate">{s.utm_campaign}</span>
              <span className="text-xs text-muted-foreground shrink-0">
                {s.utm_source}/{s.utm_medium}
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-2">
              <span className="text-xs text-muted-foreground">{s.link_count} links</span>
              <span className="font-medium tabular-nums">{Number(s.total_clicks).toLocaleString()} clicks</span>
            </div>
          </div>
        ))}
      </div>
      {stats.length > 5 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-xs text-primary hover:underline flex items-center gap-1"
        >
          {expanded ? <><ChevronUp size={12} /> Show less</> : <><ChevronDown size={12} /> Show all {stats.length} campaigns</>}
        </button>
      )}
    </div>
  )
}

export function UTMBuilderPage() {
  const [baseUrl, setBaseUrl] = useState('')
  const [params, setParams] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [utmStats, setUtmStats] = useState([])
  const [statsLoading, setStatsLoading] = useState(true)

  // Load UTM campaign stats on mount
  useEffect(() => {
    getUtmStats()
      .then((res) => setUtmStats(res.stats || []))
      .catch(() => {})
      .finally(() => setStatsLoading(false))
  }, [saved]) // Reload after saving a new link

  const generatedUrl = useMemo(() => {
    if (!baseUrl) return ''
    try {
      const url = new URL(baseUrl)
      Object.entries(params).forEach(([key, val]) => {
        if (val?.trim()) url.searchParams.set(key, val.trim())
      })
      return url.toString()
    } catch {
      return ''
    }
  }, [baseUrl, params])

  const handleParam = (key, value) => {
    setParams((p) => ({ ...p, [key]: value }))
  }

  const applyPreset = (preset) => {
    setParams((p) => ({ ...p, ...preset.values }))
  }

  const handleReset = () => {
    setParams({})
    setBaseUrl('')
    setSaved(false)
    setError('')
  }

  const handleCreateShortLink = async () => {
    if (!generatedUrl) return
    setSaving(true)
    setError('')
    try {
      await createLink({
        target_url: generatedUrl,
        description: `UTM: ${params.utm_campaign || 'campaign'}`,
        utm_source: params.utm_source || null,
        utm_medium: params.utm_medium || null,
        utm_campaign: params.utm_campaign || null,
        utm_term: params.utm_term || null,
        utm_content: params.utm_content || null,
      })
      setSaved(true)
    } catch (err) {
      setError(err?.message || 'Failed to create short link')
    } finally {
      setSaving(false)
    }
  }

  const hasRequiredParams = params.utm_source?.trim() && params.utm_medium?.trim() && params.utm_campaign?.trim()

  return (
    <DashboardLayout navItems={LINKFORGE_NAV_ITEMS}>
      <div className="space-y-6 max-w-2xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wand2 size={24} />
            UTM Builder
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build campaign-tracked URLs with UTM parameters, then shorten them with one click
          </p>
        </div>

        {/* Quick Presets */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
            Quick Presets
          </label>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className="px-3 py-1.5 text-sm border rounded-full hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-1.5"
              >
                <span>{preset.icon}</span>
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Base URL */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Destination URL *
          </label>
          <input
            type="url"
            value={baseUrl}
            onChange={(e) => { setBaseUrl(e.target.value); setSaved(false) }}
            placeholder="https://example.com/landing-page"
            className="w-full px-3 py-2 border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* UTM Parameters */}
        <div className="space-y-3">
          {UTM_PARAMS.map(({ key, label, placeholder, required, hint }) => (
            <div key={key}>
              <label className="block text-sm font-medium mb-1">
                {label} {required && '*'}
              </label>
              <input
                type="text"
                value={params[key] || ''}
                onChange={(e) => handleParam(key, e.target.value)}
                placeholder={placeholder}
                className="w-full px-3 py-2 border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
            </div>
          ))}
        </div>

        {/* Generated URL */}
        {generatedUrl && (
          <div className="border rounded-lg p-4 bg-card space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Generated URL</h3>
              <CopyButton text={generatedUrl} />
            </div>
            <p className="text-sm font-mono break-all text-muted-foreground bg-muted/50 rounded p-2">
              {generatedUrl}
            </p>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleCreateShortLink}
                disabled={saving || saved || !hasRequiredParams}
                className="gap-2"
                size="sm"
              >
                <Link2 size={14} />
                {saved ? 'Short link created' : saving ? 'Creating...' : 'Create Short Link'}
              </Button>
              {saved && <span className="text-xs text-green-500 flex items-center gap-1"><Check size={12} /> Added to your links with UTM data</span>}
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        )}

        {/* Reset */}
        <div className="flex justify-end">
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw size={14} />
            Reset
          </Button>
        </div>

        {/* UTM Campaign Stats */}
        {!statsLoading && <UtmStatsPanel stats={utmStats} />}
      </div>
    </DashboardLayout>
  )
}
