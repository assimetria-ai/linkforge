const path = require('path')
const fs = require('fs')
const express = require('express')
const compression = require('compression')
const cookieParser = require('cookie-parser')
const pinoHttp = require('pino-http')

const logger = require('./lib/@system/Logger')
const { cors, securityHeaders, csrfProtection, attachDatabase } = require('./lib/@system/Middleware')
const { apiLimiter } = require('./lib/@system/RateLimit')
const systemRoutes = require('./routes/@system')
const customRoutes = require('./routes/@custom')

const app = express()

// Trust the first reverse proxy (Railway) so req.ip, req.protocol, and
// X-Forwarded-For headers resolve to the real client values.  Without this,
// rate limiting, account lockout, and click-tracking all see the proxy IP.
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1)
}

// Health check endpoints registered before all middleware (including CORS) so that
// infrastructure health probes with no Origin header reach them without triggering
// CORS rejection. These are the only paths permitted to bypass CORS in production.
//
// Three health endpoints are provided for compatibility:
// - /health: Standard REST convention
// - /api/health: API-namespaced health endpoint
// - /healthz: Kubernetes/GKE convention
app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }))
app.get('/api/health', (_req, res) => res.status(200).json({ status: 'ok' }))
app.get('/healthz', (_req, res) => res.status(200).json({ status: 'ok' }))

app.use(securityHeaders)
app.use(cors)
app.use(compression())
app.use(express.json({ limit: '10mb' }))
app.use(cookieParser())

if (process.env.NODE_ENV !== 'test') {
  app.use(pinoHttp({ logger }))
}

// General rate limiting for all API routes (baseline DoS protection)
app.use('/api', apiLimiter)

// CSRF protection for state-changing requests
// Automatically validates CSRF tokens on POST/PUT/PATCH/DELETE requests
// Clients must first GET /api/csrf-token and include the token in X-CSRF-Token header
app.use('/api', csrfProtection)

// Attach database repositories to req.db
app.use('/api', attachDatabase)

// Routes
app.use('/api', systemRoutes)
app.use('/api', customRoutes)

// Serve static assets in production (before link redirects so /static/* is served directly)
// Always register the middleware when NODE_ENV=production — express.static gracefully
// handles missing directories by passing through to next middleware. The previous
// fs.existsSync guard at module-load time was fragile (race with Docker COPY, etc.).
const publicDir = process.env.STATIC_DIR || path.join(__dirname, '..', 'public')
if (process.env.NODE_ENV === 'production') {
  // Log static asset directory status at startup for debugging deploy issues
  const indexExists = fs.existsSync(path.join(publicDir, 'index.html'))
  const staticJsDir = path.join(publicDir, 'static', 'js')
  const staticJsExists = fs.existsSync(staticJsDir)
  logger.info({ publicDir, indexExists, staticJsExists }, 'static asset directory status')

  // Resolve unhashed static asset requests to their content-hashed equivalents.
  // Webpack produces files like main.a1b2c3d4.js but health checks and external
  // monitors may request /static/js/main.js.  This middleware finds the real file
  // by glob-matching and serves it, so those requests return 200 instead of 404.
  app.use('/static/js', (req, res, next) => {
    // Only intercept requests for unhashed .js files (no dot-separated hash segment)
    const basename = path.basename(req.path, '.js')
    if (!basename || basename.includes('.')) return next()

    const jsDir = path.join(publicDir, 'static', 'js')
    try {
      const files = fs.readdirSync(jsDir)
      // Match <name>.<hash>.js (8-char hex hash from webpack contenthash:8)
      const pattern = new RegExp(`^${basename}\\.[a-f0-9]{8}\\.js$`)
      const match = files.find(f => pattern.test(f))
      if (match) {
        return res.sendFile(path.join(jsDir, match))
      }
    } catch (_) {
      // Directory doesn't exist or unreadable — fall through to static/404
    }
    next()
  })

  app.use(express.static(publicDir, { maxAge: '1y', immutable: true }))
}

// Link shortening redirects (must be before SPA fallback)
const { linkRedirect } = require('./lib/@custom/redirects')
app.use(linkRedirect)

// SPA fallback — serve index.html for all non-API, non-static GET requests
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    const indexPath = path.join(publicDir, 'index.html')
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath)
    } else {
      res.status(404).json({ error: 'Not found' })
    }
  })
} else {
  // 404 (dev/test — client runs separately)
  app.use((req, res) => {
    res.status(404).json({ message: 'Not found' })
  })
}

// Error handler
app.use((err, req, res, _next) => {
  logger.error({ err, req: { method: req.method, url: req.url } }, err.message ?? 'Internal server error')

  // Stripe SDK errors have a `type` field (e.g. StripeCardError, StripeInvalidRequestError).
  // Never expose raw Stripe messages to clients — they contain internal details such as
  // price/customer IDs, live-vs-test mode hints, and API key hints.
  if (err.type && err.type.startsWith('Stripe')) {
    const status = err.statusCode ?? 400

    // Card errors carry a user-safe decline message (e.g. "Your card has insufficient funds.")
    if (err.type === 'StripeCardError') {
      return res.status(status).json({ message: err.message ?? 'Your card was declined. Please check your payment details.' })
    }

    // Authentication errors mean a misconfigured API key — generic message for users
    if (err.type === 'StripeAuthenticationError') {
      return res.status(500).json({ message: 'Payment service is temporarily unavailable. Please try again later.' })
    }

    // Rate limit — tell the user to slow down
    if (err.type === 'StripeRateLimitError') {
      return res.status(429).json({ message: 'Too many requests. Please wait a moment and try again.' })
    }

    // All other Stripe errors (StripeInvalidRequestError, StripeAPIError, StripeConnectionError, etc.)
    return res.status(status >= 400 && status < 600 ? status : 400).json({
      message: 'Something went wrong with the payment service. Please try again or contact support.',
    })
  }

  const status = err.status ?? err.statusCode ?? 500
  res.status(status).json({ message: err.message ?? 'Internal server error' })
})

module.exports = app
