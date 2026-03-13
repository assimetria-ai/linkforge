// @custom — Pages API client for Linkforge (bio pages + QR codes)
import { api } from '../../lib/@system/api'

// ─── Pages CRUD ──────────────────────────────────────────────────────────────

export const getPages = () => api.get('/pages')

export const getPage = (id) => api.get(`/pages/${id}`)

export const createPage = (data) => api.post('/pages', data)

export const updatePage = (id, data) => api.patch(`/pages/${id}`, data)

export const publishPage = (id) => api.post(`/pages/${id}/publish`)

export const deletePage = (id) => api.delete(`/pages/${id}`)

export const getPageStats = () => api.get('/pages/stats')

// ─── QR Code ─────────────────────────────────────────────────────────────────

export const getPageQrDataUrl = (id, { size = 300, fg, bg, margin } = {}) => {
  const params = new URLSearchParams({ size: String(size), base_url: window.location.origin })
  if (fg) params.set('fg', fg)
  if (bg) params.set('bg', bg)
  if (margin !== undefined) params.set('margin', String(margin))
  return api.get(`/pages/${id}/qr/dataurl?${params}`)
}

export const getPageQrDownloadUrl = (id, { format = 'png', size = 600, fg, bg } = {}) => {
  const params = new URLSearchParams({ format, size: String(size), base_url: window.location.origin })
  if (fg) params.set('fg', fg)
  if (bg) params.set('bg', bg)
  return `/api/pages/${id}/qr?${params}`
}
