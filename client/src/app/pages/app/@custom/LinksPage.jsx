// @custom — Linkforge: Main Links Management Dashboard with Expiration Support
import { useState, useEffect, useCallback } from 'react'
import { Link2, Plus, Copy, ExternalLink, Trash2, BarChart3, Search, ToggleLeft, ToggleRight, Pencil, Check, X, QrCode, Clock, AlertTriangle, Timer, Globe } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '../../../components/@system/Dashboard'
import { LINKFORGE_NAV_ITEMS } from '../../../config/@custom/navigation'
import { Button } from '../../../components/@system/ui/button'
import { useAuthContext } from '../../../store/@system/auth'
import { getLinks, createLink, updateLink, deleteLink, getExpiringLinks, bulkUpdateExpiration } from '../../../api/@custom/links'
import { getDomains } from '../../../api/@custom/domains'

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={handleCopy} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors" title="Copy short URL">
      {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function ExpirationBadge({ link }) {
  if (link.expired_reason) {
    const label = link.expired_reason === 'click_limit_reached' ? 'Click limit reached' : 'Expired'
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
        <AlertTriangle size={10} />
        {label}
      </span>
    )
  }
  if (link.expires_at) {
    const expiresAt = new Date(link.expires_at)
    const now = new Date()
    const daysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24))
    if (daysLeft <= 0) {
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
          <AlertTriangle size={10} />
          Expired
        </span>
      )
    }
    if (daysLeft <= 3) {
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          <Clock size={10} />
          Expires in {daysLeft}d
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
        <Clock size={10} />
        Expires {expiresAt.toLocaleDateString()}
      </span>
    )
  }
  if (link.click_limit) {
    const remaining = link.click_limit - (link.clicks || 0)
    if (remaining <= 0) {
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
          <AlertTriangle size={10} />
          Click limit reached
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
        <Timer size={10} />
        {remaining} clicks left
      </span>
    )
  }
  return null
}

