// @system — OAuth 2.0 routes
//
// GET /api/auth/google            — redirect to Google consent screen
// GET /api/auth/google/callback   — exchange code, create session, redirect to client
// GET /api/auth/github            — redirect to GitHub consent screen
// GET /api/auth/github/callback   — exchange code, create session, redirect to client
// GET /api/auth/linkedin          — redirect to LinkedIn consent screen
// GET /api/auth/linkedin/callback — exchange code, create session, redirect to client
//
// After a successful OAuth login the browser is redirected to:
//   ${APP_URL}/auth/oauth/callback?token=<session_token>
//
// On error:
//   ${APP_URL}/auth/login?error=<url-encoded-message>
//
// Security notes:
//   - A random `state` parameter is generated per request and stored in an
//     in-memory Map with a 10-minute TTL.  The callback validates and consumes
//     the state before proceeding, preventing CSRF against the OAuth flow.
//   - In multi-process deployments replace the in-memory store with Redis.
//   - GET routes are exempt from CSRF middleware (POST/PUT/PATCH/DELETE only).

'use strict'

const express = require('express')
const crypto  = require('crypto')
const router  = express.Router()
const db      = require('../../../lib/@system/PostgreSQL')
const logger  = require('../../../lib/@system/Logger')

// ── OAuth state store ─────────────────────────────────────────────────────────
// Map<state, { provider: string, expiresAt: number }>

const _states = new Map()

setInterval(() => {
  const now = Date.now()
  for (const [k, v] of _states) {
    if (v.expiresAt < now) _states.delete(k)
  }
}, 5 * 60 * 1000).unref()

function _createState(provider) {
  const state = crypto.randomBytes(16).toString('hex')
  _states.set(state, { provider, expiresAt: Date.now() + 10 * 60 * 1000 })
  return state
}

function _consumeState(state, provider) {
  const entry = _states.get(state)
  if (!entry || entry.expiresAt < Date.now() || entry.provider !== provider) return false
  _states.delete(state)
  return true
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _appUrl()    { return process.env.APP_URL    || 'http://localhost:5173' }
function _serverUrl() { return process.env.SERVER_URL || 'http://localhost:4000' }

function _errorRedirect(res, msg) {
  return res.redirect(`${_appUrl()}/auth/login?error=${encodeURIComponent(msg)}`)
}

async function _findOrCreateOAuthUser(email, name) {
  const normalEmail = email.toLowerCase().trim()

  let user = await db.oneOrNone('SELECT * FROM users WHERE email = $1', [normalEmail])

  if (!user) {
    user = await db.one(
      `INSERT INTO users (email, name, email_verified, password_hash)
       VALUES ($1, $2, true, '')
       RETURNING id, email, name, role`,
      [normalEmail, name || normalEmail.split('@')[0]]
    )
    logger.info({ userId: user.id, email: normalEmail }, 'OAuth: new user created')
  } else if (!user.email_verified) {
    await db.none(
      'UPDATE users SET email_verified = true, updated_at = now() WHERE id = $1',
      [user.id]
    )
  }

  return user
}

async function _createSession(userId) {
  const token = crypto.randomBytes(48).toString('hex')
  await db.none(
    `INSERT INTO sessions (user_id, token, expires_at, family_created_at)
     VALUES ($1, $2, now() + interval '30 days', now())`,
    [userId, token]
  )
  return token
}

// ── Google OAuth ──────────────────────────────────────────────────────────────

router.get('/auth/google', (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return _errorRedirect(res, 'Google sign-in is not configured')
  }

  const state  = _createState('google')
  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID,
    redirect_uri:  `${_serverUrl()}/api/auth/google/callback`,
    response_type: 'code',
    scope:         'email profile',
    state,
  })

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
})

router.get('/auth/google/callback', async (req, res) => {
  const { code, state, error } = req.query

  if (error || !code)                      return _errorRedirect(res, 'Google sign-in was cancelled')
  if (!_consumeState(state, 'google'))     return _errorRedirect(res, 'Invalid or expired OAuth state')

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({
        code,
        client_id:     process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri:  `${_serverUrl()}/api/auth/google/callback`,
        grant_type:    'authorization_code',
      }),
    })

    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) {
      logger.warn({ tokenData }, 'Google OAuth: missing access_token')
      return _errorRedirect(res, 'Failed to complete Google sign-in')
    }

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const profile = await profileRes.json()

    if (!profile.email) return _errorRedirect(res, 'Google account has no accessible email')

    const user         = await _findOrCreateOAuthUser(profile.email, profile.name)
    const sessionToken = await _createSession(user.id)

    logger.info({ userId: user.id, provider: 'google' }, 'OAuth login successful')
    res.redirect(`${_appUrl()}/auth/oauth/callback?token=${sessionToken}`)
  } catch (err) {
    logger.error({ err }, 'Google OAuth callback error')
    _errorRedirect(res, 'Google sign-in failed. Please try again.')
  }
})

