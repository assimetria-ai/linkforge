const cors = require('cors')

const ALLOWED_ORIGINS = [
  process.env.APP_URL,
  process.env.RAILWAY_PUBLIC_DOMAIN && `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean)

function isOriginAllowed(origin) {
  // Requests without an Origin header are NOT cross-origin browser requests — they come
  // from curl, Postman, server-to-server calls, or same-origin navigation. The browser
  // always sends an Origin header on cross-origin requests, so absence of Origin means
  // CORS enforcement doesn't apply. Allow these in all environments.
  // Production healthchecks still use /healthz (registered before CORS middleware).
  if (!origin) return true

  // Exact match only — wildcard subdomain matching removed (SEC-1500: attacker-registered subdomain risk)
  if (ALLOWED_ORIGINS.includes(origin)) return true

  return false
}

const corsOptions = {
  origin(origin, callback) {
    if (isOriginAllowed(origin)) {
      callback(null, true)
    } else {
      // Use a proper CORS rejection (403) instead of Error (which Express turns into 500)
      const err = new Error(`CORS: origin '${origin}' not allowed`)
      err.status = 403
      callback(err)
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-CSRF-Token'],
  exposedHeaders: ['X-Total-Count', 'X-Request-Id'],
  maxAge: 600, // preflight cache 10 min
}

module.exports = cors(corsOptions)
