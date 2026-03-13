/**
 * Webhook delivery service
 * Sends webhook payloads to user-defined URLs with retry logic
 */

const crypto = require('crypto')
const WebhookRepo = require('../../db/repos/@custom/WebhookRepo')
const logger = require('../@system/Logger')

const MAX_ATTEMPTS = 3
const RETRY_DELAYS = [60, 300, 900] // seconds: 1min, 5min, 15min
const DELIVERY_TIMEOUT = 10000 // 10 seconds

/**
 * Generate HMAC signature for webhook payload
 */
function generateSignature(payload, secret) {
  if (!secret) return null
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(typeof payload === 'string' ? payload : JSON.stringify(payload))
  return `sha256=${hmac.digest('hex')}`
}

/**
 * Deliver a webhook payload to a URL
 */
async function deliverWebhook(url, payload, secret) {
  const body = JSON.stringify(payload)
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'Linkforge-Webhook/1.0',
    'X-Webhook-Event': payload.event,
    'X-Webhook-Timestamp': new Date().toISOString(),
  }

  if (secret) {
    headers['X-Webhook-Signature'] = generateSignature(body, secret)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    })

    clearTimeout(timeout)

    let responseBody = ''
    try {
      responseBody = await response.text()
      if (responseBody.length > 1000) responseBody = responseBody.slice(0, 1000)
    } catch { /* ignore */ }

    return {
      status_code: response.status,
      response_body: responseBody,
      success: response.status >= 200 && response.status < 300,
      error_message: response.status >= 400 ? `HTTP ${response.status}` : null,
    }
  } catch (err) {
    clearTimeout(timeout)
    return {
      status_code: null,
      response_body: null,
      success: false,
      error_message: err.name === 'AbortError' ? 'Request timeout (10s)' : err.message,
    }
  }
}

/**
 * Fire webhooks for a specific event
 * Called after a click event is recorded
 */
async function fireWebhooks(user_id, event_type, eventData) {
  try {
    const webhooks = await WebhookRepo.findActiveByEvent(user_id, event_type)

    if (webhooks.length === 0) return

    const payload = {
      event: event_type,
      timestamp: new Date().toISOString(),
      data: eventData,
    }

    // Fire all webhooks in parallel (fire and forget per webhook)
    for (const webhook of webhooks) {
      deliverAndLog(webhook, event_type, payload, 1).catch(err => {
        logger.error({ err, webhook_id: webhook.id }, 'Webhook delivery failed')
      })
    }
  } catch (err) {
    logger.error({ err, user_id, event_type }, 'Error firing webhooks')
  }
}

/**
 * Deliver webhook and log the attempt
 */
async function deliverAndLog(webhook, event_type, payload, attempt) {
  const result = await deliverWebhook(webhook.url, payload, webhook.secret)

  const nextRetryAt = !result.success && attempt < MAX_ATTEMPTS
    ? new Date(Date.now() + RETRY_DELAYS[attempt - 1] * 1000)
    : null

  await WebhookRepo.logDelivery({
    webhook_id: webhook.id,
    event_type,
    payload,
    status_code: result.status_code,
    response_body: result.response_body,
    attempt,
    max_attempts: MAX_ATTEMPTS,
    success: result.success,
    error_message: result.error_message,
    next_retry_at: nextRetryAt,
  })

  if (result.success) {
    logger.info({ webhook_id: webhook.id, event_type }, 'Webhook delivered successfully')
  } else {
    logger.warn({ webhook_id: webhook.id, event_type, attempt, error: result.error_message }, 'Webhook delivery failed')
  }
}

/**
 * Process pending retries (called periodically)
 */
async function processRetries() {
  try {
    const pending = await WebhookRepo.getPendingRetries()

    for (const delivery of pending) {
      const nextAttempt = delivery.attempt + 1
      const result = await deliverWebhook(delivery.url, delivery.payload, delivery.secret)

      const nextRetryAt = !result.success && nextAttempt < delivery.max_attempts
        ? new Date(Date.now() + RETRY_DELAYS[nextAttempt - 1] * 1000)
        : null

      await WebhookRepo.updateDelivery(delivery.id, {
        status_code: result.status_code,
        response_body: result.response_body,
        attempt: nextAttempt,
        success: result.success,
        error_message: result.error_message,
        next_retry_at: nextRetryAt,
      })
    }

    return pending.length
  } catch (err) {
    logger.error({ err }, 'Error processing webhook retries')
    return 0
  }
}

/**
 * Send a test webhook delivery
 */
async function sendTestWebhook(webhook) {
  const payload = {
    event: 'webhook.test',
    timestamp: new Date().toISOString(),
    data: {
      message: 'This is a test webhook from Linkforge',
      webhook_id: webhook.id,
      webhook_name: webhook.name,
    },
  }

  const result = await deliverWebhook(webhook.url, payload, webhook.secret)

  await WebhookRepo.logDelivery({
    webhook_id: webhook.id,
    event_type: 'webhook.test',
    payload,
    status_code: result.status_code,
    response_body: result.response_body,
    attempt: 1,
    max_attempts: 1,
    success: result.success,
    error_message: result.error_message,
    next_retry_at: null,
  })

  return result
}

module.exports = {
  fireWebhooks,
  processRetries,
  sendTestWebhook,
  generateSignature,
}
