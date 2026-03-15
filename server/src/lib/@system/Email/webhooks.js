// @system — Email webhook signature verification & event parsing
// Verifies incoming webhook signatures from email providers and normalizes
// events into a standard format for the bounce/complaint handler.
//
// Supported providers:
//   - Resend:   SVIX signature verification (svix-id, svix-timestamp, svix-signature headers)
//   - SendGrid: Signed Event Webhook verification (X-Twilio-Email-Event-Webhook-Signature)
//   - AWS SES:  SNS message signature verification (via certificate URL)
//
// Usage:
//   const webhooks = require('../lib/@system/Email/webhooks')
//   router.post('/webhooks/email/resend', async (req, res) => {
//     const valid = webhooks.verifyResend(req)
//     if (!valid) return res.status(401).json({ error: 'Invalid signature' })
//     const events = webhooks.parseResendEvents(req.body)
//     for (const evt of events) await bounces.recordBounce(evt)
//     res.json({ ok: true })
//   })

'use strict'

const crypto = require('crypto')
const logger = require('../Logger')

// ── Resend Webhook Verification ───────────────────────────────────────────────
// Resend uses Svix for webhook delivery.
// Signature: base64(HMAC-SHA256(webhook_secret, "${msg_id}.${timestamp}.${body}"))
// Headers: svix-id, svix-timestamp, svix-signature

/**
 * Verify a Resend/Svix webhook signature.
 *
 * @param {object} req Express request (must have raw body available)
 * @param {object} opts
 * @param {string} [opts.secret] Webhook signing secret (defaults to RESEND_WEBHOOK_SECRET env)
 * @param {number} [opts.toleranceSec=300] Max age in seconds (default 5 minutes)
 * @returns {boolean}
 */
function verifyResend(req, { secret, toleranceSec = 300 } = {}) {
  const signingSecret = secret ?? process.env.RESEND_WEBHOOK_SECRET
  if (!signingSecret) {
    logger.warn('[Email/Webhooks] RESEND_WEBHOOK_SECRET not set — skipping verification')
    return false
  }

  const msgId = req.headers['svix-id']
  const timestamp = req.headers['svix-timestamp']
  const signatures = req.headers['svix-signature']

  if (!msgId || !timestamp || !signatures) {
    logger.warn('[Email/Webhooks] Missing Svix headers')
    return false
  }

  // Check timestamp tolerance
  const ts = parseInt(timestamp, 10)
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - ts) > toleranceSec) {
    logger.warn({ delta: now - ts, tolerance: toleranceSec }, '[Email/Webhooks] Timestamp out of tolerance')
    return false
  }

  // Reconstruct the signed content
  const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
  const signedContent = `${msgId}.${timestamp}.${body}`

  // Secret may be prefixed with "whsec_"
  const secretBytes = Buffer.from(
    signingSecret.startsWith('whsec_') ? signingSecret.slice(6) : signingSecret,
    'base64'
  )

  const expectedSig = crypto
    .createHmac('sha256', secretBytes)
    .update(signedContent)
    .digest('base64')

  // Svix sends multiple signatures (versioned), check all
  const sigList = signatures.split(' ')
  for (const versionedSig of sigList) {
    const [, sig] = versionedSig.split(',')
    if (sig && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
      return true
    }
  }

  logger.warn('[Email/Webhooks] Resend signature mismatch')
  return false
}

/**
 * Parse Resend webhook events into normalized bounce/complaint format.
 *
 * @param {object} body Webhook payload
 * @returns {object[]} Array of { email, type, provider, details }
 */
