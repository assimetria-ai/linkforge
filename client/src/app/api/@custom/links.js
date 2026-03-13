// @custom — Links API client for Linkforge
import { api } from '../../lib/@system/api'

// ─── Links CRUD ──────────────────────────────────────────────────────────────

export const getLinks = ({ limit = 50, offset = 0 } = {}) =>
  api.get(`/links?limit=${limit}&offset=${offset}`)

export const getLink = (id) =>
  api.get(`/links/${id}`)

export const createLink = (data) =>
  api.post('/links', data)

export const updateLink = (id, data) =>
  api.patch(`/links/${id}`, data)

export const deleteLink = (id) =>
  api.delete(`/links/${id}`)

// ─── Expiration ──────────────────────────────────────────────────────────────

export const getExpiredLinks = ({ limit = 50, offset = 0 } = {}) =>
  api.get(`/links/expired?limit=${limit}&offset=${offset}`)

export const getExpiringLinks = ({ days = 3 } = {}) =>
  api.get(`/links/expiring?days=${days}`)

export const bulkUpdateExpiration = (link_ids, { expires_at, click_limit }) =>
  api.post('/links/bulk/expiration', { link_ids, expires_at, click_limit })

// ─── Analytics ───────────────────────────────────────────────────────────────

export const getTopLinks = ({ limit = 10 } = {}) =>
  api.get(`/links/stats/top?limit=${limit}`)

// ─── QR Code ─────────────────────────────────────────────────────────────────

export const getLinkQrDataUrl = (id, { size = 300, fg, bg, margin } = {}) => {
  const params = new URLSearchParams({ size: String(size), base_url: window.location.origin })
  if (fg) params.set('fg', fg)
  if (bg) params.set('bg', bg)
  if (margin !== undefined) params.set('margin', String(margin))
  return api.get(`/links/${id}/qr/dataurl?${params}`)
}

export const getLinkQrDownloadUrl = (id, { format = 'png', size = 600, fg, bg } = {}) => {
  const params = new URLSearchParams({ format, size: String(size), base_url: window.location.origin })
  if (fg) params.set('fg', fg)
  if (bg) params.set('bg', bg)
  return `/api/links/${id}/qr?${params}`
}

// ─── UTM Analytics ───────────────────────────────────────────────────────────

export const getUtmStats = () =>
  api.get('/links/stats/utm')

export const getLinksByCampaign = (campaign, { limit = 50, offset = 0 } = {}) =>
  api.get(`/links/campaign/${encodeURIComponent(campaign)}?limit=${limit}&offset=${offset}`)
