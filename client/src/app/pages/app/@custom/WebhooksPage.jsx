// @custom — Linkforge: Webhooks management with DashboardLayout
import { useState, useEffect, useCallback } from 'react'
import {
  Webhook, Plus, Trash2, Pencil, ToggleLeft, ToggleRight,
  Check, X, Send, History, ChevronDown, ChevronUp, Copy, Clock,
  AlertCircle, CheckCircle2, Code2,
} from 'lucide-react'
import { DashboardLayout } from '../../../components/@system/Dashboard'
import { LINKFORGE_NAV_ITEMS } from '../../../config/@custom/navigation'
import { Button } from '../../../components/@system/ui/button'
import { webhooksApi } from '../../../api/@custom/webhooks'

const AVAILABLE_EVENTS = [
  { value: 'link.click', label: 'link.click', description: 'Triggered on every link click' },
  { value: 'link.created', label: 'link.created', description: 'Triggered when a link is created' },
  { value: 'link.deleted', label: 'link.deleted', description: 'Triggered when a link is deleted' },
]

const PAYLOAD_EXAMPLE = `{
  "event": "link.click",
  "timestamp": "${new Date().toISOString()}",
  "data": {
    "click_id": 123,
    "link_id": 456,
    "slug": "my-link",
    "target_url": "https://example.com",
    "clicked_at": "${new Date().toISOString()}",
    "referrer": "https://twitter.com",
    "user_agent": "Mozilla/5.0 ...",
    "ip_address": "1.2.3.4",
    "platform": "MacIntel",
    "country": null,
    "city": null
  }
}`

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

