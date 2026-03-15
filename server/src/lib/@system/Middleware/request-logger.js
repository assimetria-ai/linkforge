// @system — HTTP request logging middleware
// Logs method, path, status code, response time, and user-agent for every request.
// Mounts before routes; attach after CORS so req.ip reflects the real client address.
//
// Usage:
//   const requestLogger = require('./lib/@system/Middleware/request-logger')
//   app.use(requestLogger)

'use strict'

const logger = require('../Logger')

// Paths to skip — health probes and favicon produce constant noise with no signal.
const SKIP_PATHS = new Set(['/health', '/favicon.ico'])

/**
 * Express middleware that logs each HTTP request when the response finishes.
 * Chooses log level based on status code:
 *   error  — 5xx (server errors, need investigation)
 *   warn   — 4xx (client errors, may indicate attack surface or bad clients)
 *   info   — everything else
 */
function requestLogger(req, res, next) {
  if (SKIP_PATHS.has(req.path)) return next()

  const startNs = process.hrtime.bigint()

  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - startNs) / 1e6
    const status = res.statusCode

    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info'

    logger[level](
      {
        method: req.method,
        path: req.path,
        status,
        ms: Math.round(ms),
        ip: req.ip ?? undefined,
        ua: req.get('user-agent') ?? undefined,
        userId: req.user?.id ?? undefined,
      },
      'http'
    )
  })

  next()
}

module.exports = requestLogger
