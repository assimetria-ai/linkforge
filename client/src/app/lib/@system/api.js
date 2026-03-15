import { getCsrfToken, invalidateCsrfToken } from './csrf'

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

/** Human-readable messages for common HTTP error codes. */
const STATUS_MESSAGES = {
  401: 'You are not signed in. Please log in and try again.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'A server error occurred. Please try again later.',
}

/**
 * Fetch wrapper with consistent error handling.
 *
 * Handles:
 *  - Network failures (TypeError from fetch — no connection, DNS, CORS)
 *  - HTTP error responses (non-2xx) with status-specific messages
 *  - JSON parse failures
 *  - Automatic auth token injection from localStorage
 *  - Automatic CSRF header injection for mutating requests
 *
 * @param {string} url - URL to fetch.
 * @param {RequestInit & { skipAuth?: boolean }} [options] - Standard fetch options
 *   plus optional `skipAuth` flag to omit the Authorization header.
 * @returns {Promise<{ data: unknown, error: string | null }>}
 *   Resolves to `{ data, error: null }` on success or `{ data: null, error }` on failure.
 */
export async function apiFetch(url, options = {}) {
  const { skipAuth = false, ...fetchOptions } = options
  const method = (fetchOptions.method || 'GET').toUpperCase()
  const headers = { ...(fetchOptions.headers || {}) }

  // Attach auth token unless caller opts out.
  if (!skipAuth) {
    const token = localStorage.getItem('app_jwt')
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  // Mutations need CSRF token + JSON content-type (unless sending FormData).
  if (MUTATION_METHODS.has(method)) {
    try {
      const csrfToken = await getCsrfToken()
      headers['X-CSRF-Token'] = csrfToken
    } catch {
      // CSRF fetch failed; proceed without it — server will reject if required.
    }
    if (!headers['Content-Type'] && !(fetchOptions.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json'
    }
  }

  let res
  try {
    res = await fetch(url, { ...fetchOptions, headers })
  } catch (err) {
    if (err instanceof TypeError) {
      return { data: null, error: 'Network error. Please check your connection and try again.' }
    }
    return { data: null, error: 'An unexpected error occurred. Please try again.' }
  }

  // On 401 the session has likely expired; clear the cached CSRF token.
  if (res.status === 401) {
    invalidateCsrfToken()
  }

  // Parse JSON body when present.
  let data = null
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    try {
      data = await res.json()
    } catch {
      return { data: null, error: 'Failed to parse server response.' }
    }
  }

  if (!res.ok) {
    const message =
      data?.message ||
      data?.error ||
      STATUS_MESSAGES[res.status] ||
      `Request failed with status ${res.status}.`
    return { data, error: message }
  }

  return { data, error: null }
}
