import { api } from '../../lib/@system/api'

export const webhooksApi = {
  list: () => api.get('/api/webhooks'),
  get: (id) => api.get(`/api/webhooks/${id}`),
  create: (data) => api.post('/api/webhooks', data),
  update: (id, data) => api.patch(`/api/webhooks/${id}`, data),
  delete: (id) => api.delete(`/api/webhooks/${id}`),
  test: (id) => api.post(`/api/webhooks/${id}/test`),
  deliveries: (id, params) => api.get(`/api/webhooks/${id}/deliveries`, { params }),
}
