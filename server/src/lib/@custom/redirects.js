/**
 * Link shortening redirect middleware
 * Handles /:slug redirects for short links
 * Records click events with browser fingerprint for analytics
 * Checks expiration (date + click limit) and shows custom expired page
 */

const LinksRepo = require('../../db/repos/@custom/LinksRepo')
const ClickEventRepo = require('../../db/repos/@custom/ClickEventRepo')
const { generateFingerprint, extractServerSignals } = require('./fingerprint')
const logger = require('../@system/Logger')

/**
 * HTML template for the expired link page
 */
function expiredLinkPage(slug, reason) {
  const reasonText = reason === 'click_limit_reached'
    ? 'This link has reached its click limit and is no longer available.'
    : 'This link has expired and is no longer available.'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Link Expired</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #f8fafc;
      color: #1e293b;
    }
    .container {
      text-align: center;
      padding: 3rem 2rem;
      max-width: 480px;
    }
    .icon {
      font-size: 4rem;
      margin-bottom: 1.5rem;
      opacity: 0.7;
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 0.75rem;
    }
    p {
      color: #64748b;
      line-height: 1.6;
      margin-bottom: 2rem;
    }
    a {
      display: inline-block;
      padding: 0.75rem 1.5rem;
      background: #3A8BFD;
      color: white;
      text-decoration: none;
      border-radius: 0.5rem;
      font-weight: 500;
      transition: background 0.2s;
    }
    a:hover { background: #2563eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">&#x23F3;</div>
    <h1>Link Expired</h1>
    <p>${reasonText}</p>
    <a href="/">Go to Homepage</a>
  </div>
</body>
</html>`
}

/**
 * Redirect middleware for short links
 * This should be registered BEFORE the SPA fallback route
 */
async function linkRedirect(req, res, next) {
  if (req.method !== 'GET') return next()
  if (req.path.startsWith('/api')) return next()
  if (/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i.test(req.path)) return next()

  const slug = req.path.slice(1)
  if (!slug) return next()
  if (slug.includes('/')) return next()

  try {
    const link = await LinksRepo.findBySlug(slug)

    if (!link) {
      return next()
    }

    // Check if link is expired (by date or click limit)
    const { expired, reason } = LinksRepo.isExpired(link)
    if (expired) {
      // Auto-disable the link if still marked active
      if (link.is_active) {
        LinksRepo.update(link.id, link.user_id, {
          is_active: false,
          expired_reason: reason,
        }).catch(err => {
          logger.error({ err, slug }, 'Failed to auto-disable expired link')
        })
      }
      // Show custom expired page
      return res.status(410).send(expiredLinkPage(slug, reason))
    }

    // Increment click count (atomic counter on links table)
    const clickResult = await LinksRepo.incrementClicks(slug)

    // Check if this click just hit the click limit
    if (clickResult && clickResult.click_limit && clickResult.clicks >= clickResult.click_limit) {
      // This was the last allowed click — still redirect, but mark as expired
      LinksRepo.update(link.id, link.user_id, {
        is_active: false,
        expired_reason: 'click_limit_reached',
      }).catch(err => {
        logger.error({ err, slug }, 'Failed to auto-disable click-limited link')
      })
    }

    // Record detailed click event with fingerprint (fire and forget)
    recordClickEvent(req, link).catch(err => {
      logger.error({ err, slug }, 'Failed to record click event')
    })

    // Redirect to target URL
    res.redirect(301, link.target_url)
  } catch (err) {
    logger.error({ err, slug }, 'Error in link redirect')
    next()
  }
}

/**
 * Record a click event with server-side fingerprint signals
 */
async function recordClickEvent(req, link) {
  const signals = extractServerSignals(req)
  const fingerprint_hash = generateFingerprint({
    user_agent: signals.user_agent,
    accept_language: signals.accept_language,
  })

  await ClickEventRepo.create({
    link_id: link.id,
    slug: link.slug,
    fingerprint_hash,
    user_agent: signals.user_agent,
    accept_language: signals.accept_language,
    screen_resolution: null,
    timezone: null,
    platform: signals.platform,
    color_depth: null,
    canvas_hash: null,
    ip_address: signals.ip_address,
    referer: signals.referer,
    country: null,
    city: null,
  })
}

module.exports = { linkRedirect }
