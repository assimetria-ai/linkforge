// @system — Helpers barrel export
//
// Exports all reusable API scaffolding helpers from a single import point.
//
// Usage:
//   const {
//     asyncHandler,
//     NotFoundError, BadRequestError,
//     listQuery,
//     parsePagination, parseSortBy, buildWhereClause,
//     parseCursorPagination, encodeCursor, decodeCursor,
//     parseFields,
//     findAll, countAll, create, update, remove,
//     assertFound, upsert, createMany,
//     authenticate, requireAdmin,
//   } = require('../lib/@system/Helpers')

const {
  parsePagination,
  paginationMeta,
  paginatedQuery,
  parseSortBy,
  encodeCursor,
  decodeCursor,
  parseCursorPagination,
  DEFAULT_LIMIT,
  MAX_LIMIT,
} = require('./pagination')

const {
  parseSearch,
  buildSearchClause,
  applyFilters,
  buildWhereClause,
  parseFields,
} = require('./search')

const {
  buildUpdateSet,
  findById,
  findAll,
  countAll,
  create,
  update,
  remove,
  softDelete,
  assertFound,
  upsert,
  createMany,
} = require('./crud')

const {
  authenticate,
  requireAdmin,
  requireOwnerOrAdmin,
  recordPasswordFailure,
  isPasswordLocked,
  resetPasswordLock,
  LOCKOUT_THRESHOLD,
  LOCKOUT_WINDOW_MS,
} = require('./auth')

const { asyncHandler } = require('./async-handler')

const {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  UnprocessableError,
  TooManyRequestsError,
} = require('./errors')

const { listQuery } = require('./list-query')

const {
  hasPermission,
  getPermissions,
  buildPermissionsMatrix,
  allPermissions,
  TEAM_ROLE_PERMISSIONS,
  PERMISSION_LABELS,
} = require('./permissions')

module.exports = {
  // Async error propagation
  asyncHandler,

  // Typed HTTP errors (throw from handlers; app.js error handler converts to responses)
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  UnprocessableError,
  TooManyRequestsError,

  // All-in-one list endpoint helper
  listQuery,

  // Pagination + sorting (offset-based)
  parsePagination,
  paginationMeta,
  paginatedQuery,
  parseSortBy,
  DEFAULT_LIMIT,
  MAX_LIMIT,

  // Cursor-based pagination (preferred for large/real-time datasets)
  encodeCursor,
  decodeCursor,
  parseCursorPagination,

  // Search / filtering / field selection
  parseSearch,
  buildSearchClause,
  applyFilters,
  buildWhereClause,
  parseFields,

  // CRUD operations
  buildUpdateSet,
  findById,
  findAll,
  countAll,
  create,
  update,
  remove,
  softDelete,
  assertFound,
  upsert,
  createMany,

  // Auth middleware
  authenticate,
  requireAdmin,
  requireOwnerOrAdmin,
  recordPasswordFailure,
  isPasswordLocked,
  resetPasswordLock,
  LOCKOUT_THRESHOLD,
  LOCKOUT_WINDOW_MS,
}
