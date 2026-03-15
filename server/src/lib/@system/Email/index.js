// @system — email service
// Supports five providers (auto-detected from env vars):
//   resend   — Resend REST API via adapters/resend.js
//   sendgrid — SendGrid v3 API via adapters/sendgrid.js
//   ses      — AWS SES via @aws-sdk/client-ses
//   smtp     — any SMTP server via adapters/smtp.js (Resend SMTP relay, SendGrid, Mailgun, etc.)
//   console  — logs emails to stdout (dev / test fallback)
//
// Provider selection order:
//   1. Explicit: EMAIL_PROVIDER=resend|sendgrid|ses|smtp|console
//   2. Auto-detect: resend when RESEND_API_KEY is set;
//                   sendgrid when SENDGRID_API_KEY is set;
//                   ses when AWS creds + SES_FROM_EMAIL are set;
//                   smtp when SMTP_HOST is set;
//                   else console
//
// Usage:
//   const email = require('../lib/@system/Email')
//   await email.send({ to, subject, html, text })
//   await email.sendVerificationEmail({ to, name, token })
//   await email.sendWelcomeEmail({ to, name })
//   await email.sendPasswordResetEmail({ to, name, token })
//
// Sub-modules (require separately):
//   ./bounces      — Bounce/complaint handling & suppression list
//   ./webhooks     — Webhook signature verification for Resend/SendGrid/SES
//   ./dns-helpers  — SPF/DKIM/DMARC record generation & validation
//   ./rate-limit   — Per-recipient and global send rate limiting

const logger    = require('../Logger')
const templates = require('./templates')
const bounces   = require('./bounces')
const rateLimit = require('./rate-limit')

// ── Email delivery log (DB) ───────────────────────────────────────────────────
// Every send attempt is recorded in the email_log table so that delivery history
// is visible in the UI and available for debugging.  Writes degrade gracefully:
// if the DB is not configured or the migration has not run, the error is swallowed
// so it never interrupts email delivery.

function getDb() {
  return require('../PostgreSQL')
}

