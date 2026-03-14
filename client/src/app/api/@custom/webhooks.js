import { api } from '../../lib/@system/api'

export const webhooksApi = {
  list: () => api.get('/webhooks'),
  get: (id) => api.get(`/webhooks/${id}`),
  create: (data) => api.post('/webhooks', data),
  update: (id, data) => api.patch(`/webhooks/${id}`, data),
  delete: (id) => api.delete(`/webhooks/${id}`),
  test: (id) => api.post(`/webhooks/${id}/test`),
  deliveries: (id) => api.get(`/webhooks/${id}/deliveries`),
}
