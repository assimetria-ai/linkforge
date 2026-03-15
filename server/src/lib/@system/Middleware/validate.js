// @system/Middleware/validate — Input sanitization and validation helpers
//
// sanitizeBody (global middleware)
//   Strips null bytes and ASCII control characters from all top-level string
//   fields in req.body.  Protects against null-byte injection attacks and
//   ensures downstream handlers always receive printable strings.
//   Mounted globally in app.js after body parsing.
//
// validateBody(rules) (per-route middleware factory)
//   Validates req.body against a rules map and returns 400 on failure.
//   Usage:
//     const { validateBody } = require('../@system/Middleware/validate')
//
//     router.post('/items', validateBody({
//       title:       { required: true, type: 'string', maxLength: 200 },
//       description: { type: 'string', maxLength: 2000 },
//       status:      { required: true, type: 'string', allowedValues: ['draft', 'active'] },
//       count:       { type: 'number', min: 0, max: 1000 },
//     }), handler)
//
// validateQuery(rules) — same as validateBody but validates req.query.

// ── sanitizeBody ──────────────────────────────────────────────────────────────

/** Remove null bytes and non-printable control chars from a string value. */
function sanitizeString(val) {
  // Strip null bytes (\x00) and ASCII control characters (\x01–\x1F, \x7F)
  // while preserving legitimate whitespace (\t \n \r).
  return val.replace(/[\x00\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
}

/**
 * Recursively sanitize all string values in an object or array.
 * Only processes plain objects and arrays — never mutates class instances.
 */
function sanitizeDeep(value) {
  if (typeof value === 'string') return sanitizeString(value)
  if (Array.isArray(value)) return value.map(sanitizeDeep)
  if (value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const out = {}
    for (const [k, v] of Object.entries(value)) {
      out[k] = sanitizeDeep(v)
    }
    return out
  }
  return value
}

/**
 * Global middleware — sanitizes req.body in-place.
 * Mount after express.json() / express.urlencoded() in app.js.
 */
function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeDeep(req.body)
  }
  next()
}

// ── validateBody / validateQuery ──────────────────────────────────────────────

/**
 * Validate a value against a rule descriptor.
 * Returns an error string if validation fails, or null on success.
 *
 * @param {string} field        — field name (for error messages)
 * @param {any}    value        — value to validate
 * @param {object} rule
 * @param {boolean}  rule.required      — field must be present and non-empty
 * @param {string}   rule.type          — 'string' | 'number' | 'boolean' | 'email'
 * @param {number}   rule.minLength     — minimum string length
 * @param {number}   rule.maxLength     — maximum string length
 * @param {number}   rule.min           — minimum numeric value
 * @param {number}   rule.max           — maximum numeric value
 * @param {any[]}    rule.allowedValues — value must be one of these
 * @param {RegExp}   rule.pattern       — string must match this pattern
 * @returns {string|null}
 */
function validateField(field, value, rule) {
  const missing = value === undefined || value === null || value === ''

  if (rule.required && missing) {
    return `${field} is required`
  }

  // If not required and missing, skip further checks
  if (missing) return null

  if (rule.type === 'string' || rule.type === 'email') {
    if (typeof value !== 'string') return `${field} must be a string`

    if (rule.type === 'email') {
      // Basic RFC-5322-ish check — not exhaustive but catches obvious mistakes
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return `${field} must be a valid email address`
      }
    }

    if (rule.minLength !== undefined && value.length < rule.minLength) {
      return `${field} must be at least ${rule.minLength} characters`
    }

    if (rule.maxLength !== undefined && value.length > rule.maxLength) {
      return `${field} must be at most ${rule.maxLength} characters`
    }

    if (rule.pattern && !rule.pattern.test(value)) {
      return `${field} has an invalid format`
    }
  }

  if (rule.type === 'number') {
    const num = typeof value === 'string' ? Number(value) : value
    if (typeof num !== 'number' || isNaN(num)) return `${field} must be a number`
    if (rule.min !== undefined && num < rule.min) return `${field} must be at least ${rule.min}`
    if (rule.max !== undefined && num > rule.max) return `${field} must be at most ${rule.max}`
  }

  if (rule.type === 'boolean') {
    if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
      return `${field} must be a boolean`
    }
  }

  if (rule.allowedValues !== undefined && !rule.allowedValues.includes(value)) {
    return `${field} must be one of: ${rule.allowedValues.join(', ')}`
  }

  return null
}

/**
 * Build a validation middleware from a rules map.
 *
 * @param {object}  rules    — map of field name → rule descriptor
 * @param {string}  source   — 'body' or 'query' (default: 'body')
 * @returns {Function}       — Express middleware
 */
function buildValidateMiddleware(rules, source = 'body') {
  return function validateMiddleware(req, res, next) {
    const data   = req[source] ?? {}
    const errors = []

    for (const [field, rule] of Object.entries(rules)) {
      const err = validateField(field, data[field], rule)
      if (err) errors.push({ field, message: err })
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', errors })
    }

    next()
  }
}

/**
 * Validate req.body fields against a rules map.
 * Returns 400 { error, errors } on failure.
 */
function validateBody(rules) {
  return buildValidateMiddleware(rules, 'body')
}

/**
 * Validate req.query fields against a rules map.
 * Returns 400 { error, errors } on failure.
 */
function validateQuery(rules) {
  return buildValidateMiddleware(rules, 'query')
}

module.exports = { sanitizeBody, validateBody, validateQuery, validateField }
