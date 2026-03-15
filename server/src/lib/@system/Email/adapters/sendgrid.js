// @system — SendGrid email adapter
// Sends email via SendGrid's v3 Mail Send API (https://api.sendgrid.com/v3/mail/send).
// Uses native Node.js fetch (Node 18+) — no SDK dependency required.
//
// Required env vars:
//   SENDGRID_API_KEY  — SendGrid API key (SG.xxxxxxxx...)
//   EMAIL_FROM        — Sender address e.g. "App <noreply@yourdomain.com>"
//
// Optional:
//   SENDGRID_REPLY_TO   — Reply-to address
//   SENDGRID_SANDBOX     — 'true' to enable sandbox mode (validates but doesn't send)
//
// Usage (via Email index — do not call directly):
//   const adapter = require('./adapters/sendgrid')
//   await adapter.send({ from, to, subject, html, text })

'use strict'

const logger = require('../../Logger')

const SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send'

/**
 * Parse an email address string like "Name <email@domain.com>" into SendGrid format.
 * @param {string} addr
 * @returns {{ email: string, name?: string }}
 */
function parseAddress(addr) {
  const match = addr.match(/^(.+?)\s*<(.+?)>$/)
  if (match) return { name: match[1].trim(), email: match[2].trim() }
  return { email: addr.trim() }
}

/**
 * Validate that required env vars are present.
 * Throws if SENDGRID_API_KEY is missing.
 */
function assertConfig() {
  if (!process.env.SENDGRID_API_KEY) {
    throw new Error('[Email/SendGrid] SENDGRID_API_KEY env var is required')
  }
}

/**
 * Send an email via SendGrid's v3 Mail Send API.
 *
 * @param {object} opts
 * @param {string}   opts.from      Sender (e.g. "App <noreply@domain.com>")
 * @param {string}   opts.to        Recipient address (or comma-separated list)
 * @param {string}   opts.subject   Subject line
 * @param {string}   opts.html      HTML body
 * @param {string}  [opts.text]     Plain-text fallback
 * @param {string}  [opts.replyTo]  Reply-to override (falls back to SENDGRID_REPLY_TO)
 * @param {string[]} [opts.cc]      CC recipients
 * @param {string[]} [opts.bcc]     BCC recipients
 * @param {object[]} [opts.attachments] Attachments [{ filename, content (base64), type (mime) }]
 * @returns {Promise<{ messageId: string, provider: 'sendgrid' }>}
 */
async function send({ from, to, subject, html, text, replyTo, cc, bcc, attachments }) {
  assertConfig()

  const apiKey = process.env.SENDGRID_API_KEY
  const replyToAddr = replyTo ?? process.env.SENDGRID_REPLY_TO ?? undefined
  const sandbox = process.env.SENDGRID_SANDBOX === 'true'

  // Build recipient arrays
  const toArray = (Array.isArray(to) ? to : [to]).map(a => parseAddress(a))
  const ccArray = cc?.length ? (Array.isArray(cc) ? cc : [cc]).map(a => parseAddress(a)) : undefined
  const bccArray = bcc?.length ? (Array.isArray(bcc) ? bcc : [bcc]).map(a => parseAddress(a)) : undefined

  const personalization = {
    to: toArray,
    ...(ccArray && { cc: ccArray }),
    ...(bccArray && { bcc: bccArray }),
  }

  const payload = {
    personalizations: [personalization],
    from: parseAddress(from),
    subject,
    content: [
      ...(text ? [{ type: 'text/plain', value: text }] : []),
      ...(html ? [{ type: 'text/html', value: html }] : []),
    ],
    ...(replyToAddr && { reply_to: parseAddress(replyToAddr) }),
    ...(sandbox && { mail_settings: { sandbox_mode: { enable: true } } }),
    ...(attachments?.length && {
      attachments: attachments.map(a => ({
        content: a.content, // base64
        filename: a.filename,
        type: a.type || 'application/octet-stream',
        disposition: a.disposition || 'attachment',
      })),
    }),
  }

  let response
  try {
    response = await fetch(SENDGRID_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  } catch (networkErr) {
    logger.error({ err: networkErr, to, subject }, '[Email/SendGrid] Network error')
    throw new Error(`[Email/SendGrid] Network error: ${networkErr.message}`)
  }

  // SendGrid returns 202 on success with empty body
  if (response.status === 202 || response.status === 200) {
    const messageId = response.headers.get('x-message-id') ?? 'unknown'
    logger.info({ messageId, to, subject, sandbox }, '[Email/SendGrid] sent')
    return { messageId, provider: 'sendgrid' }
  }

  let body
  try {
    body = await response.json()
  } catch {
    body = {}
  }

  const errors = body?.errors?.map(e => e.message).join('; ') ?? `HTTP ${response.status}`
  const err = new Error(`[Email/SendGrid] API error: ${errors}`)
  err.statusCode = response.status
  err.sendgridBody = body
  logger.error({ statusCode: response.status, body, to, subject }, '[Email/SendGrid] API error')
  throw err
}

/**
 * Verify the SendGrid API key is valid by calling the /v3/scopes endpoint.
 * Returns { valid: true, scopes } on success, { valid: false, reason } on failure.
 * Does NOT throw — safe to call in health checks.
 */
async function verify() {
  if (!process.env.SENDGRID_API_KEY) {
    return { valid: false, reason: 'SENDGRID_API_KEY not set' }
  }

  try {
    const response = await fetch('https://api.sendgrid.com/v3/scopes', {
      headers: { Authorization: `Bearer ${process.env.SENDGRID_API_KEY}` },
    })

    if (response.status === 200) {
      const body = await response.json()
      return { valid: true, scopes: body.scopes }
    }
    if (response.status === 401 || response.status === 403) {
      return { valid: false, reason: 'Invalid or insufficient API key' }
    }
    return { valid: false, reason: `Unexpected status ${response.status}` }
  } catch (err) {
    return { valid: false, reason: `Network error: ${err.message}` }
  }
}

module.exports = { send, verify }
