// @custom — Linkforge: Custom Domains Management
// Features: CRUD, DNS verification, health checks, white-label branding, workspace scoping
import { useState, useEffect, useCallback } from 'react'
import { Globe, Plus, Trash2, CheckCircle2, XCircle, Shield, RefreshCw, Star, Copy, Check, AlertCircle, Palette, Activity, Heart } from 'lucide-react'
import { DashboardLayout } from '../../../components/@system/Dashboard'
import { LINKFORGE_NAV_ITEMS } from '../../../config/@custom/navigation'
import { Button } from '../../../components/@system/ui/button'
import { useAuthContext } from '../../../store/@system/auth'
import { getDomains, addDomain, deleteDomain, verifyDomain, setPrimaryDomain, regenerateToken, runHealthCheck, updateDomainBranding } from '../../../api/@custom/domains'

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={handleCopy} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors" title="Copy">
      {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function SslBadge({ status }) {
  const config = {
    active: { color: 'text-green-600 bg-green-50', icon: Shield, label: 'SSL Active' },
    provisioning: { color: 'text-yellow-600 bg-yellow-50', icon: RefreshCw, label: 'Provisioning' },
    pending: { color: 'text-gray-500 bg-gray-50', icon: AlertCircle, label: 'Pending' },
    failed: { color: 'text-red-600 bg-red-50', icon: XCircle, label: 'Failed' },
  }
  const c = config[status] || config.pending
  const Icon = c.icon
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${c.color}`}>
      <Icon size={12} />
      {c.label}
    </span>
  )
}

function HealthBadge({ status, lastCheck, failures }) {
  const config = {
    healthy: { color: 'text-green-600 bg-green-50', icon: Heart, label: 'Healthy' },
    unhealthy: { color: 'text-red-600 bg-red-50', icon: XCircle, label: 'Unhealthy' },
    unknown: { color: 'text-gray-500 bg-gray-50', icon: Activity, label: 'Not checked' },
  }
  const c = config[status] || config.unknown
  const Icon = c.icon
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${c.color}`} title={lastCheck ? `Last check: ${new Date(lastCheck).toLocaleString()}${failures > 0 ? ` (${failures} consecutive failures)` : ''}` : 'Not checked yet'}>
      <Icon size={12} />
      {c.label}
    </span>
  )
}

