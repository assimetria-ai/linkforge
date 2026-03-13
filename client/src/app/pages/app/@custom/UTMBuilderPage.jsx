// @custom — Linkforge: UTM Builder
import { useState, useMemo } from 'react'
import { Link2, Copy, Check, Wand2, RotateCcw } from 'lucide-react'
import { DashboardLayout } from '../../../components/@system/Dashboard'
import { LINKFORGE_NAV_ITEMS } from '../../../config/@custom/navigation'
import { Button } from '../../../components/@system/ui/button'
import { createLink } from '../../../api/@custom/links'

const UTM_PARAMS = [
  { key: 'utm_source', label: 'Source', placeholder: 'google, newsletter, twitter', required: true, hint: 'Where the traffic comes from' },
  { key: 'utm_medium', label: 'Medium', placeholder: 'cpc, email, social', required: true, hint: 'Marketing medium' },
  { key: 'utm_campaign', label: 'Campaign', placeholder: 'spring_sale, product_launch', required: true, hint: 'Campaign name' },
  { key: 'utm_term', label: 'Term', placeholder: 'running+shoes', required: false, hint: 'Paid search keyword (optional)' },
  { key: 'utm_content', label: 'Content', placeholder: 'header_cta, sidebar_banner', required: false, hint: 'Differentiate similar content (optional)' },
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

export function UTMBuilderPage() {
  const [baseUrl, setBaseUrl] = useState('')
  const [params, setParams] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

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
      await createLink({ target_url: generatedUrl, description: `UTM: ${params.utm_campaign || 'campaign'}` })
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
              {saved && <span className="text-xs text-green-500 flex items-center gap-1"><Check size={12} /> Added to your links</span>}
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
      </div>
    </DashboardLayout>
  )
}