async function recordEmailLog({ to, subject, provider, status, error = null, messageId = null }) {
  try {
    const db = getDb()
    await db.none(
      `INSERT INTO email_log ("to", subject, provider, status, error, message_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [to, subject, provider, status, error || null, messageId || null]
    )
  } catch {
    // Silently ignore — audit log must never break email delivery.
  }
}

const APP_NAME = process.env.APP_NAME || 'App'
const APP_URL  = process.env.APP_URL  || 'http://localhost:5173'

// Rate limiting: enabled in production by default.
// Override explicitly with EMAIL_RATE_LIMIT_ENABLED=true|false.
const RATE_LIMIT_ENABLED = process.env.EMAIL_RATE_LIMIT_ENABLED !== undefined
  ? process.env.EMAIL_RATE_LIMIT_ENABLED !== 'false'
  : process.env.NODE_ENV === 'production'

function getFrom() {
  return process.env.EMAIL_FROM || `${APP_NAME} <noreply@example.com>`
}

// ── Provider detection ────────────────────────────────────────────────────────

function detectProvider() {
  const explicit = process.env.EMAIL_PROVIDER
  if (explicit) return explicit

  if (process.env.RESEND_API_KEY) return 'resend'
  if (process.env.SENDGRID_API_KEY) return 'sendgrid'

  const hasAwsCreds = process.env.AWS_ACCESS_KEY_ID && process.env.SES_FROM_EMAIL
  if (hasAwsCreds) return 'ses'

  if (process.env.SMTP_HOST) return 'smtp'

  return 'console'
}

// ── SMTP transport (adapters/smtp.js, lazy init) ──────────────────────────────

let _smtpTransport = null

function getSmtpTransport() {
  if (_smtpTransport) return _smtpTransport
  const smtpAdapter = require('./adapters/smtp')
  _smtpTransport = smtpAdapter.createTransport()
  return _smtpTransport
}

// ── SES client (AWS SDK v3, lazy init) ────────────────────────────────────────

let _sesClient = null

function getSesClient() {
  if (_sesClient) return _sesClient

  const { SESClient } = require('@aws-sdk/client-ses')
  _sesClient = new SESClient({ region: process.env.AWS_REGION ?? 'eu-west-1' })
  return _sesClient
}

// ── Core send ─────────────────────────────────────────────────────────────────

/**
 * Send a single email.
 *
 * @param {object} opts
 * @param {string}  opts.to       - Recipient address
 * @param {string}  opts.subject  - Email subject line
 * @param {string}  [opts.html]   - HTML body
 * @param {string}  [opts.text]   - Plain-text body (fallback)
 * @param {string}  [opts.from]   - Sender address (defaults to EMAIL_FROM / APP_NAME)
 */
async function send({ to, subject, html, text, from, skipChecks = false }) {
  from = from || getFrom()
  const provider = detectProvider()

  // ── Pre-send checks (suppression + rate limit) ────────────────────────────
  if (!skipChecks && provider !== 'console') {
    // Check suppression list
    const suppressed = await bounces.isSuppressed(to)
    if (suppressed) {
      logger.warn({ to, subject, provider }, 'email blocked — recipient is suppressed')
      await recordEmailLog({ to, subject, provider, status: 'suppressed', error: 'Recipient on suppression list' })
      return { suppressed: true, provider }
    }

    // Check rate limits
    if (RATE_LIMIT_ENABLED) {
      const rl = await rateLimit.checkRateLimit(to)
      if (!rl.allowed) {
        const msg = `Email rate limit exceeded for ${to} — retry after ${rl.retryAfter}s`
        logger.warn({ to, subject, provider, retryAfter: rl.retryAfter }, 'email blocked — rate limited')
        await recordEmailLog({ to, subject, provider, status: 'rate_limited', error: msg })
        const err = Object.assign(new Error(msg), { code: 'EMAIL_RATE_LIMITED', retryAfter: rl.retryAfter })
        throw err
      }
    }
  }

  try {
    if (provider === 'console') {
      logger.info({ to, subject, provider: 'console' }, 'email (console mode — not delivered)')
      logger.debug({ to, subject, body: text || html }, 'email content')
      return
    }

    let result

    if (provider === 'resend') {
      const resendAdapter = require('./adapters/resend')
      result = await resendAdapter.send({ from, to, subject, html, text })
      logger.info({ to, subject, messageId: result.messageId, provider: 'resend' }, 'email sent')
    } else if (provider === 'sendgrid') {
      const sendgridAdapter = require('./adapters/sendgrid')
      result = await sendgridAdapter.send({ from, to, subject, html, text })
      logger.info({ to, subject, messageId: result.messageId, provider: 'sendgrid' }, 'email sent')
    } else if (provider === 'smtp') {
      const smtpAdapter = require('./adapters/smtp')
      const transport   = getSmtpTransport()
      result = await smtpAdapter.send({ transporter: transport, from, to, subject, html, text })
      logger.info({ to, subject, messageId: result.messageId, provider: 'smtp' }, 'email sent')
    } else if (provider === 'ses') {
      const { SendEmailCommand } = require('@aws-sdk/client-ses')
      const source = process.env.SES_FROM_EMAIL || from

      const cmd = new SendEmailCommand({
        Source: source,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: subject, Charset: 'UTF-8' },
          Body: {
            ...(html && { Html: { Data: html, Charset: 'UTF-8' } }),
            ...(text && { Text: { Data: text, Charset: 'UTF-8' } }),
          },
        },
      })

      const sesResult = await getSesClient().send(cmd)
      result = { messageId: sesResult.MessageId, provider: 'ses' }
      logger.info({ to, subject, messageId: result.messageId, provider: 'ses' }, 'email sent')
    } else {
      logger.error({ provider, to, subject }, 'unknown email provider — email not sent')
      return
    }

    // Record successful send for rate limiting
    if (!skipChecks && RATE_LIMIT_ENABLED) {
      await rateLimit.recordSend(to)
    }
    await recordEmailLog({ to, subject, provider, status: 'sent', messageId: result?.messageId })
    return result
  } catch (err) {
    logger.error({ err, to, subject, provider }, 'failed to send email')
    await recordEmailLog({ to, subject, provider, status: 'failed', error: err.message })
    throw err
  }
}

// ── Transactional email senders ───────────────────────────────────────────────

/**
 * Send an email verification link after registration or on resend.
 *
 * @param {object} opts
 * @param {string} opts.to    - Recipient email
 * @param {string} [opts.name]  - Recipient display name
 * @param {string} opts.token - Raw verification token (appended to APP_URL/verify-email)
 */
async function sendVerificationEmail({ to, name, token }) {
  const verifyUrl = `${APP_URL}/verify-email?token=${token}`

  const html = templates.verification({ name, verifyUrl })

  const text = [
    name ? `Hi ${name},` : 'Hi,',
    '',
    `Verify your ${APP_NAME} account: ${verifyUrl}`,
    '',
    'This link expires in 24 hours.',
    '',
    'If you did not create an account, you can safely ignore this email.',
  ].join('\n')

  await send({ to, subject: `Verify your email — ${APP_NAME}`, html, text })
}

/**
 * Send a welcome email after a user verifies their address.
 *
 * @param {object} opts
 * @param {string} opts.to    - Recipient email
 * @param {string} [opts.name]  - Recipient display name
 */
async function sendWelcomeEmail({ to, name }) {
  const html = templates.welcome({ name, appUrl: APP_URL, appName: APP_NAME })

  const text = [
    name ? `Welcome, ${name}!` : 'Welcome!',
    '',
    `Your ${APP_NAME} account is ready.`,
    '',
    `Go to your dashboard: ${APP_URL}/dashboard`,
  ].join('\n')

  await send({ to, subject: `Welcome to ${APP_NAME}`, html, text })
}

/**
 * Send a password reset link.
 *
 * @param {object} opts
 * @param {string} opts.to    - Recipient email
 * @param {string} [opts.name]  - Recipient display name
 * @param {string} opts.token - Raw reset token (appended to APP_URL/reset-password)
 */
async function sendPasswordResetEmail({ to, name, token }) {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`

  const html = templates.passwordReset({ name, resetUrl })

  const text = [
    name ? `Hi ${name},` : 'Hi,',
    '',
    `Reset your ${APP_NAME} password: ${resetUrl}`,
    '',
    'This link expires in 1 hour.',
    '',
    'If you did not request a password reset, please ignore this email.',
  ].join('\n')

  await send({ to, subject: `Reset your password — ${APP_NAME}`, html, text })
}

/**
 * Send a team/workspace invitation email.
 *
 * @param {object} opts
 * @param {string} opts.to           - Recipient email
 * @param {string} opts.inviterName  - Display name of the person sending the invite
 * @param {string} opts.teamName     - Name of the team/workspace being joined
 * @param {string} opts.token        - Raw invite token (appended to APP_URL/accept-invite)
 */
async function sendInvitationEmail({ to, inviterName, teamName, token }) {
  const inviteUrl = `${APP_URL}/accept-invite?token=${token}`

  const html = templates.invitation({ inviterName, orgName: teamName, inviteUrl })

  const text = [
    'Hi,',
    '',
    `${inviterName} has invited you to join ${teamName} on ${APP_NAME}.`,
    '',
    `Accept the invitation: ${inviteUrl}`,
    '',
    'This invite link expires in 7 days.',
    '',
    'If you were not expecting this, please ignore this email.',
  ].join('\n')

  await send({ to, subject: `You're invited to join ${teamName} on ${APP_NAME}`, html, text })
}

/**
 * Send a magic link (passwordless) sign-in email.
 * The link should be single-use and short-lived (15 minutes recommended).
 *
 * @param {object} opts
 * @param {string} opts.to     - Recipient email
 * @param {string} [opts.name] - Recipient display name
 * @param {string} opts.token  - Raw magic-link token (appended to APP_URL/auth/magic)
 */
async function sendMagicLinkEmail({ to, name, token }) {
  const magicUrl = `${APP_URL}/auth/magic?token=${token}`

  const html = templates.magicLink({ name, magicUrl })

  const text = [
    name ? `Hi ${name},` : 'Hi,',
    '',
    `Sign in to ${APP_NAME}: ${magicUrl}`,
    '',
    'This link expires in 15 minutes and can only be used once.',
    '',
    'If you did not request this, please ignore this email.',
  ].join('\n')

  await send({ to, subject: `Your sign-in link for ${APP_NAME}`, html, text })
}

/**
 * Send a generic notification email with an optional call-to-action button.
 * Use for product alerts, billing events, feature announcements, etc.
 *
 * @param {object} opts
 * @param {string} opts.to           - Recipient email
 * @param {string} [opts.name]       - Recipient display name
 * @param {string} opts.title        - Notification heading (also used as email subject)
 * @param {string} opts.message      - Notification body text (plain string, no HTML)
 * @param {string} [opts.ctaLabel]   - CTA button label — omit to skip the button
 * @param {string} [opts.ctaUrl]     - CTA button target URL
 */
async function sendNotificationEmail({ to, name, title, message, ctaLabel, ctaUrl }) {
  const greeting = name ? `Hi ${name},<br><br>` : ''
  const html = templates.notification({
    title,
    body: `${greeting}${message}`,
    ctaLabel,
    ctaUrl,
  })

  const text = [
    name ? `Hi ${name},` : 'Hi,',
    '',
    title,
    '',
    message,
    ...(ctaLabel && ctaUrl ? ['', `${ctaLabel}: ${ctaUrl}`] : []),
  ].join('\n')

  await send({ to, subject: `${title} — ${APP_NAME}`, html, text })
}

module.exports = {
  send,
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendInvitationEmail,
  sendMagicLinkEmail,
  sendNotificationEmail,
  // Sub-modules (also available via direct require)
  bounces,
  rateLimiter: rateLimit,
  webhooks:    require('./webhooks'),
  dnsHelpers:  require('./dns-helpers'),
}
