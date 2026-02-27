// @custom API calls — product-specific API functions
import { api } from '../../lib/@system/api'

// ─── Brand types ─────────────────────────────────────────────────────────────


// ─── Brand API ────────────────────────────────────────────────────────────────

export const getBrands = () =>
  api.get('/brands')

export const getBrand = (id) =>
  api.get(`/brands/${id}`)

export const createBrand = (data) => api.post('/brands', data)

export const updateBrand = (id, data) => api.patch(`/brands/${id}`, data)

export const uploadBrandLogo = (id, logo) =>
  api.post(`/brands/${id}/logo`, { logo })

export const deleteBrandLogo = (id) =>
  api.delete(`/brands/${id}/logo`)

export const deleteBrand = (id) =>
  api.delete(`/brands/${id}`)
