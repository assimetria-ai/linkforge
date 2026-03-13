// @custom — Webhooks API for link click event delivery
const express = require('express')
const crypto = require('crypto')
const router = express.Router()
const { authenticate } = require('../../../lib/@system/Helpers/auth')
const WebhookRepo = require('../../../db/repos/@custom/WebhookRepo')
const { sendTestWebhook } = require('../../../lib/@custom/webhook-service')

const VALID_EVENTS = ['link.click']

function isValidUrl(url) {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

// ─── GET /api/webhooks ───────────────────────────────────────────────────────
// List user's webhooks
router.get('/webhooks', authenticate, async (req, res, next) => {
  try {
    const webhooks = await WebhookRepo.findByUserId(req.user.id)
    // Mask secrets in response
    const masked = webhooks.map(w => ({
      ...w,
      secret: w.secret ? '••••••••' : null,
    }))
    res.json({ webhooks: masked })
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/webhooks/:id ───────────────────────────────────────────────────
// Get single webhook with delivery history
router.get('/webhooks/:id', authenticate, async (req, res, next) => {
  try {
    const webhook = await WebhookRepo.findById(req.params.id)
    if (!webhook || webhook.user_id !== req.user.id) {
      return res.status(404).json({ message: 'Webhook not found' })
    }

    const deliveries = await WebhookRepo.getDeliveries(webhook.id, {
      limit: parseInt(req.query.limit) || 20,
      offset: parseInt(req.query.offset) || 0,
    })

    res.json({
      webhook: { ...webhook, secret: webhook.secret ? '••••••••' : null },
      deliveries,
    })
  } catch (err) {
    next(err)
  }
})

// ─── POST /api/webhooks ─────────────────────────────────────────────────────
// Create a new webhook
router.post('/webhooks', authenticate, async (req, res, next) => {
  try {
    const { name, url, secret, events } = req.body

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Webhook name is required' })
    }

    if (!url || !isValidUrl(url)) {
      return res.status(400).json({ message: 'A valid HTTP(S) URL is required' })
    }

    // Validate events
    const eventList = events || ['link.click']
    const invalidEvents = eventList.filter(e => !VALID_EVENTS.includes(e))
    if (invalidEvents.length > 0) {
      return res.status(400).json({ message: `Invalid event types: ${invalidEvents.join(', ')}` })
    }

    // Generate a secret if not provided
    const webhookSecret = secret || crypto.randomBytes(32).toString('hex')

    const webhook = await WebhookRepo.create({
      user_id: req.user.id,
      name: name.trim(),
      url: url.trim(),
      secret: webhookSecret,
      events: eventList,
    })

    // Return the secret only on creation (won't be shown again)
    res.status(201).json({ webhook })
  } catch (err) {
    next(err)
  }
})

// ─── PATCH /api/webhooks/:id ─────────────────────────────────────────────────
// Update a webhook
router.patch('/webhooks/:id', authenticate, async (req, res, next) => {
  try {
    const webhook = await WebhookRepo.findById(req.params.id)
    if (!webhook || webhook.user_id !== req.user.id) {
      return res.status(404).json({ message: 'Webhook not found' })
    }

    const { name, url, secret, events, is_active } = req.body
    const updateData = {}

    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ message: 'Name cannot be empty' })
      updateData.name = name.trim()
    }

    if (url !== undefined) {
      if (!isValidUrl(url)) return res.status(400).json({ message: 'Invalid URL' })
      updateData.url = url.trim()
    }

    if (secret !== undefined) {
      updateData.secret = secret || null
    }

    if (events !== undefined) {
      const invalidEvents = events.filter(e => !VALID_EVENTS.includes(e))
      if (invalidEvents.length > 0) {
        return res.status(400).json({ message: `Invalid event types: ${invalidEvents.join(', ')}` })
      }
      updateData.events = events
    }

    if (is_active !== undefined) {
      updateData.is_active = Boolean(is_active)
    }

    const updated = await WebhookRepo.update(webhook.id, req.user.id, updateData)
    res.json({ webhook: { ...updated, secret: updated.secret ? '••••••••' : null } })
  } catch (err) {
    next(err)
  }
})

// ─── DELETE /api/webhooks/:id ────────────────────────────────────────────────
// Delete a webhook
router.delete('/webhooks/:id', authenticate, async (req, res, next) => {
  try {
    const webhook = await WebhookRepo.findById(req.params.id)
    if (!webhook || webhook.user_id !== req.user.id) {
      return res.status(404).json({ message: 'Webhook not found' })
    }

    await WebhookRepo.delete(webhook.id, req.user.id)
    res.status(204).send()
  } catch (err) {
    next(err)
  }
})

// ─── POST /api/webhooks/:id/test ─────────────────────────────────────────────
// Send a test webhook delivery
router.post('/webhooks/:id/test', authenticate, async (req, res, next) => {
  try {
    const webhook = await WebhookRepo.findById(req.params.id)
    if (!webhook || webhook.user_id !== req.user.id) {
      return res.status(404).json({ message: 'Webhook not found' })
    }

    const result = await sendTestWebhook(webhook)

    res.json({
      success: result.success,
      status_code: result.status_code,
      error_message: result.error_message,
    })
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/webhooks/:id/deliveries ────────────────────────────────────────
// Get delivery history for a webhook
router.get('/webhooks/:id/deliveries', authenticate, async (req, res, next) => {
  try {
    const webhook = await WebhookRepo.findById(req.params.id)
    if (!webhook || webhook.user_id !== req.user.id) {
      return res.status(404).json({ message: 'Webhook not found' })
    }

    const limit = parseInt(req.query.limit) || 20
    const offset = parseInt(req.query.offset) || 0

    const deliveries = await WebhookRepo.getDeliveries(webhook.id, { limit, offset })
    res.json({ deliveries })
  } catch (err) {
    next(err)
  }
})

module.exports = router
