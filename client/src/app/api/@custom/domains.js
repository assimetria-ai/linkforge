// @custom — Custom Domains API client for Linkforge
// Supports: CRUD, verification, health checks, branding, workspace scoping
import { api } from '../../lib/@system/api'

// ─── Domains CRUD ────────────────────────────────────────────────────────────

export const getDomains = (teamId) =>
  api.get('/domains', { params: teamId ? { team_id: teamId } : {} })

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

// ─── Health Checks ───────────────────────────────────────────────────────────

export const runHealthCheck = (id) =>
  api.post(`/domains/${id}/health-check`)

// ─── White-Label Branding ────────────────────────────────────────────────────

export const getDomainBranding = (id) =>
  api.get(`/domains/${id}/branding`)

export const updateDomainBranding = (id, branding) =>
  api.patch(`/domains/${id}/branding`, { branding })

// ─── Public Resolution ──────────────────────────────────────────────────────

export const resolveDomain = (hostname) =>
  api.get(`/domains/resolve/${hostname}`)
