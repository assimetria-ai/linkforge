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

// ─── Analytics ───────────────────────────────────────────────────────────────

export const getTopLinks = ({ limit = 10 } = {}) =>
  api.get(`/links/stats/top?limit=${limit}`)
