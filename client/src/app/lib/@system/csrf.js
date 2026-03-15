// CSRF token helper — fetches and caches the signed CSRF token from the server.
//
// The server sets a 'csrf-nonce' cookie (httpOnly: false) on every response and
// exposes GET /api/csrf-token which returns the HMAC-signed token the client must
// echo back in the X-CSRF-Token header on every state-changing request
// (POST / PUT / PATCH / DELETE).
//
// Usage:
//   import { csrfHeaders } from '@/app/lib/@system/csrf'
//   const headers = await csrfHeaders()
//   fetch('/api/some-endpoint', { method: 'POST', headers, body: ... })

let _csrfToken = null

/**
 * Fetch (and cache) the CSRF token from /api/csrf-token.
 * The token is tied to the nonce cookie set by the server; it stays valid for
 * the lifetime of the cookie unless the page is reloaded or the cache is cleared.
 */
export async function getCsrfToken() {
  if (_csrfToken) return _csrfToken
  const res = await fetch('/api/csrf-token', { credentials: 'same-origin' })
  if (!res.ok) throw new Error('Failed to fetch CSRF token')
  const data = await res.json()
  _csrfToken = data.csrfToken
  return _csrfToken
}

/**
 * Returns headers that include the CSRF token and Content-Type: application/json.
 * Awaits the token fetch on first call; subsequent calls are synchronous (cached).
 */
export async function csrfHeaders() {
  const token = await getCsrfToken()
  return {
    'Content-Type': 'application/json',
    'X-CSRF-Token': token,
  }
}

/**
 * Clear the cached token (e.g. after logout or on CSRF rejection).
 */
export function invalidateCsrfToken() {
  _csrfToken = null
}