function AddDomainModal({ open, onClose, onAdded }) {
  const [domain, setDomain] = useState('')
  const [method, setMethod] = useState('cname')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const result = await addDomain({ domain: domain.trim(), verification_method: method })
      onAdded(result)
      setDomain('')
      onClose()
    } catch (err) {
      setError(err?.message || 'Failed to add domain')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-card border rounded-lg shadow-xl w-full max-w-md p-6 mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Plus size={20} />
          Add Custom Domain
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Domain</label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="links.yourdomain.com"
              className="w-full px-3 py-2 border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Verification Method</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="method" value="cname" checked={method === 'cname'} onChange={(e) => setMethod(e.target.value)} />
                CNAME Record
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="method" value="txt" checked={method === 'txt'} onChange={(e) => setMethod(e.target.value)} />
                TXT Record
              </label>
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading || !domain.trim()}>
              {loading ? 'Adding...' : 'Add Domain'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function BrandingModal({ open, onClose, domain, onSaved }) {
  const currentBranding = domain?.branding || {}
  const [companyName, setCompanyName] = useState(currentBranding.company_name || '')
  const [logoUrl, setLogoUrl] = useState(currentBranding.logo_url || '')
  const [faviconUrl, setFaviconUrl] = useState(currentBranding.favicon_url || '')
  const [primaryColor, setPrimaryColor] = useState(currentBranding.primary_color || '#3A8BFD')
  const [bgColor, setBgColor] = useState(currentBranding.background_color || '#ffffff')
  const [poweredByHidden, setPoweredByHidden] = useState(currentBranding.powered_by_hidden || false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (domain?.branding) {
      const b = domain.branding
      setCompanyName(b.company_name || '')
      setLogoUrl(b.logo_url || '')
      setFaviconUrl(b.favicon_url || '')
      setPrimaryColor(b.primary_color || '#3A8BFD')
      setBgColor(b.background_color || '#ffffff')
      setPoweredByHidden(b.powered_by_hidden || false)
    }
  }, [domain])

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const branding = {
        company_name: companyName,
        logo_url: logoUrl,
        favicon_url: faviconUrl,
        primary_color: primaryColor,
        background_color: bgColor,
        powered_by_hidden: poweredByHidden,
      }
      await updateDomainBranding(domain.id, branding)
      onSaved()
      onClose()
    } catch (err) {
      setError(err?.message || 'Failed to save branding')
    } finally {
      setLoading(false)
    }
  }

  if (!open || !domain) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-card border rounded-lg shadow-xl w-full max-w-lg p-6 mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Palette size={20} />
          White-Label Branding
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Customize how {domain.domain} appears to your users
        </p>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Company Name</label>
            <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Your Company" className="w-full px-3 py-2 border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Logo URL</label>
            <input type="url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://yourdomain.com/logo.svg" className="w-full px-3 py-2 border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Favicon URL</label>
            <input type="url" value={faviconUrl} onChange={(e) => setFaviconUrl(e.target.value)} placeholder="https://yourdomain.com/favicon.ico" className="w-full px-3 py-2 border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Primary Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-9 w-12 rounded border cursor-pointer" />
                <input type="text" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="flex-1 px-3 py-2 border rounded-md bg-background text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Background Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="h-9 w-12 rounded border cursor-pointer" />
                <input type="text" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="flex-1 px-3 py-2 border rounded-md bg-background text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="powered-by" checked={poweredByHidden} onChange={(e) => setPoweredByHidden(e.target.checked)} className="rounded" />
            <label htmlFor="powered-by" className="text-sm">Hide "Powered by Linkforge" badge</label>
          </div>

          {/* Preview */}
          <div className="border rounded-lg p-4" style={{ backgroundColor: bgColor }}>
            <p className="text-xs text-muted-foreground mb-2">Preview</p>
            <div className="flex items-center gap-2 mb-2">
              {logoUrl && <img src={logoUrl} alt="Logo" className="h-6 w-auto" onError={(e) => { e.target.style.display = 'none' }} />}
              <span className="font-semibold" style={{ color: primaryColor }}>{companyName || domain.domain}</span>
            </div>
            <div className="h-8 rounded" style={{ backgroundColor: primaryColor, opacity: 0.2 }} />
            {!poweredByHidden && (
              <p className="text-xs text-muted-foreground mt-2 text-center">Powered by Linkforge</p>
            )}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Branding'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function DnsInstructions({ domain }) {
  if (domain.verified_at) return null

  const isCname = domain.verification_method === 'cname'
  return (
    <div className="mt-3 p-3 bg-muted/50 rounded-md border text-sm space-y-2">
      <p className="font-medium flex items-center gap-1">
        <AlertCircle size={14} />
        DNS Configuration Required
      </p>
      {isCname ? (
        <div className="space-y-1">
          <p>Add a <strong>CNAME</strong> record:</p>
          <div className="bg-background p-2 rounded border font-mono text-xs flex items-center justify-between">
            <span>{domain.domain} &rarr; cname.linkforge.app</span>
            <CopyButton text="cname.linkforge.app" />
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          <p>Add a <strong>TXT</strong> record:</p>
          <div className="bg-background p-2 rounded border font-mono text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span>Host: _linkforge.{domain.domain}</span>
              <CopyButton text={`_linkforge.${domain.domain}`} />
            </div>
            <div className="flex items-center justify-between">
              <span>Value: linkforge-verify={domain.verification_token}</span>
              <CopyButton text={`linkforge-verify=${domain.verification_token}`} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DomainCard({ domain, onVerify, onDelete, onSetPrimary, onRegenerate, onHealthCheck, onBranding }) {
  const [verifying, setVerifying] = useState(false)
  const [checking, setChecking] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [verifyResult, setVerifyResult] = useState(null)
  const [healthResult, setHealthResult] = useState(null)

  const handleVerify = async () => {
    setVerifying(true)
    setVerifyResult(null)
    try {
      const result = await onVerify(domain.id)
      setVerifyResult(result)
    } finally {
      setVerifying(false)
    }
  }

  const handleHealthCheck = async () => {
    setChecking(true)
    setHealthResult(null)
    try {
      const result = await onHealthCheck(domain.id)
      setHealthResult(result)
    } finally {
      setChecking(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Remove ${domain.domain}? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await onDelete(domain.id)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="border rounded-lg p-4 bg-card">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Globe size={20} className="text-muted-foreground" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{domain.domain}</span>
              {domain.is_primary && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium flex items-center gap-1">
                  <Star size={10} /> Primary
                </span>
              )}
              {domain.team_id && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                  Workspace
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {domain.verified_at ? (
                <span className="inline-flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle2 size={12} /> Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-yellow-600">
                  <XCircle size={12} /> Not verified
                </span>
              )}
              <SslBadge status={domain.ssl_status} />
              {domain.verified_at && (
                <HealthBadge
                  status={domain.health_status}
                  lastCheck={domain.last_health_check_at}
                  failures={domain.consecutive_failures}
                />
              )}
              {domain.branding?.company_name && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Palette size={10} /> {domain.branding.company_name}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-wrap justify-end">
          {domain.verified_at && (
            <>
              <Button variant="outline" size="sm" onClick={handleHealthCheck} disabled={checking} title="Run health check">
                <Activity size={14} className={checking ? 'animate-pulse' : ''} />
              </Button>
              <Button variant="outline" size="sm" onClick={() => onBranding(domain)} title="Branding">
                <Palette size={14} />
              </Button>
            </>
          )}
          {domain.verified_at && !domain.is_primary && (
            <Button variant="outline" size="sm" onClick={() => onSetPrimary(domain.id)}>
              <Star size={14} className="mr-1" /> Primary
            </Button>
          )}
          {!domain.verified_at && (
            <>
              <Button variant="outline" size="sm" onClick={handleVerify} disabled={verifying}>
                <RefreshCw size={14} className={`mr-1 ${verifying ? 'animate-spin' : ''}`} />
                {verifying ? 'Checking...' : 'Verify'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onRegenerate(domain.id)} title="Regenerate token">
                <RefreshCw size={14} />
              </Button>
            </>
          )}
          <Button variant="ghost" size="sm" onClick={handleDelete} disabled={deleting} className="text-destructive hover:text-destructive">
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      <DnsInstructions domain={domain} />

      {verifyResult && !verifyResult.verified && (
        <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded text-sm text-yellow-800 dark:text-yellow-200">
          {verifyResult.message}
        </div>
      )}
      {verifyResult && verifyResult.verified && (
        <div className="mt-3 p-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded text-sm text-green-800 dark:text-green-200">
          Domain verified successfully! SSL certificate is being provisioned.
        </div>
      )}
      {healthResult && (
        <div className={`mt-3 p-2 border rounded text-sm ${healthResult.health?.status === 'healthy' ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200' : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'}`}>
          <div className="flex items-center gap-2 mb-1">
            {healthResult.health?.status === 'healthy' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
            <span className="font-medium">
              {healthResult.health?.status === 'healthy' ? 'Domain is healthy' : 'Domain health issues detected'}
            </span>
          </div>
          <div className="text-xs space-y-0.5">
            <p>DNS: {healthResult.health?.dns_resolving ? 'Resolving' : 'Not resolving'}</p>
            <p>HTTPS: {healthResult.health?.https_reachable ? 'Reachable' : 'Not reachable'}</p>
            {healthResult.health?.error && <p>Error: {healthResult.health.error}</p>}
          </div>
        </div>
      )}
    </div>
  )
}

export function CustomDomainsPage() {
  const { user } = useAuthContext()
  const [domains, setDomains] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [brandingDomain, setBrandingDomain] = useState(null)

  const fetchDomains = useCallback(async () => {
    try {
      const result = await getDomains()
      setDomains(result.domains || [])
    } catch (err) {
      console.error('Failed to fetch domains:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDomains()
  }, [fetchDomains])

  const handleAdded = (result) => {
    setDomains((prev) => [result.domain, ...prev])
  }

  const handleVerify = async (id) => {
    const result = await verifyDomain(id)
    if (result.verified) fetchDomains()
    return result
  }

  const handleDelete = async (id) => {
    await deleteDomain(id)
    setDomains((prev) => prev.filter((d) => d.id !== id))
  }

  const handleSetPrimary = async (id) => {
    await setPrimaryDomain(id)
    fetchDomains()
  }

  const handleRegenerate = async (id) => {
    await regenerateToken(id)
    fetchDomains()
  }

  const handleHealthCheck = async (id) => {
    const result = await runHealthCheck(id)
    fetchDomains()
    return result
  }

  return (
    <DashboardLayout navItems={LINKFORGE_NAV_ITEMS} user={user}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Globe size={24} />
              Custom Domains
            </h1>
            <p className="text-muted-foreground mt-1">
              Use your own domain for branded short links with white-label branding
            </p>
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus size={16} className="mr-1" />
            Add Domain
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading domains...</div>
        ) : domains.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-card">
            <Globe size={48} className="mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No custom domains yet</h3>
            <p className="text-muted-foreground mb-4">
              Add a custom domain to create branded short links like links.yourdomain.com/abc
            </p>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus size={16} className="mr-1" />
              Add Your First Domain
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {domains.map((domain) => (
              <DomainCard
                key={domain.id}
                domain={domain}
                onVerify={handleVerify}
                onDelete={handleDelete}
                onSetPrimary={handleSetPrimary}
                onRegenerate={handleRegenerate}
                onHealthCheck={handleHealthCheck}
                onBranding={(d) => setBrandingDomain(d)}
              />
            ))}
          </div>
        )}

        {/* Info section */}
        <div className="border rounded-lg p-4 bg-muted/30">
          <h3 className="font-medium mb-2">How it works</h3>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Add your domain (e.g., links.yourdomain.com)</li>
            <li>Configure the DNS record as instructed</li>
            <li>Click Verify to confirm DNS propagation</li>
            <li>SSL certificate is automatically provisioned via Let's Encrypt</li>
            <li>Configure white-label branding (logo, colors, company name)</li>
            <li>Your links now work with your custom domain and branding</li>
          </ol>
        </div>

        {/* Features overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border rounded-lg p-4 bg-card">
            <Shield size={20} className="text-primary mb-2" />
            <h4 className="font-medium text-sm">Auto SSL</h4>
            <p className="text-xs text-muted-foreground mt-1">HTTPS certificates provisioned automatically via Let's Encrypt</p>
          </div>
          <div className="border rounded-lg p-4 bg-card">
            <Activity size={20} className="text-primary mb-2" />
            <h4 className="font-medium text-sm">Health Monitoring</h4>
            <p className="text-xs text-muted-foreground mt-1">DNS and HTTPS health checks to ensure your domains stay online</p>
          </div>
          <div className="border rounded-lg p-4 bg-card">
            <Palette size={20} className="text-primary mb-2" />
            <h4 className="font-medium text-sm">White-Label Branding</h4>
            <p className="text-xs text-muted-foreground mt-1">Custom logo, colors, and company name on your redirect pages</p>
          </div>
        </div>
      </div>

      <AddDomainModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdded={handleAdded}
      />

      <BrandingModal
        open={!!brandingDomain}
        onClose={() => setBrandingDomain(null)}
        domain={brandingDomain}
        onSaved={fetchDomains}
      />
    </DashboardLayout>
  )
}
