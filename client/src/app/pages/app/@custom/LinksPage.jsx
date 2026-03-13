// @custom — Linkforge: Main Links Management Dashboard
import { useState, useEffect, useCallback } from 'react'
import { Link2, Plus, Copy, ExternalLink, Trash2, BarChart3, Search, ToggleLeft, ToggleRight, Pencil, Check, X } from 'lucide-react'
import { DashboardLayout } from '../../../components/@system/Dashboard'
import { LINKFORGE_NAV_ITEMS } from '../../../config/@custom/navigation'
import { Button } from '../../../components/@system/ui/button'
import { useAuthContext } from '../../../store/@system/auth'
import { getLinks, createLink, updateLink, deleteLink } from '../../../api/@custom/links'

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

function CreateLinkModal({ open, onClose, onCreated }) {
  const [targetUrl, setTargetUrl] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const data = { target_url: targetUrl, description: description || undefined }
      if (slug.trim()) data.slug = slug.trim()
      const result = await createLink(data)
      onCreated(result.link)
      setTargetUrl('')
      setSlug('')
      setDescription('')
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
          <div>
            <label className="block text-sm font-medium mb-1">Custom Slug (optional)</label>
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">lnkf.ge/</span>
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

function LinkRow({ link, onUpdate, onDelete, baseUrl }) {
  const [editing, setEditing] = useState(false)
  const [editUrl, setEditUrl] = useState(link.target_url)
  const [editDesc, setEditDesc] = useState(link.description || '')
  const shortUrl = `${baseUrl}/${link.slug}`

  const handleToggleActive = async () => {
    const updated = await updateLink(link.id, { is_active: !link.is_active })
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
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link2 size={16} className="text-primary shrink-0" />
            <span className="font-mono text-sm font-medium truncate">{shortUrl}</span>
            <CopyButton text={shortUrl} />
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
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <BarChart3 size={12} />
              {link.clicks ?? 0} clicks
            </span>
            <span>{new Date(link.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={handleToggleActive} className="p-1.5 rounded hover:bg-muted transition-colors" title={link.is_active ? 'Deactivate' : 'Activate'}>
            {link.is_active ? <ToggleRight size={18} className="text-green-500" /> : <ToggleLeft size={18} className="text-muted-foreground" />}
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
  const { user } = useAuthContext()
  const [links, setLinks] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const baseUrl = window.location.origin

  const fetchLinks = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getLinks({ limit: 100 })
      setLinks(data.links || [])
      setTotal(data.total || 0)
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

  return (
    <DashboardLayout navItems={LINKFORGE_NAV_ITEMS}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Links</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {total} links · {activeCount} active · {totalClicks.toLocaleString()} total clicks
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus size={16} />
            Create Link
          </Button>
        </div>

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
              />
            ))}
          </div>
        )}

        <CreateLinkModal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      </div>
    </DashboardLayout>
  )
}