function parseResendEvents(body) {
  const events = []
  const eventType = body.type

  if (!eventType || !body.data) return events

  const data = body.data
  const email = (data.to?.[0] ?? data.email ?? '').toLowerCase().trim()

  if (!email) return events

  const mapping = {
    'email.bounced': 'hard_bounce',
    'email.delivery_delayed': 'soft_bounce',
    'email.complained': 'complaint',
  }

  const type = mapping[eventType]
  if (type) {
    events.push({
      email,
      type,
      provider: 'resend',
      details: {
        resendEventType: eventType,
        messageId: data.email_id,
        reason: data.bounce?.type ?? data.reason ?? null,
        timestamp: body.created_at,
      },
    })
  }

  return events
}

// ── SendGrid Webhook Verification ─────────────────────────────────────────────
// SendGrid Signed Event Webhooks use ECDSA with a verification key.
// Headers: X-Twilio-Email-Event-Webhook-Signature, X-Twilio-Email-Event-Webhook-Timestamp

/**
 * Verify a SendGrid Event Webhook signature (ECDSA).
 *
 * @param {object} req Express request
 * @param {object} opts
 * @param {string} [opts.verificationKey] Public key (defaults to SENDGRID_WEBHOOK_VERIFICATION_KEY env)
 * @param {number} [opts.toleranceSec=300] Max age in seconds
 * @returns {boolean}
 */
function verifySendGrid(req, { verificationKey, toleranceSec = 300 } = {}) {
  const pubKey = verificationKey ?? process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY
  if (!pubKey) {
    logger.warn('[Email/Webhooks] SENDGRID_WEBHOOK_VERIFICATION_KEY not set — skipping verification')
    return false
  }

  const signature = req.headers['x-twilio-email-event-webhook-signature']
  const timestamp = req.headers['x-twilio-email-event-webhook-timestamp']

  if (!signature || !timestamp) {
    logger.warn('[Email/Webhooks] Missing SendGrid webhook headers')
    return false
  }

  // Check timestamp tolerance
  const ts = parseInt(timestamp, 10)
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - ts) > toleranceSec) {
    logger.warn({ delta: now - ts }, '[Email/Webhooks] SendGrid timestamp out of tolerance')
    return false
  }

  const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
  const payload = timestamp + body

  try {
    const verify = crypto.createVerify('sha256')
    verify.update(payload)
    verify.end()
    return verify.verify(pubKey, signature, 'base64')
  } catch (err) {
    logger.error({ err }, '[Email/Webhooks] SendGrid signature verification error')
    return false
  }
}

/**
 * Parse SendGrid Event Webhook payload into normalized bounce/complaint format.
 * SendGrid sends an array of event objects.
 *
 * @param {object[]} body Webhook payload (array of events)
 * @returns {object[]} Array of { email, type, provider, details }
 */
function parseSendGridEvents(body) {
  const events = []
  const items = Array.isArray(body) ? body : [body]

  const mapping = {
    bounce: 'hard_bounce',
    blocked: 'soft_bounce',
    deferred: 'soft_bounce',
    spamreport: 'complaint',
    unsubscribe: 'unsubscribe',
    group_unsubscribe: 'unsubscribe',
  }

  for (const item of items) {
    const type = mapping[item.event]
    if (!type || !item.email) continue

    events.push({
      email: item.email.toLowerCase().trim(),
      type,
      provider: 'sendgrid',
      details: {
        sgEventId: item.sg_event_id,
        sgMessageId: item.sg_message_id,
        event: item.event,
        reason: item.reason ?? item.response ?? null,
        bounceType: item.type ?? null,
        timestamp: item.timestamp,
      },
    })
  }

  return events
}

// ── AWS SES SNS Webhook Verification ──────────────────────────────────────────
// SES notifications are delivered via SNS. SNS messages are signed with a
// certificate. We verify using the signing cert URL from the message.

/**
 * Verify an AWS SNS message signature.
 * Fetches the signing certificate from Amazon's CDN and verifies the signature.
 *
 * @param {object} message Parsed SNS message body
 * @returns {Promise<boolean>}
 */
