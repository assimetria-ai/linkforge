// @custom — links API for URL shortening with expiration support
const express = require('express')
const router = express.Router()
const { authenticate } = require('../../../lib/@system/Helpers/auth')
const LinksRepo = require('../../../db/repos/@custom/LinksRepo')

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateRandomSlug(length = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function isValidSlug(slug) {
  return /^[a-zA-Z0-9_-]+$/.test(slug)
}

function isValidUrl(url) {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

function parseExpirationFields(body) {
  const result = {}
  if (body.expires_at !== undefined) {
    if (body.expires_at === null || body.expires_at === '') {
      result.expires_at = null
    } else {
      const d = new Date(body.expires_at)
      if (isNaN(d.getTime())) {
        return { error: 'Invalid expires_at date format' }
      }
      result.expires_at = d.toISOString()
    }
  }
  if (body.click_limit !== undefined) {
    if (body.click_limit === null || body.click_limit === '') {
      result.click_limit = null
    } else {
      const limit = parseInt(body.click_limit, 10)
      if (isNaN(limit) || limit < 1) {
        return { error: 'click_limit must be a positive integer' }
      }
      result.click_limit = limit
    }
  }
  if (body.expiration_alert_days !== undefined) {
    if (body.expiration_alert_days === null || body.expiration_alert_days === '') {
      result.expiration_alert_days = null
    } else {
      const days = parseInt(body.expiration_alert_days, 10)
      if (isNaN(days) || days < 1) {
        return { error: 'expiration_alert_days must be a positive integer' }
      }
      result.expiration_alert_days = days
    }
  }
  return result
}

// ─── GET /api/links ──────────────────────────────────────────────────────────
router.get('/links', authenticate, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 50
    const offset = parseInt(req.query.offset) || 0

    const links = await LinksRepo.findByUserId(req.user.id, { limit, offset })
    const total = await LinksRepo.countByUserId(req.user.id)

    res.json({ links, total, limit, offset })
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/links/expired ──────────────────────────────────────────────────
// Get expired links for the user
router.get('/links/expired', authenticate, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 50
    const offset = parseInt(req.query.offset) || 0
    const links = await LinksRepo.findExpiredByUserId(req.user.id, { limit, offset })
    res.json({ links })
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/links/expiring ─────────────────────────────────────────────────
// Get links expiring soon (for dashboard alerts)
router.get('/links/expiring', authenticate, async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 3
    const links = await LinksRepo.findExpiringLinks(req.user.id, days)
    res.json({ links })
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/links/stats/top ────────────────────────────────────────────────
router.get('/links/stats/top', authenticate, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10
    const topLinks = await LinksRepo.getTopLinks({ limit })
    res.json({ links: topLinks })
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/links/stats/utm ────────────────────────────────────────────────
router.get('/links/stats/utm', authenticate, async (req, res, next) => {
  try {
    const stats = await LinksRepo.getUtmStats(req.user.id)
    res.json({ stats })
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/links/campaign/:campaign ───────────────────────────────────────
router.get('/links/campaign/:campaign', authenticate, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 50
    const offset = parseInt(req.query.offset) || 0
    const links = await LinksRepo.findByCampaign(req.user.id, req.params.campaign, { limit, offset })
    res.json({ links })
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/links/:id ──────────────────────────────────────────────────────
router.get('/links/:id', authenticate, async (req, res, next) => {
  try {
    const link = await LinksRepo.findById(req.params.id)
    if (!link) {
      return res.status(404).json({ message: 'Link not found' })
    }
    if (link.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' })
    }
    // Attach computed expiration status
    const expStatus = LinksRepo.isExpired(link)
    res.json({ link: { ...link, expiration_status: expStatus } })
  } catch (err) {
    next(err)
  }
})

// ─── POST /api/links ─────────────────────────────────────────────────────────
router.post('/links', authenticate, async (req, res, next) => {
  try {
    const { slug, target_url, description, utm_source, utm_medium, utm_campaign, utm_term, utm_content, domain_id } = req.body

    if (!target_url || !isValidUrl(target_url)) {
      return res.status(400).json({ message: 'Invalid target URL' })
    }

    // Parse expiration fields
    const expFields = parseExpirationFields(req.body)
    if (expFields.error) {
      return res.status(400).json({ message: expFields.error })
    }

    // Generate or validate slug
    let finalSlug = slug
    if (finalSlug) {
      if (!isValidSlug(finalSlug)) {
        return res.status(400).json({ 
          message: 'Invalid slug format. Use only alphanumeric characters, hyphens, and underscores.' 
        })
      }
      const exists = await LinksRepo.slugExists(finalSlug)
      if (exists) {
        return res.status(409).json({ message: 'Slug already exists. Please choose a different one.' })
      }
    } else {
      let attempts = 0
      do {
        finalSlug = generateRandomSlug(6)
        attempts++
        if (attempts > 10) {
          return res.status(500).json({ message: 'Failed to generate unique slug. Please try again.' })
        }
      } while (await LinksRepo.slugExists(finalSlug))
    }

    const link = await LinksRepo.create({
      slug: finalSlug,
      target_url,
      user_id: req.user.id,
      description: description || null,
      utm_source: utm_source?.trim() || null,
      utm_medium: utm_medium?.trim() || null,
      utm_campaign: utm_campaign?.trim() || null,
      utm_term: utm_term?.trim() || null,
      utm_content: utm_content?.trim() || null,
      expires_at: expFields.expires_at || null,
      click_limit: expFields.click_limit || null,
      expiration_alert_days: expFields.expiration_alert_days || null,
      domain_id: domain_id ? parseInt(domain_id, 10) : null,
    })

    res.status(201).json({ link })
  } catch (err) {
    next(err)
  }
})

// ─── PATCH /api/links/:id ────────────────────────────────────────────────────
router.patch('/links/:id', authenticate, async (req, res, next) => {
  try {
    const link = await LinksRepo.findById(req.params.id)
    if (!link) {
      return res.status(404).json({ message: 'Link not found' })
    }
    if (link.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const { target_url, description, is_active, utm_source, utm_medium, utm_campaign, utm_term, utm_content, domain_id } = req.body

    if (target_url !== undefined && !isValidUrl(target_url)) {
      return res.status(400).json({ message: 'Invalid target URL' })
    }

    // Parse expiration fields
    const expFields = parseExpirationFields(req.body)
    if (expFields.error) {
      return res.status(400).json({ message: expFields.error })
    }

    // If re-activating a link, clear expired_reason
    const updateFields = {
      target_url,
      description,
      is_active,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      domain_id: domain_id !== undefined ? (domain_id ? parseInt(domain_id, 10) : null) : undefined,
      ...expFields,
    }

    // If explicitly re-activating, clear expired state
    if (is_active === true && link.expired_reason) {
      updateFields.expired_reason = null
      updateFields.expiration_alert_sent = false
    }

    const updated = await LinksRepo.update(link.id, req.user.id, updateFields)
    res.json({ link: updated })
  } catch (err) {
    next(err)
  }
})

// ─── POST /api/links/bulk/expiration ─────────────────────────────────────────
// Bulk update expiration settings for multiple links
router.post('/links/bulk/expiration', authenticate, async (req, res, next) => {
  try {
    const { link_ids, expires_at, click_limit } = req.body

    if (!Array.isArray(link_ids) || link_ids.length === 0) {
      return res.status(400).json({ message: 'link_ids must be a non-empty array' })
    }
    if (link_ids.length > 100) {
      return res.status(400).json({ message: 'Maximum 100 links per bulk operation' })
    }

    const expFields = parseExpirationFields({ expires_at, click_limit })
    if (expFields.error) {
      return res.status(400).json({ message: expFields.error })
    }

    const updated = await LinksRepo.bulkUpdateExpiration(req.user.id, link_ids, expFields)
    res.json({ updated, count: updated.length })
  } catch (err) {
    next(err)
  }
})

// ─── DELETE /api/links/:id ───────────────────────────────────────────────────
router.delete('/links/:id', authenticate, async (req, res, next) => {
  try {
    const link = await LinksRepo.findById(req.params.id)
    if (!link) {
      return res.status(404).json({ message: 'Link not found' })
    }
    if (link.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' })
    }

    await LinksRepo.delete(link.id, req.user.id)
    res.status(204).send()
  } catch (err) {
    next(err)
  }
})

module.exports = router
