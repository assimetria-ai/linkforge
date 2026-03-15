// @system/Middleware/api-error-handler — Centralised Express error handler
//
// Mount AFTER all routes in app.js:
//
//   const { apiErrorHandler } = require('./lib/@system/Middleware/api-error-handler')
//   app.use(apiErrorHandler)
//
// Routes can throw the named error classes to produce predictable HTTP status
// codes without duplicating res.status()/res.json() boilerplate:
//
//   const { NotFoundError, ValidationError } = require('./lib/@system/Middleware/api-error-handler')
//   throw new NotFoundError('Item not found')
//
// All error responses share the shape:
//   { error: string, [details]: any, [stack]: string }   ← stack in dev only

'use strict'

const logger = require('../Logger')

// ── Named error classes ───────────────────────────────────────────────────────

class HttpError extends Error {
  constructor(message, status, details) {
    super(message)
    this.name    = this.constructor.name
    this.status  = status
    if (details !== undefined) this.details = details
  }
}

class ValidationError    extends HttpError { constructor(msg, details) { super(msg, 400, details) } }
class AuthenticationError extends HttpError { constructor(msg)         { super(msg, 401) } }
class ForbiddenError     extends HttpError { constructor(msg)          { super(msg, 403) } }
class NotFoundError      extends HttpError { constructor(msg)          { super(msg, 404) } }
class ConflictError      extends HttpError { constructor(msg)          { super(msg, 409) } }

// ── Status code lookup by error name ─────────────────────────────────────────
// Handles errors thrown with the right .name but not extending HttpError
// (e.g. errors from third-party libraries that set .name conventionally).

const ERROR_STATUS_BY_NAME = {
  ValidationError:     400,
  AuthenticationError: 401,
  ForbiddenError:      403,
  NotFoundError:       404,
  ConflictError:       409,
}

// ── Middleware ────────────────────────────────────────────────────────────────

/**
 * Express error-handling middleware (4-argument signature).
 * Must be mounted last, after all routes and other middleware.
 *
 * @param {Error}    err
 * @param {object}   req
 * @param {object}   res
 * @param {Function} next  — kept so Express recognises the 4-arg signature
 */
// eslint-disable-next-line no-unused-vars
function apiErrorHandler(err, req, res, next) {
  const status      = err.status || ERROR_STATUS_BY_NAME[err.name] || 500
  const isServerErr = status >= 500

  if (isServerErr) {
    logger.error(
      { err, method: req.method, url: req.url, status },
      'unhandled server error'
    )
  } else {
    logger.warn(
      { err: { name: err.name, message: err.message }, method: req.method, url: req.url, status },
      'request error'
    )
  }

  const body = { error: err.message || 'Internal server error' }

  if (err.details !== undefined) {
    body.details = err.details
  }

  // Include stack trace in development to aid debugging — never in production
  if (isServerErr && process.env.NODE_ENV !== 'production') {
    body.stack = err.stack
  }

  res.status(status).json(body)
}

module.exports = {
  apiErrorHandler,
  HttpError,
  ValidationError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
}
