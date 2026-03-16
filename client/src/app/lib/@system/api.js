const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

let refreshPromise = null
let csrfToken = null

async function fetchCsrfToken() {
  try {
    const res = await fetch(`${BASE_URL}/csrf-token`, { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      csrfToken = data.csrfToken
    }
  } catch (e) {
    // CSRF token fetch failed — proceed without (server may not require it)
  }
}

async function tryRefresh(){
  if (refreshPromise) return refreshPromise
  refreshPromise = fetch(`${BASE_URL}/sessions/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' } })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => { refreshPromise = null })
  return refreshPromise
}

async function request(path, options = {}, _retry = true){
  const method = (options.method || 'GET').toUpperCase()
  const needsCsrf = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)

  // Lazy-fetch CSRF token for state-changing requests
  if (needsCsrf && !csrfToken) {
    await fetchCsrfToken()
  }

  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (needsCsrf && csrfToken) {
    headers['X-CSRF-Token'] = csrfToken
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    ...options,
    headers })

  // On CSRF failure, re-fetch token and retry once
  if (res.status === 403 && _retry) {
    const body = await res.clone().json().catch(() => ({}))
    if (body.error === 'CSRF_VALIDATION_FAILED' || (body.message || '').toLowerCase().includes('csrf')) {
      csrfToken = null
      await fetchCsrfToken()
      return request(path, options, false)
    }
  }

  // On 401, attempt a single token refresh then replay the original request.
  if (res.status === 401 && _retry && path !== '/sessions/refresh') {
    const refreshed = await tryRefresh()
    if (refreshed) {
      return request(path, options, false)
    }
    // Refresh also failed — clear state and throw so callers can redirect to login.
    const err = await res.json().catch(() => ({ message: 'Unauthorized' }))
    throw new Error(err.message ?? 'Unauthorized')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message ?? 'API error')
  }
  return res.json()
}

export const api = {
  get: (path) => request(path),
  post: (path, body) =>
    request(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: (path, body) =>
    request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  put: (path, body) =>
    request(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),
}
