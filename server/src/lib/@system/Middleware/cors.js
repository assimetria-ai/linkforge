// @system — CORS middleware configuration
// 
// Security: NEVER use wildcard '*' or endsWith subdomain matching.
// Both allow credential theft from any origin that can satisfy the check.
//
// Task #8278: Localhost origins only allowed in development, never production.

const cors = require('cors');

// Development-only localhost origins (task #8278)
// These are NEVER included in production builds for security.
// Can be customized via CORS_DEV_ORIGINS env var (comma-separated list)
const DEFAULT_LOCALHOST_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3005',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
];

/**
 * Get localhost origins for development.
 * Reads from CORS_DEV_ORIGINS environment variable (comma-separated).
 * Falls back to default localhost origins if not set.
 * 
 * @returns {string[]} Array of localhost origin URLs
 */
function getLocalhostOrigins() {
  const envOrigins = process.env.CORS_DEV_ORIGINS;
  if (envOrigins) {
    return envOrigins.split(',').map(o => o.trim()).filter(Boolean);
  }
  return DEFAULT_LOCALHOST_ORIGINS;
}

/**
 * Returns true if the given origin is a localhost/loopback origin.
 * @param {string} origin
 * @returns {boolean}
 */
function isLocalhostOrigin(origin) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

/**
 * Validate production origins.
 * Throws if CORS_ALLOWED_ORIGINS is empty in production, or if any localhost
 * origin appears in the production list.
 *
 * @param {Set<string>|string[]} origins - Production origins to validate
 * @param {boolean} isProd - Whether running in production
 */
function validateProductionOrigins(origins, isProd) {
  if (!isProd) return;

  const list = [...origins];

  if (list.length === 0) {
    throw new Error(
      '[SECURITY] CORS: CORS_ALLOWED_ORIGINS must be set in production. ' +
      'Set it to a comma-separated list of allowed origins (e.g. https://app.example.com).'
    );
  }

  for (const origin of list) {
    if (isLocalhostOrigin(origin)) {
      throw new Error(
        `[SECURITY] CORS: Localhost origin "${origin}" is not allowed in production. ` +
        'Remove it from CORS_ALLOWED_ORIGINS.'
      );
    }
  }
}

/**
 * Build CORS allowed origins based on environment.
 *
 * @param {Object} options
 * @param {boolean} options.isProd - Whether running in production
 * @param {string} options.appUrl - APP_URL from environment (frontend URL)
 * @param {Set<string>} options.productionOrigins - Approved production origins
 * @returns {string[]} Array of allowed origins
 */
function buildAllowedOrigins({ isProd = false, appUrl = '', productionOrigins = new Set() }) {
  // Validate production origins before building the list (task #8278)
  validateProductionOrigins(productionOrigins, isProd);

  const origins = [];

  // Localhost origins: development only (task #8278)
  if (!isProd) {
    origins.push(...getLocalhostOrigins());
  }

  // Production origins
  origins.push(...productionOrigins);

  // APP_URL: accept in development, or in production if explicitly approved
  if (appUrl) {
    if (!isProd) {
      // Development: accept any APP_URL (local/staging dev servers)
      if (!productionOrigins.has(appUrl)) {
        origins.push(appUrl);
      }
    } else if (productionOrigins.has(appUrl)) {
      // Production: only if pre-approved (already added above, skip duplicate)
    } else {
      // Reject — log loudly so operators notice the misconfiguration
      console.warn(
        `[WARN] [SECURITY] CORS: APP_URL "${appUrl}" is not in the approved ` +
        'production origins allowlist and will NOT be trusted. ' +
        'Approved: ' + [...productionOrigins].join(', ')
      );
    }
  }

  return origins;
}

// Default health-check paths exempt from CORS (no Origin header needed for probes).
// These paths bypass CORS entirely — they return no CORS headers and require no Origin.
// All other routes enforce strict origin validation.
const DEFAULT_HEALTH_CHECK_PATHS = ['/health', '/healthz', '/ping', '/ready', '/live', '/api/health'];

// Webhook paths exempt from CORS (server-to-server, no Origin header)
// Webhooks from payment providers, notification services, etc. don't send Origin headers
// and must be authenticated via their own signature verification mechanisms.
const DEFAULT_WEBHOOK_PATHS = ['/api/stripe/webhook'];

/**
 * Create CORS middleware with secure defaults.
 *
 * Health-check paths (e.g. /health, /ping) are exempt from CORS so that
 * monitoring probes that send no Origin header continue to work.
 * Webhook paths (e.g. /api/stripe/webhook) are also exempt because webhooks
 * are server-to-server requests that don't include Origin headers.
 * Every other path — including all /api/* routes — requires a valid Origin
 * and is subject to the allowedOrigins allowlist.
 *
 * @param {Object}   options
 * @param {string[]} options.allowedOrigins    - Approved origins
 * @param {boolean}  options.credentials       - Allow credentials (default: true)
 * @param {string[]} options.healthCheckPaths  - Paths exempt from CORS checks
 * @param {string[]} options.webhookPaths      - Webhook paths exempt from CORS
 * @returns {Function} Express middleware
 */
function createCorsMiddleware({
  allowedOrigins = [],
  credentials = true,
  healthCheckPaths = DEFAULT_HEALTH_CHECK_PATHS,
  webhookPaths = DEFAULT_WEBHOOK_PATHS,
} = {}) {
  const strictCors = cors({
    origin: (origin, callback) => {
      // SECURITY: Require an Origin header on all non-health-check routes.
      // No-origin requests (curl, server-to-server probes) are blocked here;
      // the outer middleware already short-circuits for health-check paths.
      if (!origin) {
        return callback(new Error('CORS: Origin header required'));
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      callback(new Error(`CORS: Origin ${origin} not allowed`));
    },
    credentials,
  });

  return (req, res, next) => {
    // Health-check paths: skip CORS entirely so monitoring probes without
    // an Origin header are not rejected.  These paths are read-only and
    // carry no sensitive state, so skipping CORS is safe.
    if (healthCheckPaths.includes(req.path)) {
      return next();
    }

    // Webhook paths: skip CORS because webhooks are server-to-server requests
    // that don't send Origin headers. Webhooks MUST implement their own
    // authentication (e.g., Stripe signature verification).
    if (webhookPaths.includes(req.path)) {
      return next();
    }

    // All other paths (including every /api/* route): enforce strict CORS.
    return strictCors(req, res, next);
  };
}

module.exports = {
  buildAllowedOrigins,
  createCorsMiddleware,
  getLocalhostOrigins,
  isLocalhostOrigin,
  validateProductionOrigins,
  DEFAULT_LOCALHOST_ORIGINS,   // Exported for testing/documentation
  DEFAULT_HEALTH_CHECK_PATHS,  // Exported for testing/documentation
  DEFAULT_WEBHOOK_PATHS,       // Exported for testing/documentation
};