function WebhookFormModal({ open, onClose, onSaved, editingWebhook }) {
  const [form, setForm] = useState({ name: '', url: '', secret: '', events: ['link.click'] })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (editingWebhook) {
      setForm({ name: editingWebhook.name, url: editingWebhook.url, secret: '', events: editingWebhook.events || ['link.click'] })
    } else {
      setForm({ name: '', url: '', secret: '', events: ['link.click'] })
    }
    setError('')
  }, [editingWebhook, open])

  const toggleEvent = (event) => {
    setForm(f => ({
      ...f,
      events: f.events.includes(event)
        ? f.events.filter(e => e !== event)
        : [...f.events, event],
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (editingWebhook) {
        await webhooksApi.update(editingWebhook.id, form)
      } else {
        await webhooksApi.create(form)
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err?.message || 'Failed to save webhook')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-card border rounded-lg shadow-xl w-full max-w-lg p-6 mx-4" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Webhook size={20} />
          {editingWebhook ? 'Edit Webhook' : 'New Webhook'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. My CRM Integration"
              className="w-full px-3 py-2 border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Endpoint URL *</label>
            <input
              type="url"
              value={form.url}
              onChange={e => setForm({ ...form, url: e.target.value })}
              placeholder="https://example.com/webhooks/linkforge"
              className="w-full px-3 py-2 border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Secret{' '}
              {editingWebhook && (
                <span className="text-muted-foreground font-normal">(leave blank to keep current)</span>
              )}
            </label>
            <input
              type="text"
              value={form.secret}
              onChange={e => setForm({ ...form, secret: e.target.value })}
              placeholder={editingWebhook ? '' : 'Auto-generated if empty'}
              className="w-full px-3 py-2 border rounded-md bg-background text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Used to sign webhook payloads via <code className="bg-muted px-1 rounded">X-Webhook-Signature</code>
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Events</label>
            <div className="space-y-2">
              {AVAILABLE_EVENTS.map(({ value, label, description }) => (
                <label key={value} className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.events.includes(value)}
                    onChange={() => toggleEvent(value)}
                    className="mt-0.5 rounded"
                  />
                  <div>
                    <span className="text-sm font-mono font-medium">{label}</span>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading || form.events.length === 0}>
              {loading ? 'Saving...' : editingWebhook ? 'Update Webhook' : 'Create Webhook'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function DeliveryHistoryPanel({ webhook, onClose }) {
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    webhooksApi.deliveries(webhook.id)
      .then(res => setDeliveries(res.deliveries || []))
      .catch(() => setDeliveries([]))
      .finally(() => setLoading(false))
  }, [webhook.id])

  return (
    <div className="border rounded-lg p-4 bg-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <History size={16} />
          Delivery History: {webhook.name}
        </h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
          <X size={16} />
        </button>
      </div>
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-8 bg-muted rounded animate-pulse" />)}
        </div>
      ) : deliveries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No deliveries recorded yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-4 text-xs text-muted-foreground font-medium">Event</th>
                <th className="py-2 pr-4 text-xs text-muted-foreground font-medium">Status</th>
                <th className="py-2 pr-4 text-xs text-muted-foreground font-medium">Attempt</th>
                <th className="py-2 pr-4 text-xs text-muted-foreground font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map(d => (
                <tr key={d.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="py-2 pr-4 font-mono text-xs">{d.event_type}</td>
                  <td className="py-2 pr-4">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                      d.success
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {d.success ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                      {d.success ? `${d.status_code} OK` : d.error_message || `HTTP ${d.status_code}`}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-xs text-muted-foreground">{d.attempt}/{d.max_attempts}</td>
                  <td className="py-2 pr-4 text-xs text-muted-foreground">
                    {new Date(d.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function WebhookCard({ webhook, onEdit, onDelete, onToggle, onViewHistory }) {
  const [testResult, setTestResult] = useState(null)
  const [testing, setTesting] = useState(false)

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await webhooksApi.test(webhook.id)
      setTestResult({ success: res.success, status: res.status_code, error: res.error_message })
    } catch {
      setTestResult({ success: false, error: 'Request failed' })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className={`border rounded-lg p-4 transition-colors ${webhook.is_active ? 'bg-card' : 'bg-muted/30 opacity-70'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-semibold">{webhook.name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              webhook.is_active
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-muted text-muted-foreground'
            }`}>
              {webhook.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="text-sm text-muted-foreground font-mono truncate mb-1">{webhook.url}</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span>Events: {webhook.events?.join(', ')}</span>
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {new Date(webhook.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
          <Button size="sm" variant="outline" onClick={handleTest} disabled={testing} className="gap-1 text-xs h-7 px-2">
            <Send size={12} />
            {testing ? 'Testing...' : 'Test'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => onViewHistory(webhook)} className="gap-1 text-xs h-7 px-2">
            <History size={12} />
            History
          </Button>
          <button onClick={() => onToggle(webhook)} className="p-1.5 rounded hover:bg-muted transition-colors" title={webhook.is_active ? 'Deactivate' : 'Activate'}>
            {webhook.is_active
              ? <ToggleRight size={18} className="text-green-500" />
              : <ToggleLeft size={18} className="text-muted-foreground" />
            }
          </button>
          <button onClick={() => onEdit(webhook)} className="p-1.5 rounded hover:bg-muted transition-colors" title="Edit">
            <Pencil size={16} />
          </button>
          <button onClick={() => onDelete(webhook.id)} className="p-1.5 rounded hover:bg-muted text-red-500 transition-colors" title="Delete">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {testResult && (
        <div className={`mt-3 p-2 rounded text-sm flex items-center gap-2 ${
          testResult.success
            ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
            : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
        }`}>
          {testResult.success
            ? <><CheckCircle2 size={14} /> Test delivered successfully{testResult.status ? ` (HTTP ${testResult.status})` : ''}</>
            : <><AlertCircle size={14} /> Test failed: {testResult.error || 'Unknown error'}{testResult.status ? ` (HTTP ${testResult.status})` : ''}</>
          }
          <button onClick={() => setTestResult(null)} className="ml-auto p-0.5 hover:opacity-70">
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  )
}

function WebhooksPage() {
  const [webhooks, setWebhooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingWebhook, setEditingWebhook] = useState(null)
  const [error, setError] = useState(null)
  const [selectedHistory, setSelectedHistory] = useState(null)
  const [showDocs, setShowDocs] = useState(false)

  const fetchWebhooks = useCallback(async () => {
    try {
      const res = await webhooksApi.list()
      setWebhooks(res.webhooks || [])
    } catch {
      setError('Failed to load webhooks')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchWebhooks() }, [fetchWebhooks])

  const handleEdit = (webhook) => {
    setEditingWebhook(webhook)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this webhook? This cannot be undone.')) return
    try {
      await webhooksApi.delete(id)
      setWebhooks(prev => prev.filter(w => w.id !== id))
      if (selectedHistory?.id === id) setSelectedHistory(null)
    } catch {
      setError('Failed to delete webhook')
    }
  }

  const handleToggle = async (webhook) => {
    try {
      await webhooksApi.update(webhook.id, { is_active: !webhook.is_active })
      fetchWebhooks()
    } catch {
      setError('Failed to update webhook')
    }
  }

  return (
    <DashboardLayout navItems={LINKFORGE_NAV_ITEMS}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Webhook size={24} className="text-primary" />
              Webhooks
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Receive real-time POST notifications when links are clicked
            </p>
          </div>
          <Button
            onClick={() => { setEditingWebhook(null); setShowForm(true) }}
            className="gap-2"
          >
            <Plus size={16} />
            Add Webhook
          </Button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
            <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
          </div>
        )}

        {/* Webhooks List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="border rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-muted rounded w-48 mb-2" />
                <div className="h-3 bg-muted rounded w-72" />
              </div>
            ))}
          </div>
        ) : webhooks.length === 0 ? (
          <div className="text-center py-12 border rounded-lg border-dashed">
            <Webhook size={48} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No webhooks configured</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add a webhook to receive POST notifications when your links are clicked.
            </p>
            <Button onClick={() => { setEditingWebhook(null); setShowForm(true) }} className="gap-2">
              <Plus size={16} />
              Add Webhook
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {webhooks.map(webhook => (
              <WebhookCard
                key={webhook.id}
                webhook={webhook}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggle={handleToggle}
                onViewHistory={(w) => setSelectedHistory(w)}
              />
            ))}
          </div>
        )}

        {/* Delivery History Panel */}
        {selectedHistory && (
          <DeliveryHistoryPanel
            webhook={selectedHistory}
            onClose={() => setSelectedHistory(null)}
          />
        )}

        {/* Payload Documentation */}
        <div className="border rounded-lg overflow-hidden">
          <button
            onClick={() => setShowDocs(!showDocs)}
            className="w-full flex items-center justify-between p-4 text-sm font-medium hover:bg-muted/50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Code2 size={16} />
              Webhook Payload Format
            </span>
            {showDocs ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {showDocs && (
            <div className="p-4 border-t space-y-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Example payload (link.click)</span>
                <CopyButton text={PAYLOAD_EXAMPLE} />
              </div>
              <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-auto leading-relaxed">
                {PAYLOAD_EXAMPLE}
              </pre>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Payloads are signed with HMAC-SHA256 using your webhook secret.</p>
                <p>Verify using the <code className="bg-muted px-1 rounded text-xs">X-Webhook-Signature</code> header.</p>
                <p>Failed deliveries are retried up to 3 times (1min, 5min, 15min intervals).</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <WebhookFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditingWebhook(null) }}
        onSaved={fetchWebhooks}
        editingWebhook={editingWebhook}
      />
    </DashboardLayout>
  )
}

export default WebhooksPage
