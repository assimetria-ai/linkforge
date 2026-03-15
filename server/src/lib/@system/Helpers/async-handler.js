// @system — asyncHandler
//
// Wraps an async route handler so that any rejected promise or thrown error
// is automatically forwarded to Express's next(err) — eliminating the
// try/catch boilerplate that would otherwise appear in every route.
//
// Usage:
//   const { asyncHandler } = require('../lib/@system/Helpers')
//
//   // Before: every handler needs try/catch
//   router.get('/items/:id', async (req, res, next) => {
//     try {
//       const item = await findById(db, 'items', req.params.id)
//       res.json({ data: item })
//     } catch (err) { next(err) }
//   })
//
//   // After: asyncHandler catches for you
//   router.get('/items/:id', asyncHandler(async (req, res) => {
//     const item = await findById(db, 'items', req.params.id)
//     res.json({ data: item })
//   }))
//
//   // Works seamlessly with typed errors:
//   router.get('/items/:id', asyncHandler(async (req, res) => {
//     const item = await findById(db, 'items', req.params.id)
//     if (!item) throw new NotFoundError('Item not found')
//     res.json({ data: item })
//   }))

'use strict'

/**
 * Wrap an async Express route handler to automatically forward errors to next().
 *
 * @param {Function} fn — async (req, res, next) => void
 * @returns {Function}  — Express-compatible middleware
 */
function asyncHandler(fn) {
  return function asyncRouteHandler(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

module.exports = { asyncHandler }