function CreateLinkModal({ open, onClose, onCreated }) {
  const [targetUrl, setTargetUrl] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [clickLimit, setClickLimit] = useState('')
  const [domainId, setDomainId] = useState('')
  const [domains, setDomains] = useState([])
  const [showExpiration, setShowExpiration] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Load verified custom domains
  useEffect(() => {
    if (open) {
      getDomains().then(res => {
        const verified = (res.domains || []).filter(d => d.verified_at)
        setDomains(verified)
      }).catch(() => setDomains([]))
    }
  }, [open])

  const selectedDomain = domains.find(d => String(d.id) === String(domainId))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const data = { target_url: targetUrl, description: description || undefined }
      if (slug.trim()) data.slug = slug.trim()
      if (expiresAt) data.expires_at = new Date(expiresAt).toISOString()
      if (clickLimit) data.click_limit = parseInt(clickLimit, 10)
      if (domainId) data.domain_id = parseInt(domainId, 10)
      const result = await createLink(data)
      onCreated(result.link)
      setTargetUrl('')
      setSlug('')
      setDescription('')
      setExpiresAt('')
      setClickLimit('')
      setDomainId('')
      setShowExpiration(false)
      onClose()
    } catch (err) {
      setError(err?.message || 'Failed to create link')
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
          Create Short Link
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Destination URL *</label>
            <input
              type="url"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://example.com/your-long-url"
              className="w-full px-3 py-2 border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          {/* Domain Selection */}
          {domains.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1">Domain</label>
              <select
                value={domainId}
                onChange={(e) => setDomainId(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Default (lnkf.ge)</option>
                {domains.map(d => (
                  <option key={d.id} value={d.id}>{d.domain}{d.is_primary ? ' (primary)' : ''}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Custom Slug (optional)</label>
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">{selectedDomain ? `${selectedDomain.domain}/` : 'lnkf.ge/'}</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="my-link"
                className="flex-1 px-3 py-2 border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Campaign name or note"
              className="w-full px-3 py-2 border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Expiration Toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowExpiration(!showExpiration)}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              <Clock size={14} />
              {showExpiration ? 'Hide expiration settings' : 'Add expiration settings'}
            </button>
          </div>

          {showExpiration && (
            <div className="space-y-3 p-3 border rounded-md bg-muted/30">
              <div>
                <label className="block text-sm font-medium mb-1">Expires at (optional)</label>
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Click limit (optional)</label>
                <input
                  type="number"
                  min="1"
                  value={clickLimit}
                  onChange={(e) => setClickLimit(e.target.value)}
                  placeholder="e.g. 1000"
                  className="w-full px-3 py-2 border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">Link will expire after this many clicks</p>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading || !targetUrl}>
              {loading ? 'Creating...' : 'Create Link'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function BulkExpirationModal({ open, onClose, selectedIds, onUpdated }) {
  const [expiresAt, setExpiresAt] = useState('')
  const [clickLimit, setClickLimit] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const data = {}
      if (expiresAt) data.expires_at = new Date(expiresAt).toISOString()
      else data.expires_at = null
      if (clickLimit) data.click_limit = parseInt(clickLimit, 10)
      else data.click_limit = null
      const result = await bulkUpdateExpiration(selectedIds, data)
      onUpdated(result.updated)
      setExpiresAt('')
      setClickLimit('')
      onClose()
    } catch (err) {
      setError(err?.message || 'Failed to update expiration')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-card border rounded-lg shadow-xl w-full max-w-md p-6 mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock size={20} />
          Bulk Expiration Settings
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Update expiration for {selectedIds.length} selected link{selectedIds.length !== 1 ? 's' : ''}. Leave empty to remove expiration.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Expires at</label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Click limit</label>
            <input
              type="number"
              min="1"
              value={clickLimit}
              onChange={(e) => setClickLimit(e.target.value)}
              placeholder="e.g. 1000"
              className="w-full px-3 py-2 border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Expiration'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ExpiringLinksAlert({ links }) {
  if (!links || links.length === 0) return null
  return (
    <div className="border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle size={16} className="text-amber-600" />
        <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
          {links.length} link{links.length !== 1 ? 's' : ''} expiring soon
        </span>
      </div>
      <div className="space-y-1">
        {links.slice(0, 3).map((l) => (
          <div key={l.id} className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
            <span className="font-mono">{l.slug}</span>
            <span>expires {new Date(l.expires_at).toLocaleDateString()}</span>
          </div>
        ))}
        {links.length > 3 && (
          <p className="text-xs text-amber-600 dark:text-amber-500">
            and {links.length - 3} more...
          </p>
        )}
      </div>
    </div>
  )
}

function LinkRow({ link, onUpdate, onDelete, baseUrl, onViewQr, selected, onSelect, domainsMap }) {
  const [editing, setEditing] = useState(false)
  const [editUrl, setEditUrl] = useState(link.target_url)
  const [editDesc, setEditDesc] = useState(link.description || '')
  const domainInfo = link.domain_id ? domainsMap?.[link.domain_id] : null
  const shortUrl = domainInfo ? `https://${domainInfo.domain}/${link.slug}` : `${baseUrl}/${link.slug}`

  const handleToggleActive = async () => {
    const data = { is_active: !link.is_active }
    // If reactivating an expired link, clear expiration
    if (!link.is_active && link.expired_reason) {
      data.expired_reason = null
    }
    const updated = await updateLink(link.id, data)
    onUpdate(updated.link)
  }

  const handleSaveEdit = async () => {
    const updated = await updateLink(link.id, { target_url: editUrl, description: editDesc })
    onUpdate(updated.link)
    setEditing(false)
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this link? This cannot be undone.')) return
    await deleteLink(link.id)
    onDelete(link.id)
  }

  return (
    <div className={`border rounded-lg p-4 transition-colors ${!link.is_active ? 'opacity-60 bg-muted/30' : 'bg-card hover:border-primary/30'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onSelect(link.id)}
            className="mt-1.5 rounded"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Link2 size={16} className="text-primary shrink-0" />
              <span className="font-mono text-sm font-medium truncate">{shortUrl}</span>
              <CopyButton text={shortUrl} />
              {domainInfo && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  <Globe size={10} />
                  {domainInfo.domain}
                </span>
              )}
              <ExpirationBadge link={link} />
            </div>
            {editing ? (
              <div className="space-y-2 mt-2">
                <input
                  type="url"
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  className="w-full px-2 py-1 border rounded text-sm bg-background"
                />
                <input
                  type="text"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Description"
                  className="w-full px-2 py-1 border rounded text-sm bg-background"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <>
                <a href={link.target_url} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground truncate block max-w-md">
                  {link.target_url}
                </a>
                {link.description && (
                  <p className="text-xs text-muted-foreground mt-1">{link.description}</p>
                )}
              </>
            )}
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <BarChart3 size={12} />
                {link.clicks ?? 0}{link.click_limit ? `/${link.click_limit}` : ''} clicks
              </span>
              <span>{new Date(link.created_at).toLocaleDateString()}</span>
              {link.expires_at && (
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  Expires {new Date(link.expires_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={handleToggleActive} className="p-1.5 rounded hover:bg-muted transition-colors" title={link.is_active ? 'Deactivate' : 'Activate'}>
            {link.is_active ? <ToggleRight size={18} className="text-green-500" /> : <ToggleLeft size={18} className="text-muted-foreground" />}
          </button>
          <button onClick={() => onViewQr(link.id)} className="p-1.5 rounded hover:bg-muted transition-colors" title="QR Code">
            <QrCode size={16} />
          </button>
          <button onClick={() => setEditing(!editing)} className="p-1.5 rounded hover:bg-muted transition-colors" title="Edit">
            <Pencil size={16} />
          </button>
          <a href={link.target_url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded hover:bg-muted transition-colors" title="Open destination">
            <ExternalLink size={16} />
          </a>
          <button onClick={handleDelete} className="p-1.5 rounded hover:bg-muted text-red-500 transition-colors" title="Delete">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

export function LinksPage() {
  const navigate = useNavigate()
  const { user } = useAuthContext()
  const [links, setLinks] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showBulkExpiration, setShowBulkExpiration] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [expiringLinks, setExpiringLinks] = useState([])
  const [domainsMap, setDomainsMap] = useState({})
  const baseUrl = window.location.origin

  const fetchLinks = useCallback(async () => {
    setLoading(true)
    try {
      const [linksData, expiringData, domainsData] = await Promise.all([
        getLinks({ limit: 100 }),
        getExpiringLinks({ days: 3 }).catch(() => ({ links: [] })),
        getDomains().catch(() => ({ domains: [] })),
      ])
      setLinks(linksData.links || [])
      setTotal(linksData.total || 0)
      setExpiringLinks(expiringData.links || [])
      // Build domain lookup map by ID
      const dMap = {}
      for (const d of (domainsData.domains || [])) {
        dMap[d.id] = d
      }
      setDomainsMap(dMap)
    } catch (err) {
      console.error('Failed to load links:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchLinks() }, [fetchLinks])

  const handleCreated = (link) => {
    setLinks((prev) => [link, ...prev])
    setTotal((t) => t + 1)
  }

  const handleUpdate = (updated) => {
    setLinks((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
  }

  const handleDelete = (id) => {
    setLinks((prev) => prev.filter((l) => l.id !== id))
    setTotal((t) => t - 1)
    setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n })
  }

  const handleSelect = (id) => {
    setSelectedIds((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const handleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map((l) => l.id)))
    }
  }

  const handleBulkUpdated = (updatedLinks) => {
    setLinks((prev) => {
      const map = new Map(updatedLinks.map((l) => [l.id, l]))
      return prev.map((l) => map.get(l.id) || l)
    })
    setSelectedIds(new Set())
  }

  const filtered = search
    ? links.filter((l) =>
        l.slug.toLowerCase().includes(search.toLowerCase()) ||
        l.target_url.toLowerCase().includes(search.toLowerCase()) ||
        (l.description || '').toLowerCase().includes(search.toLowerCase())
      )
    : links

  const activeCount = links.filter((l) => l.is_active).length
  const totalClicks = links.reduce((sum, l) => sum + (l.clicks || 0), 0)
  const expiredCount = links.filter((l) => l.expired_reason).length

  return (
    <DashboardLayout navItems={LINKFORGE_NAV_ITEMS}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Links</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {total} links · {activeCount} active · {totalClicks.toLocaleString()} total clicks
              {expiredCount > 0 && ` · ${expiredCount} expired`}
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus size={16} />
            Create Link
          </Button>
        </div>

        {/* Expiring Links Alert */}
        <ExpiringLinksAlert links={expiringLinks} />

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 p-3 border rounded-lg bg-primary/5">
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <Button size="sm" variant="outline" onClick={() => setShowBulkExpiration(true)} className="gap-1">
              <Clock size={14} />
              Set Expiration
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSelectedIds(new Set())}>
              Clear
            </Button>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search links..."
            className="w-full pl-9 pr-4 py-2 border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Select All */}
        {filtered.length > 0 && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedIds.size === filtered.length && filtered.length > 0}
              onChange={handleSelectAll}
              className="rounded"
            />
            <span className="text-xs text-muted-foreground">Select all</span>
          </div>
        )}

        {/* Links List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-muted rounded w-48 mb-2" />
                <div className="h-3 bg-muted rounded w-72" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 border rounded-lg">
            <Link2 size={48} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {search ? 'No links match your search' : 'No links yet'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {search ? 'Try a different search term' : 'Create your first short link to get started'}
            </p>
            {!search && (
              <Button onClick={() => setShowCreate(true)} className="gap-2">
                <Plus size={16} />
                Create Link
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((link) => (
              <LinkRow
                key={link.id}
                link={link}
                baseUrl={baseUrl}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onViewQr={(id) => navigate(`/app/links/${id}`)}
                selected={selectedIds.has(link.id)}
                onSelect={handleSelect}
                domainsMap={domainsMap}
              />
            ))}
          </div>
        )}

        <CreateLinkModal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />

        <BulkExpirationModal
          open={showBulkExpiration}
          onClose={() => setShowBulkExpiration(false)}
          selectedIds={[...selectedIds]}
          onUpdated={handleBulkUpdated}
        />
      </div>
    </DashboardLayout>
  )
}
