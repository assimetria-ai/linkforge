/**
 * Link shortening redirect middleware
 * Handles /:slug redirects for short links
 */

const LinksRepo = require('../../db/repos/@custom/LinksRepo')
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

    // Increment click count (fire and forget - don't block redirect)
    LinksRepo.incrementClicks(slug).catch(err => {
      logger.error({ err, slug }, 'Failed to increment link clicks')
    })

    // Redirect to target URL
    res.redirect(301, link.target_url)
  } catch (err) {
    logger.error({ err, slug }, 'Error in link redirect')
    // On error, let the SPA handle it
    next()
  }
}

module.exports = { linkRedirect }
