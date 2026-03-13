import React, { useState, useEffect, useCallback } from 'react'
import { webhooksApi } from '../../../api/@custom/webhooks'

function WebhooksPage() {
  const [webhooks, setWebhooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ name: '', url: '', secret: '', events: ['link.click'] })
  const [error, setError] = useState(null)
  const [testResult, setTestResult] = useState(null)
  const [testingId, setTestingId] = useState(null)
  const [selectedWebhook, setSelectedWebhook] = useState(null)
  const [deliveries, setDeliveries] = useState([])

  const fetchWebhooks = useCallback(async () => {
    try {
      const res = await webhooksApi.list()
      setWebhooks(res.data.webhooks)
    } catch (err) {
      setError('Failed to load webhooks')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchWebhooks() }, [fetchWebhooks])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      if (editingId) {
        await webhooksApi.update(editingId, form)
      } else {
        await webhooksApi.create(form)
      }
      setShowForm(false)
      setEditingId(null)
      setForm({ name: '', url: '', secret: '', events: ['link.click'] })
      fetchWebhooks()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save webhook')
    }
  }

  const handleEdit = (webhook) => {
    setEditingId(webhook.id)
    setForm({ name: webhook.name, url: webhook.url, secret: '', events: webhook.events })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this webhook?')) return
    try {
      await webhooksApi.delete(id)
      fetchWebhooks()
      if (selectedWebhook?.id === id) setSelectedWebhook(null)
    } catch (err) {
      setError('Failed to delete webhook')
    }
  }

  const handleTest = async (id) => {
    setTestingId(id)
    setTestResult(null)
    try {
      const res = await webhooksApi.test(id)
      setTestResult({ id, ...res.data })
    } catch (err) {
      setTestResult({ id, success: false, error_message: 'Request failed' })
    } finally {
      setTestingId(null)
    }
  }

  const handleToggle = async (webhook) => {
    try {
      await webhooksApi.update(webhook.id, { is_active: !webhook.is_active })
      fetchWebhooks()
    } catch (err) {
      setError('Failed to update webhook')
    }
  }

  const viewDeliveries = async (webhook) => {
    setSelectedWebhook(webhook)
    try {
      const res = await webhooksApi.deliveries(webhook.id)
      setDeliveries(res.data.deliveries)
    } catch {
      setDeliveries([])
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>Webhooks</h1>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '900px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>Webhooks</h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>
            Receive real-time notifications when links are clicked
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', url: '', secret: '', events: ['link.click'] }) }}
          style={{
            backgroundColor: '#3A8BFD', color: '#fff', border: 'none', padding: '0.5rem 1rem',
            borderRadius: '6px', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem'
          }}
        >
          Add Webhook
        </button>
      </div>

      {error && (
        <div style={{ backgroundColor: '#fef2f2', color: '#dc2626', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem' }}>
          {error}
          <button onClick={() => setError(null)} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}>x</button>
        </div>
      )}

      {/* Create/Edit Form */}
      {showForm && (
        <div style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
            {editingId ? 'Edit Webhook' : 'New Webhook'}
          </h2>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Name</label>
              <input
                type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. My CRM Integration"
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem' }}
                required
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Endpoint URL</label>
              <input
                type="url" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })}
                placeholder="https://example.com/webhooks/linkforge"
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem' }}
                required
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                Secret {editingId && <span style={{ color: '#6b7280', fontWeight: 400 }}>(leave empty to keep current)</span>}
              </label>
              <input
                type="text" value={form.secret} onChange={e => setForm({ ...form, secret: e.target.value })}
                placeholder={editingId ? '' : 'Auto-generated if empty'}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem', fontFamily: 'monospace' }}
              />
              <p style={{ color: '#6b7280', fontSize: '0.75rem', margin: '0.25rem 0 0' }}>
                Used to sign webhook payloads (X-Webhook-Signature header)
              </p>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Events</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                <input type="checkbox" checked={form.events.includes('link.click')} onChange={() => {}} disabled />
                link.click — Triggered on every link click
              </label>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" style={{
                backgroundColor: '#3A8BFD', color: '#fff', border: 'none', padding: '0.5rem 1rem',
                borderRadius: '6px', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem'
              }}>
                {editingId ? 'Update' : 'Create'} Webhook
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null) }} style={{
                backgroundColor: '#fff', color: '#374151', border: '1px solid #d1d5db', padding: '0.5rem 1rem',
                borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem'
              }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Webhook List */}
      {webhooks.length === 0 && !showForm ? (
        <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <p style={{ color: '#6b7280', marginBottom: '1rem' }}>No webhooks configured yet</p>
          <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
            Add a webhook to receive POST notifications when your links are clicked.
            Each payload includes click timestamp, referrer, geo, and device data.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {webhooks.map(webhook => (
            <div key={webhook.id} style={{
              border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem',
              backgroundColor: webhook.is_active ? '#fff' : '#f9fafb',
              opacity: webhook.is_active ? 1 : 0.7,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600 }}>{webhook.name}</span>
                    <span style={{
                      fontSize: '0.75rem', padding: '0.125rem 0.5rem', borderRadius: '9999px',
                      backgroundColor: webhook.is_active ? '#dcfce7' : '#f3f4f6',
                      color: webhook.is_active ? '#16a34a' : '#6b7280',
                    }}>
                      {webhook.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {webhook.url}
                  </p>
                  <p style={{ color: '#9ca3af', fontSize: '0.75rem', margin: '0.25rem 0 0' }}>
                    Events: {webhook.events?.join(', ')} | Created: {new Date(webhook.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
                  <button
                    onClick={() => handleTest(webhook.id)}
                    disabled={testingId === webhook.id}
                    style={{
                      padding: '0.375rem 0.625rem', fontSize: '0.75rem', border: '1px solid #d1d5db',
                      borderRadius: '4px', cursor: 'pointer', backgroundColor: '#fff',
                    }}
                  >
                    {testingId === webhook.id ? 'Testing...' : 'Test'}
                  </button>
                  <button onClick={() => viewDeliveries(webhook)} style={{
                    padding: '0.375rem 0.625rem', fontSize: '0.75rem', border: '1px solid #d1d5db',
                    borderRadius: '4px', cursor: 'pointer', backgroundColor: '#fff',
                  }}>
                    History
                  </button>
                  <button onClick={() => handleToggle(webhook)} style={{
                    padding: '0.375rem 0.625rem', fontSize: '0.75rem', border: '1px solid #d1d5db',
                    borderRadius: '4px', cursor: 'pointer', backgroundColor: '#fff',
                  }}>
                    {webhook.is_active ? 'Disable' : 'Enable'}
                  </button>
                  <button onClick={() => handleEdit(webhook)} style={{
                    padding: '0.375rem 0.625rem', fontSize: '0.75rem', border: '1px solid #d1d5db',
                    borderRadius: '4px', cursor: 'pointer', backgroundColor: '#fff',
                  }}>
                    Edit
                  </button>
                  <button onClick={() => handleDelete(webhook.id)} style={{
                    padding: '0.375rem 0.625rem', fontSize: '0.75rem', border: '1px solid #fecaca',
                    borderRadius: '4px', cursor: 'pointer', backgroundColor: '#fff', color: '#dc2626',
                  }}>
                    Delete
                  </button>
                </div>
              </div>

              {/* Test Result */}
              {testResult && testResult.id === webhook.id && (
                <div style={{
                  marginTop: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '4px', fontSize: '0.875rem',
                  backgroundColor: testResult.success ? '#dcfce7' : '#fef2f2',
                  color: testResult.success ? '#16a34a' : '#dc2626',
                }}>
                  {testResult.success
                    ? `Test delivered successfully (HTTP ${testResult.status_code})`
                    : `Test failed: ${testResult.error_message || 'Unknown error'}${testResult.status_code ? ` (HTTP ${testResult.status_code})` : ''}`
                  }
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delivery History Modal */}
      {selectedWebhook && (
        <div style={{ marginTop: '2rem', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>
              Delivery History: {selectedWebhook.name}
            </h2>
            <button onClick={() => setSelectedWebhook(null)} style={{
              background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: '#6b7280'
            }}>
              x
            </button>
          </div>
          {deliveries.length === 0 ? (
            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>No deliveries yet</p>
          ) : (
            <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>
                  <th style={{ padding: '0.5rem', fontWeight: 500 }}>Event</th>
                  <th style={{ padding: '0.5rem', fontWeight: 500 }}>Status</th>
                  <th style={{ padding: '0.5rem', fontWeight: 500 }}>Attempt</th>
                  <th style={{ padding: '0.5rem', fontWeight: 500 }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map(d => (
                  <tr key={d.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '0.5rem' }}>{d.event_type}</td>
                    <td style={{ padding: '0.5rem' }}>
                      <span style={{
                        padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem',
                        backgroundColor: d.success ? '#dcfce7' : '#fef2f2',
                        color: d.success ? '#16a34a' : '#dc2626',
                      }}>
                        {d.success ? `${d.status_code} OK` : d.error_message || `HTTP ${d.status_code}`}
                      </span>
                    </td>
                    <td style={{ padding: '0.5rem' }}>{d.attempt}/{d.max_attempts}</td>
                    <td style={{ padding: '0.5rem', color: '#6b7280' }}>
                      {new Date(d.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Documentation Section */}
      <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Webhook Payload Format</h3>
        <pre style={{
          backgroundColor: '#1f2937', color: '#e5e7eb', padding: '1rem', borderRadius: '6px',
          fontSize: '0.8rem', overflow: 'auto', lineHeight: 1.5
        }}>{`{
  "event": "link.click",
  "timestamp": "2026-03-13T22:46:00.000Z",
  "data": {
    "click_id": 123,
    "link_id": 456,
    "slug": "my-link",
    "target_url": "https://example.com",
    "clicked_at": "2026-03-13T22:46:00.000Z",
    "referrer": "https://twitter.com",
    "user_agent": "Mozilla/5.0 ...",
    "ip_address": "1.2.3.4",
    "platform": "MacIntel",
    "country": null,
    "city": null
  }
}`}</pre>
        <div style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: '#6b7280' }}>
          <p style={{ margin: '0.25rem 0' }}>Payloads are signed with HMAC-SHA256 using your webhook secret.</p>
          <p style={{ margin: '0.25rem 0' }}>Verify using the <code style={{ backgroundColor: '#e5e7eb', padding: '0.125rem 0.25rem', borderRadius: '3px' }}>X-Webhook-Signature</code> header.</p>
          <p style={{ margin: '0.25rem 0' }}>Failed deliveries are retried up to 3 times (1min, 5min, 15min intervals).</p>
        </div>
      </div>
    </div>
  )
}

export default WebhooksPage
