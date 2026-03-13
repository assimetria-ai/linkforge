// @custom — click analytics API with browser fingerprinting
const express = require('express')
const router = express.Router()
const { authenticate } = require('../../../lib/@system/Helpers/auth')
const ClickEventRepo = require('../../../db/repos/@custom/ClickEventRepo')
const LinksRepo = require('../../../db/repos/@custom/LinksRepo')
const { generateFingerprint } = require('../../../lib/@custom/fingerprint')

// ─── POST /api/fp — Client-side fingerprint beacon ──────────────────────────
// Receives canvas hash, screen resolution, timezone from client JS
// Updates the click event with enhanced fingerprint
router.post('/fp', async (req, res) => {
  try {
    const { id, sr, tz, cd, p, ch } = req.body

    if (!id) {
      return res.status(204).end()
    }

    // Regenerate fingerprint with full client-side signals
    const user_agent = req.headers['user-agent'] || ''
    const accept_language = req.headers['accept-language'] || ''

    const fingerprint_hash = generateFingerprint({
      user_agent,
      accept_language,
      screen_resolution: sr || '',
      timezone: tz || '',
      canvas_hash: ch || '',
      color_depth: cd || '',
      platform: p || '',
    })

    await ClickEventRepo.updateFingerprint(id, {
      fingerprint_hash,
      screen_resolution: sr || null,
      timezone: tz || null,
      platform: p || null,
      color_depth: cd ? parseInt(cd, 10) : null,
      canvas_hash: ch || null,
    })

    res.status(204).end()
  } catch (err) {
    // Silently fail — never block the user experience
    res.status(204).end()
  }
})

// ─── GET /api/analytics/links/:id — Link analytics summary ──────────────────
router.get('/analytics/links/:id', authenticate, async (req, res, next) => {
  try {
    const link = await LinksRepo.findById(req.params.id)
    if (!link || link.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Link not found' })
    }

    const days = parseInt(req.query.days) || 30

    const [totalClicks, uniqueVisitors, timeline, referrers, countries, platforms] = await Promise.all([
      ClickEventRepo.countByLinkId(link.id),
      ClickEventRepo.countUniqueByLinkId(link.id),
      ClickEventRepo.getClickTimeline(link.id, { days }),
      ClickEventRepo.getTopReferrers(link.id),
      ClickEventRepo.getCountryBreakdown(link.id),
      ClickEventRepo.getPlatformBreakdown(link.id),
    ])

    res.json({
      link_id: link.id,
      slug: link.slug,
      total_clicks: totalClicks,
      unique_visitors: uniqueVisitors,
      timeline,
      referrers,
      countries,
      platforms,
    })
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/analytics/links/:id/events — Raw click events ─────────────────
router.get('/analytics/links/:id/events', authenticate, async (req, res, next) => {
  try {
    const link = await LinksRepo.findById(req.params.id)
    if (!link || link.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Link not found' })
    }

    const limit = parseInt(req.query.limit) || 50
    const offset = parseInt(req.query.offset) || 0

    const [events, total] = await Promise.all([
      ClickEventRepo.findByLinkId(link.id, { limit, offset }),
      ClickEventRepo.countByLinkId(link.id),
    ])

    res.json({ events, total, limit, offset })
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/analytics/summary — User's overall analytics ──────────────────
router.get('/analytics/summary', authenticate, async (req, res, next) => {
  try {
    const summary = await ClickEventRepo.getSummaryByUserId(req.user.id)
    res.json({ links: summary })
  } catch (err) {
    next(err)
  }
})

module.exports = router