async function verifySNS(message) {
  if (!message || !message.SigningCertURL || !message.Signature) {
    logger.warn('[Email/Webhooks] Missing SNS signing fields')
    return false
  }

  // Validate cert URL is from Amazon
  try {
    const certUrl = new URL(message.SigningCertURL)
    if (
      certUrl.protocol !== 'https:' ||
      !certUrl.hostname.endsWith('.amazonaws.com')
    ) {
      logger.warn({ url: message.SigningCertURL }, '[Email/Webhooks] Invalid SNS cert URL')
      return false
    }
  } catch {
    return false
  }

  try {
    // Fetch signing certificate
    const certResponse = await fetch(message.SigningCertURL)
    if (!certResponse.ok) {
      logger.warn('[Email/Webhooks] Failed to fetch SNS signing cert')
      return false
    }
    const cert = await certResponse.text()

    // Build the string to sign based on message type
    let stringToSign
    if (message.Type === 'Notification') {
      stringToSign = [
        'Message', message.Message,
        'MessageId', message.MessageId,
        ...(message.Subject ? ['Subject', message.Subject] : []),
        'Timestamp', message.Timestamp,
        'TopicArn', message.TopicArn,
        'Type', message.Type,
      ].join('\n') + '\n'
    } else {
      // SubscriptionConfirmation / UnsubscribeConfirmation
      stringToSign = [
        'Message', message.Message,
        'MessageId', message.MessageId,
        'SubscribeURL', message.SubscribeURL,
        'Timestamp', message.Timestamp,
        'Token', message.Token,
        'TopicArn', message.TopicArn,
        'Type', message.Type,
      ].join('\n') + '\n'
    }

    const verify = crypto.createVerify('SHA1withRSA')
    verify.update(stringToSign)
    return verify.verify(cert, message.Signature, 'base64')
  } catch (err) {
    logger.error({ err }, '[Email/Webhooks] SNS verification error')
    return false
  }
}

/**
 * Parse AWS SES bounce/complaint notifications (delivered via SNS).
 *
 * @param {object} message SNS message body (parsed JSON)
 * @returns {object[]} Array of { email, type, provider, details }
 */
function parseSESEvents(message) {
  const events = []

  if (message.Type === 'SubscriptionConfirmation') {
    // Not an email event — needs to be confirmed
    logger.info({ subscribeUrl: message.SubscribeURL }, '[Email/Webhooks] SNS subscription confirmation')
    return events
  }

  let notification
  try {
    notification = typeof message.Message === 'string' ? JSON.parse(message.Message) : message.Message
  } catch {
    return events
  }

  if (!notification || !notification.notificationType) return events

  if (notification.notificationType === 'Bounce') {
    const bounce = notification.bounce
    const isHard = bounce?.bounceType === 'Permanent'

    for (const recipient of bounce?.bouncedRecipients ?? []) {
      events.push({
        email: recipient.emailAddress.toLowerCase().trim(),
        type: isHard ? 'hard_bounce' : 'soft_bounce',
        provider: 'ses',
        details: {
          bounceType: bounce.bounceType,
          bounceSubType: bounce.bounceSubType,
          diagnosticCode: recipient.diagnosticCode,
          messageId: notification.mail?.messageId,
          timestamp: bounce.timestamp,
        },
      })
    }
  }

  if (notification.notificationType === 'Complaint') {
    const complaint = notification.complaint

    for (const recipient of complaint?.complainedRecipients ?? []) {
      events.push({
        email: recipient.emailAddress.toLowerCase().trim(),
        type: 'complaint',
        provider: 'ses',
        details: {
          complaintFeedbackType: complaint.complaintFeedbackType,
          messageId: notification.mail?.messageId,
          timestamp: complaint.timestamp,
        },
      })
    }
  }

  return events
}

module.exports = {
  // Verification
  verifyResend,
  verifySendGrid,
  verifySNS,
  // Event parsing
  parseResendEvents,
  parseSendGridEvents,
  parseSESEvents,
}
