// @system — startup validation checks (#11720)
// Runs once at server boot to detect common misconfigurations early.
// Logs warnings instead of crashing so the app can still serve API requests.

const fs = require('fs')
const path = require('path')
const logger = require('../Logger')

/**
 * Validate static assets directory if STATIC_DIR is configured.
 * When the server is set up to serve a client build (e.g. in production
 * single-container deploys), this ensures the directory exists and contains
 * an index.html before the server starts accepting requests.
 */
function validateStaticAssets() {
  const staticDir = process.env.STATIC_DIR
  if (!staticDir) return // Not configured — client is served separately (e.g. Vite dev server)

  const resolved = path.resolve(staticDir)

  if (!fs.existsSync(resolved)) {
    logger.warn(
      { staticDir: resolved },
      'STATIC_DIR is set but directory does not exist — static assets will 404. ' +
      'Run the client build before starting the server, or unset STATIC_DIR.'
    )
    return
  }

  const indexPath = path.join(resolved, 'index.html')
  if (!fs.existsSync(indexPath)) {
    logger.warn(
      { staticDir: resolved },
      'STATIC_DIR exists but index.html is missing — SPA routing will fail. ' +
      'Ensure the client build completed successfully.'
    )
    return
  }

  // Check for common build artifacts
  const files = fs.readdirSync(resolved)
  const hasAssets = files.some(f => f === 'assets' || f === 'static' || f.endsWith('.js') || f.endsWith('.css'))
  if (!hasAssets) {
    logger.warn(
      { staticDir: resolved, files: files.slice(0, 10) },
      'STATIC_DIR has index.html but no JS/CSS assets — client build may be incomplete'
    )
    return
  }

  logger.info({ staticDir: resolved, fileCount: files.length }, 'Static assets directory validated')
}

/**
 * Validate infrastructure dependencies and log their status.
 * Called once at startup to give operators a clear picture of what's available.
 */
function validateInfrastructure() {
  const status = {
    database: !!process.env.DATABASE_URL,
    redis: (process.env.REDIS_ENABLED ?? 'true').toLowerCase() !== 'false',
    email: !!(process.env.SMTP_HOST || process.env.SES_FROM_EMAIL || process.env.EMAIL_PROVIDER),
    stripe: !!process.env.STRIPE_SECRET_KEY,
    s3: !!process.env.S3_BUCKET,
    oauth: !!(process.env.GOOGLE_CLIENT_ID || process.env.GITHUB_CLIENT_ID),
    staticAssets: !!process.env.STATIC_DIR,
  }

  const optional = []
  if (!status.redis) optional.push('Redis (rate limiting uses in-memory fallback)')
  if (!status.email) optional.push('Email (transactional emails disabled)')
  if (!status.stripe) optional.push('Stripe (payments disabled)')
  if (!status.s3) optional.push('S3 (file uploads use local storage)')
  if (!status.oauth) optional.push('OAuth (social login disabled)')

  if (optional.length > 0) {
    logger.info(
      { disabledServices: optional },
      `Startup: ${optional.length} optional service(s) not configured — running with reduced functionality`
    )
  }

  logger.info({ infrastructure: status }, 'Infrastructure status')
}

/**
 * Run all startup validations. Call once from index.js after env is loaded.
 */
function runStartupValidation() {
  validateStaticAssets()
  validateInfrastructure()
}

module.exports = { runStartupValidation, validateStaticAssets, validateInfrastructure }
