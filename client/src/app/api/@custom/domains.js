// @custom — Custom Domains API client for Linkforge
import { api } from '../../lib/@system/api'

// ─── Domains CRUD ────────────────────────────────────────────────────────────

export const getDomains = () =>
  api.get('/domains')

export const getDomain = (id) =>
  api.get(`/domains/${id}`)

export const addDomain = (data) =>
  api.post('/domains', data)

export const deleteDomain = (id) =>
  api.delete(`/domains/${id}`)

// ─── Verification ────────────────────────────────────────────────────────────

export const verifyDomain = (id) =>
  api.post(`/domains/${id}/verify`)

export const regenerateToken = (id) =>
  api.post(`/domains/${id}/regenerate-token`)

// ─── Settings ────────────────────────────────────────────────────────────────

export const setPrimaryDomain = (id) =>
  api.patch(`/domains/${id}/primary`)