// ── GitHub OAuth ──────────────────────────────────────────────────────────────

router.get('/auth/github', (req, res) => {
  if (!process.env.GITHUB_CLIENT_ID) {
    return _errorRedirect(res, 'GitHub sign-in is not configured')
  }

  const state  = _createState('github')
  const params = new URLSearchParams({
    client_id:    process.env.GITHUB_CLIENT_ID,
    redirect_uri: `${_serverUrl()}/api/auth/github/callback`,
    scope:        'user:email',
    state,
  })

  res.redirect(`https://github.com/login/oauth/authorize?${params}`)
})

router.get('/auth/github/callback', async (req, res) => {
  const { code, state, error } = req.query

  if (error || !code)                      return _errorRedirect(res, 'GitHub sign-in was cancelled')
  if (!_consumeState(state, 'github'))     return _errorRedirect(res, 'Invalid or expired OAuth state')

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept':       'application/json',
      },
      body: JSON.stringify({
        client_id:     process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri:  `${_serverUrl()}/api/auth/github/callback`,
      }),
    })

    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) {
      logger.warn({ tokenData }, 'GitHub OAuth: missing access_token')
      return _errorRedirect(res, 'Failed to complete GitHub sign-in')
    }

    const GITHUB_HEADERS = {
      Authorization: `Bearer ${tokenData.access_token}`,
      'User-Agent':  'Assimetria-App',
      'Accept':      'application/vnd.github+json',
    }

    const profileRes = await fetch('https://api.github.com/user', { headers: GITHUB_HEADERS })
    const profile    = await profileRes.json()

    // GitHub accounts can have a private email — fall back to the emails endpoint.
    let email = profile.email
    if (!email) {
      const emailsRes = await fetch('https://api.github.com/user/emails', { headers: GITHUB_HEADERS })
      const emails    = await emailsRes.json()
      const primary   = Array.isArray(emails) ? emails.find((e) => e.primary && e.verified) : null
      email           = primary?.email ?? null
    }

    if (!email) return _errorRedirect(res, 'GitHub account has no accessible email address')

    const name         = profile.name || profile.login || email.split('@')[0]
    const user         = await _findOrCreateOAuthUser(email, name)
    const sessionToken = await _createSession(user.id)

    logger.info({ userId: user.id, provider: 'github' }, 'OAuth login successful')
    res.redirect(`${_appUrl()}/auth/oauth/callback?token=${sessionToken}`)
  } catch (err) {
    logger.error({ err }, 'GitHub OAuth callback error')
    _errorRedirect(res, 'GitHub sign-in failed. Please try again.')
  }
})

// ── LinkedIn OAuth ─────────────────────────────────────────────────────────────

router.get('/auth/linkedin', (req, res) => {
  if (!process.env.LINKEDIN_CLIENT_ID) {
    return _errorRedirect(res, 'LinkedIn sign-in is not configured')
  }

  const state  = _createState('linkedin')
  const params = new URLSearchParams({
    client_id:     process.env.LINKEDIN_CLIENT_ID,
    redirect_uri:  `${_serverUrl()}/api/auth/linkedin/callback`,
    response_type: 'code',
    scope:         'openid profile email',
    state,
  })

  res.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`)
})

router.get('/auth/linkedin/callback', async (req, res) => {
  const { code, state, error } = req.query

  if (error || !code)                        return _errorRedirect(res, 'LinkedIn sign-in was cancelled')
  if (!_consumeState(state, 'linkedin'))     return _errorRedirect(res, 'Invalid or expired OAuth state')

  try {
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({
        code,
        client_id:     process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
        redirect_uri:  `${_serverUrl()}/api/auth/linkedin/callback`,
        grant_type:    'authorization_code',
      }),
    })

    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) {
      logger.warn({ tokenData }, 'LinkedIn OAuth: missing access_token')
      return _errorRedirect(res, 'Failed to complete LinkedIn sign-in')
    }

    const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const profile = await profileRes.json()

    if (!profile.email) return _errorRedirect(res, 'LinkedIn account has no accessible email')

    const user         = await _findOrCreateOAuthUser(profile.email, profile.name)
    const sessionToken = await _createSession(user.id)

    logger.info({ userId: user.id, provider: 'linkedin' }, 'OAuth login successful')
    res.redirect(`${_appUrl()}/auth/oauth/callback?token=${sessionToken}`)
  } catch (err) {
    logger.error({ err }, 'LinkedIn OAuth callback error')
    _errorRedirect(res, 'LinkedIn sign-in failed. Please try again.')
  }
})

module.exports = router
