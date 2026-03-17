const path = require('path')
const fs = require('fs')
const express = require('express')
const compression = require('compression')
const cookieParser = require('cookie-parser')
const pinoHttp = require('pino-http')

const logger = require('./lib/@system/Logger')
const { cors, securityHeaders, csrfProtection, generateCsrfToken } = require('./lib/@system/Middleware')
const { apiLimiter } = require('./lib/@system/RateLimit')
const systemRoutes = require('./routes/@system')
let customRoutes; try { customRoutes = require('./routes/@custom') } catch(e) { console.warn('[app] @custom routes failed:', e.message); const express = require('express'); customRoutes = express.Router() }

const app = express()

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

// CSRF token endpoint — clients must call this before making state-changing requests
app.get('/api/csrf-token', (req, res) => {
  const csrfToken = generateCsrfToken(req, res)
  res.json({ csrfToken })
})

// CSRF protection for all state-changing requests (POST, PUT, PATCH, DELETE)
app.use(csrfProtection)

// General rate limiting for all API routes (baseline DoS protection)
app.use('/api', apiLimiter)

// Routes
app.use('/api', systemRoutes)
app.use('/api', customRoutes)

// Serve React SPA in production
const publicDir = path.join(__dirname, '..', 'public')
if (process.env.NODE_ENV === 'production' && fs.existsSync(publicDir)) {
  app.use(express.static(publicDir))
  app.get('*', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'))
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
