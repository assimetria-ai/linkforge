// @system — request validation middleware
// Minimal schema validation — no external runtime dependencies required.
//
// Usage:
//   const { validate } = require('../../../lib/@system/Validation')
//   router.post('/route', validate({ body: MySchema }), handler)
//
// A schema must implement: schema.validate(data) => { error: string|null }

'use strict'

/**
 * Express middleware factory that validates req.body against a schema.
 *
 * @param {object} opts
 * @param {{ validate(data: unknown): { error: string|null } }} [opts.body] - Body schema
 */
function validate({ body: schema } = {}) {
  return function validationMiddleware(req, res, next) {
    if (!schema) return next()
    const result = schema.validate(req.body ?? {})
    if (result.error) {
      return res.status(400).json({ message: result.error })
    }
    next()
  }
}

module.exports = { validate }
