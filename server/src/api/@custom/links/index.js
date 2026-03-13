// @custom — links API for URL shortening
const express = require('express')
const router = express.Router()
const { authenticate } = require('../../../lib/@system/Helpers/auth')
const LinksRepo = require('../../../db/repos/@custom/LinksRepo')

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Generate a random slug (fallback if user doesn't provide one)
 */
function generateRandomSlug(length = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Validate slug format (alphanumeric + hyphens + underscores only)
 */
function isValidSlug(slug) {
  return /^[a-zA-Z0-9_-]+$/.test(slug)
}

/**
 * Validate URL format
 */
function isValidUrl(url) {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// ─── GET /api/links ──────────────────────────────────────────────────────────
// List user's links
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

// ─── GET /api/links/:id ──────────────────────────────────────────────────────
// Get single link by ID
router.get('/links/:id', authenticate, async (req, res, next) => {
  try {
    const link = await LinksRepo.findById(req.params.id)
    if (!link) {
      return res.status(404).json({ message: 'Link not found' })
    }
    if (link.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' })
    }
    res.json({ link })
  } catch (err) {
    next(err)
  }
})

// ─── POST /api/links ─────────────────────────────────────────────────────────
// Create a new short link (with optional UTM parameters)
router.post('/links', authenticate, async (req, res, next) => {
  try {
    const { slug, target_url, description, utm_source, utm_medium, utm_campaign, utm_term, utm_content } = req.body

    // Validate target URL
    if (!target_url || !isValidUrl(target_url)) {
      return res.status(400).json({ message: 'Invalid target URL' })
    }

    // Generate or validate slug
    let finalSlug = slug
    if (finalSlug) {
      if (!isValidSlug(finalSlug)) {
        return res.status(400).json({ 
          message: 'Invalid slug format. Use only alphanumeric characters, hyphens, and underscores.' 
        })
      }
      // Check for collision
      const exists = await LinksRepo.slugExists(finalSlug)
      if (exists) {
        return res.status(409).json({ message: 'Slug already exists. Please choose a different one.' })
      }
    } else {
      // Generate random slug and check for collisions
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
    })

    res.status(201).json({ link })
  } catch (err) {
    next(err)
  }
})

// ─── PATCH /api/links/:id ────────────────────────────────────────────────────
// Update link
router.patch('/links/:id', authenticate, async (req, res, next) => {
  try {
    const link = await LinksRepo.findById(req.params.id)
    if (!link) {
      return res.status(404).json({ message: 'Link not found' })
    }
    if (link.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const { target_url, description, is_active } = req.body

    // Validate target URL if provided
    if (target_url !== undefined && !isValidUrl(target_url)) {
      return res.status(400).json({ message: 'Invalid target URL' })
    }

    const updated = await LinksRepo.update(link.id, req.user.id, {
      target_url,
      description,
      is_active,
    })

    res.json({ link: updated })
  } catch (err) {
    next(err)
  }
})

// ─── DELETE /api/links/:id ───────────────────────────────────────────────────
// Delete link (soft delete)
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

// ─── GET /api/links/stats/top ────────────────────────────────────────────────
// Get top links by clicks (analytics)
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
// Get UTM campaign analytics breakdown
router.get('/links/stats/utm', authenticate, async (req, res, next) => {
  try {
    const stats = await LinksRepo.getUtmStats(req.user.id)
    res.json({ stats })
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/links/campaign/:campaign ───────────────────────────────────────
// Get links filtered by UTM campaign
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

module.exports = router
