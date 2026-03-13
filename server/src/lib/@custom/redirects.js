/**
 * Link shortening redirect middleware
 * Handles /:slug redirects for short links
 * Records click events with browser fingerprint for analytics
 * Checks expiration (date + click limit) and shows custom expired page
 */

const LinksRepo = require('../../db/repos/@custom/LinksRepo')
const ClickEventRepo = require('../../db/repos/@custom/ClickEventRepo')
const CustomDomainRepo = require('../../db/repos/@custom/CustomDomainRepo')
const { generateFingerprint, extractServerSignals } = require('./fingerprint')
const logger = require('../@system/Logger')

/**
 * HTML template for the expired link page (supports white-label branding)
 */
function expiredLinkPage(slug, reason, branding = {}) {
  const reasonText = reason === 'click_limit_reached'
    ? 'This link has reached its click limit and is no longer available.'
    : 'This link has expired and is no longer available.'

  const bgColor = branding.background_color || '#f8fafc'
  const primaryColor = branding.primary_color || '#3A8BFD'
  const companyName = branding.company_name || 'Linkforge'
  const faviconUrl = branding.favicon_url || ''
  const logoUrl = branding.logo_url || ''
  const poweredByHidden = branding.powered_by_hidden || false
  const customCss = branding.custom_css || ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Link Expired — ${companyName}</title>
  ${faviconUrl ? `<link rel="icon" href="${faviconUrl}">` : ''}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: ${bgColor};
      color: #1e293b;
    }
    .container {
      text-align: center;
      padding: 3rem 2rem;
      max-width: 480px;
    }
    .logo { max-height: 40px; margin-bottom: 1.5rem; }
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
    a.btn {
      display: inline-block;
      padding: 0.75rem 1.5rem;
      background: ${primaryColor};
      color: white;
      text-decoration: none;
      border-radius: 0.5rem;
      font-weight: 500;
      transition: opacity 0.2s;
    }
    a.btn:hover { opacity: 0.85; }
    .powered-by {
      margin-top: 2rem;
      font-size: 0.75rem;
      color: #94a3b8;
    }
    ${customCss}
  </style>
</head>
<body>
  <div class="container">
    ${logoUrl ? `<img src="${logoUrl}" alt="${companyName}" class="logo">` : ''}
    <div class="icon">&#x23F3;</div>
    <h1>Link Expired</h1>
    <p>${reasonText}</p>
    <a class="btn" href="/">Go to Homepage</a>
    ${!poweredByHidden ? '<p class="powered-by">Powered by Linkforge</p>' : ''}
  </div>
</body>
</html>`
}

/**
 * Resolve custom domain from request hostname.
 * Returns { domain, branding } or null if not a custom domain.
 */
async function resolveCustomDomain(hostname) {
  if (!hostname) return null
  // Strip port if present
  const host = hostname.split(':')[0].toLowerCase()
  try {
    const domain = await CustomDomainRepo.findByDomain(host)
    if (domain) {
      return {
        domain,
        branding: typeof domain.branding === 'string' ? JSON.parse(domain.branding) : (domain.branding || {}),
      }
    }
  } catch (err) {
    logger.error({ err, hostname: host }, 'Error resolving custom domain')
  }
  return null
}

/**
 * Redirect middleware for short links
 * This should be registered BEFORE the SPA fallback route.
 * Supports custom domain resolution: links accessed via a verified custom domain
 * will use domain-scoped lookup and white-label branding.
 */
async function linkRedirect(req, res, next) {
  if (req.method !== 'GET') return next()
  if (req.path.startsWith('/api')) return next()
  if (/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i.test(req.path)) return next()

  const slug = req.path.slice(1)
  if (!slug) return next()
  if (slug.includes('/')) return next()

  try {
    // Resolve custom domain from request hostname
    const customDomain = await resolveCustomDomain(req.hostname)
    const branding = customDomain?.branding || {}

    // Look up link — prefer domain-scoped, fall back to global
    let link = null
    if (customDomain) {
      link = await LinksRepo.findBySlugAndDomain(slug, customDomain.domain.id)
      // Fall back to any link with this slug if no domain-scoped match
      if (!link) {
        link = await LinksRepo.findBySlug(slug)
      }
    } else {
      link = await LinksRepo.findBySlug(slug)
    }

    if (!link) {
      return next()
    }

    // If link has a domain_id, resolve its branding for expired pages
    let linkBranding = branding
    if (!customDomain && link.domain_id) {
      try {
        const linkedDomain = await CustomDomainRepo.findById(link.domain_id)
        if (linkedDomain?.branding) {
          linkBranding = typeof linkedDomain.branding === 'string'
            ? JSON.parse(linkedDomain.branding)
            : linkedDomain.branding
        }
      } catch (err) {
        // Best-effort branding resolution
      }
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
      // Show branded expired page
      return res.status(410).send(expiredLinkPage(slug, reason, linkBranding))
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
