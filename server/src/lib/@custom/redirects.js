/**
 * Link shortening redirect middleware
 * Handles /:slug redirects for short links
 * Records click events with browser fingerprint for analytics
 */

const LinksRepo = require('../../db/repos/@custom/LinksRepo')
const ClickEventRepo = require('../../db/repos/@custom/ClickEventRepo')
const { generateFingerprint, extractServerSignals } = require('./fingerprint')
const { fireWebhooks } = require('./webhook-service')
const logger = require('../@system/Logger')

/**
 * Redirect middleware for short links
 * This should be registered BEFORE the SPA fallback route
 */
async function linkRedirect(req, res, next) {
  // Only handle GET requests to root-level paths (/:slug)
  if (req.method !== 'GET') {
    return next()
  }

  // Skip if it's an API route
  if (req.path.startsWith('/api')) {
    return next()
  }

  // Skip common static file extensions
  if (/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i.test(req.path)) {
    return next()
  }

  // Extract slug from path (remove leading slash)
  const slug = req.path.slice(1)

  // Skip if empty (homepage)
  if (!slug) {
    return next()
  }

  // Skip if path contains slashes (nested routes - let SPA handle them)
  if (slug.includes('/')) {
    return next()
  }

  try {
    // Look up the link
    const link = await LinksRepo.findBySlug(slug)

    if (!link) {
      // Not a short link, let the SPA handle it
      return next()
    }

    // Increment click count (atomic counter on links table)
    LinksRepo.incrementClicks(slug).catch(err => {
      logger.error({ err, slug }, 'Failed to increment link clicks')
    })

    // Record detailed click event with fingerprint (fire and forget)
    recordClickEvent(req, link).catch(err => {
      logger.error({ err, slug }, 'Failed to record click event')
    })

    // Redirect to target URL
    res.redirect(301, link.target_url)
  } catch (err) {
    logger.error({ err, slug }, 'Error in link redirect')
    // On error, let the SPA handle it
    next()
  }
}

/**
 * Record a click event with server-side fingerprint signals
 */
async function recordClickEvent(req, link) {
  const signals = extractServerSignals(req)

  // Generate server-side fingerprint from available headers
  const fingerprint_hash = generateFingerprint({
    user_agent: signals.user_agent,
    accept_language: signals.accept_language,
  })

  const clickEvent = await ClickEventRepo.create({
    link_id: link.id,
    slug: link.slug,
    fingerprint_hash,
    user_agent: signals.user_agent,
    accept_language: signals.accept_language,
    screen_resolution: null, // populated by client-side beacon
    timezone: null,          // populated by client-side beacon
    platform: signals.platform,
    color_depth: null,       // populated by client-side beacon
    canvas_hash: null,       // populated by client-side beacon
    ip_address: signals.ip_address,
    referer: signals.referer,
    country: null,  // can be populated by GeoIP lookup
    city: null,     // can be populated by GeoIP lookup
  })

  // Fire webhooks for link.click event (async, non-blocking)
  fireWebhooks(link.user_id, 'link.click', {
    click_id: clickEvent.id,
    link_id: link.id,
    slug: link.slug,
    target_url: link.target_url,
    clicked_at: clickEvent.clicked_at,
    referrer: signals.referer || null,
    user_agent: signals.user_agent,
    ip_address: signals.ip_address,
    platform: signals.platform || null,
    country: null,
    city: null,
  }).catch(err => {
    logger.error({ err, link_id: link.id }, 'Failed to fire webhooks for click event')
  })
}

module.exports = { linkRedirect }
