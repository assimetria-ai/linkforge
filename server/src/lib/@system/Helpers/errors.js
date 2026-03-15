// @system — Typed HTTP error classes
//
// AppError is the base for all intentional HTTP errors.
// Throw these from route handlers — the global error handler in app.js
// converts them to the correct HTTP status codes automatically.
//
// Usage:
//   const { NotFoundError, BadRequestError, ForbiddenError } = require('../lib/@system/Helpers')
//
//   // Throw instead of manually calling res.status(404).json(...)
//   const item = await findById(db, 'items', req.params.id)
//   if (!item) throw new NotFoundError('Item not found')
//
//   // With validation errors array:
//   throw new BadRequestError('Invalid input', [{ field: 'email', message: 'Already in use' }])
//
// The global error handler in app.js reads err.status, err.code, and err.errors.

'use strict'

/**
 * Base class for all intentional HTTP errors.
 * Sets err.status so the Express error handler uses the right status code.
 */
class AppError extends Error {
  constructor(message, status = 500, code = null) {
    super(message)
    this.name   = 'AppError'
    this.status = status
    this.code   = code
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor)
  }
}

/** 400 Bad Request — invalid input, malformed request body, etc. */
class BadRequestError extends AppError {
  /**
   * @param {string}   message  — human-readable description
   * @param {object[]|null} errors — optional field-level error array,
   *   e.g. [{ field: 'email', message: 'Already in use' }]
   */
  constructor(message = 'Bad request', errors = null) {
    super(message, 400, 'BAD_REQUEST')
    this.name = 'BadRequestError'
    if (errors !== null) this.errors = errors
  }
}

/** 401 Unauthorized — missing or invalid authentication credentials. */
class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED')
    this.name = 'UnauthorizedError'
  }
}

/** 403 Forbidden — authenticated but not allowed to perform the action. */
class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN')
    this.name = 'ForbiddenError'
  }
}

/** 404 Not Found — resource does not exist or is not visible to the caller. */
class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(message, 404, 'NOT_FOUND')
    this.name = 'NotFoundError'
  }
}

/** 409 Conflict — duplicate resource, unique-constraint violation, etc. */
class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, 409, 'CONFLICT')
    this.name = 'ConflictError'
  }
}

/**
 * 422 Unprocessable Entity — request is well-formed but semantically invalid.
 * Use for business-rule violations that don't fit 400.
 *
 * @param {string}   message
 * @param {object[]|null} errors — optional field-level error array
 */
class UnprocessableError extends AppError {
  constructor(message = 'Unprocessable entity', errors = null) {
    super(message, 422, 'UNPROCESSABLE')
    this.name = 'UnprocessableError'
    if (errors !== null) this.errors = errors
  }
}

/** 429 Too Many Requests — rate limit exceeded (for manual use; prefer rate-limiter middleware). */
class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'TOO_MANY_REQUESTS')
    this.name = 'TooManyRequestsError'
  }
}

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  UnprocessableError,
  TooManyRequestsError,
}
