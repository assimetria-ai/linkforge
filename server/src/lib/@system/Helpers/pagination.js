// @system — Pagination helpers
//
// Provides consistent offset-based pagination across all list endpoints.
//
// Usage:
//   const { parsePagination, paginationMeta, paginatedQuery } = require('./pagination')
//
//   // In a route handler:
//   const { limit, offset, page } = parsePagination(req.query)
//
//   const rows  = await db.any('SELECT * FROM items ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset])
//   const { count } = await db.one('SELECT COUNT(*) FROM items')
//
//   res.json({ data: rows, meta: paginationMeta(parseInt(count), limit, offset) })
//
//   // Or use the all-in-one helper:
//   const result = await paginatedQuery(db, {
//     count: 'SELECT COUNT(*) FROM items WHERE status = $1',
//     data:  'SELECT * FROM items WHERE status = $1 ORDER BY created_at DESC',
//     params: ['active'],
//     limit,
//     offset,
//   })
//   res.json(result)

const DEFAULT_LIMIT = 20
const MAX_LIMIT     = 100
const MIN_LIMIT     = 1

/**
 * Parse pagination parameters from req.query.
 *
 * Accepts:
 *   ?page=2&limit=25        — page-based (1-indexed)
 *   ?limit=25&offset=50     — offset-based (offset takes precedence over page)
 *
 * Returns { page, limit, offset } — always valid, never negative.
 */
function parsePagination(query = {}) {
  const limit  = Math.min(MAX_LIMIT, Math.max(MIN_LIMIT, parseInt(query.limit)  || DEFAULT_LIMIT))
  const page   = Math.max(1, parseInt(query.page) || 1)
  // Explicit offset takes precedence over page calculation
  const offset = query.offset !== undefined
    ? Math.max(0, parseInt(query.offset) || 0)
    : (page - 1) * limit

  return { page, limit, offset }
}

/**
 * Build the meta object for paginated list responses.
 *
 * @param {number} total   — total number of matching rows (from COUNT(*))
 * @param {number} limit   — page size
 * @param {number} offset  — current offset
 * @returns {{ total, limit, offset, page, pages, hasNext, hasPrev }}
 */
function paginationMeta(total, limit, offset) {
  const pages   = Math.ceil(total / limit) || 1
  const page    = Math.floor(offset / limit) + 1
  const hasNext = offset + limit < total
  const hasPrev = offset > 0

  return { total, limit, offset, page, pages, hasNext, hasPrev }
}

/**
 * Run a paginated COUNT + data query pair in a single helper call.
 *
 * @param {object} db           — pg-promise db instance
 * @param {object} opts
 * @param {string} opts.count   — SQL to count all matching rows, must return { count }
 * @param {string} opts.data    — SQL to fetch the current page (must include LIMIT/OFFSET placeholders at the end)
 * @param {any[]}  opts.params  — Query parameters shared by both queries (before limit/offset)
 * @param {number} opts.limit
 * @param {number} opts.offset
 * @returns {Promise<{ data: any[], meta: object }>}
 *
 * Example:
 *   paginatedQuery(db, {
 *     count:  'SELECT COUNT(*) FROM items WHERE status = $1',
 *     data:   'SELECT * FROM items WHERE status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
 *     params: ['active'],
 *     limit,
 *     offset,
 *   })
 */
async function paginatedQuery(db, { count, data, params = [], limit, offset }) {
  const [{ count: total }, rows] = await Promise.all([
    db.one(count, params),
    db.any(data, [...params, limit, offset]),
  ])

  return {
    data: rows,
    meta: paginationMeta(parseInt(total, 10), limit, offset),
  }
}

/**
 * Parse and validate a sort-by column + order direction from req.query.
 *
 * Prevents ORDER BY injection by only allowing an explicit whitelist of columns.
 *
 * @param {object}   query             — req.query
 * @param {string[]} allowedColumns    — whitelisted column names (e.g. ['title', 'created_at'])
 * @param {object}   opts
 * @param {string}   opts.default      — fallback column when query.sort_by is absent or not in whitelist (default: 'created_at')
 * @param {string}   opts.defaultOrder — fallback direction 'ASC' | 'DESC' (default: 'DESC')
 * @param {string}   opts.sortKey      — query param key for column   (default: 'sort_by')
 * @param {string}   opts.orderKey     — query param key for direction (default: 'order')
 * @returns {{ column: string, direction: 'ASC'|'DESC', orderBy: string }}
 *
 * Example:
 *   parseSortBy(req.query, ['title', 'created_at', 'updated_at'])
 *   // ?sort_by=title&order=asc → { column: 'title', direction: 'ASC', orderBy: 'title ASC' }
 *   // ?sort_by=injected         → { column: 'created_at', direction: 'DESC', orderBy: 'created_at DESC' }
 */
function parseSortBy(query = {}, allowedColumns = [], {
  default: defaultColumn = 'created_at',
  defaultOrder           = 'DESC',
  sortKey                = 'sort_by',
  orderKey               = 'order',
} = {}) {
  const rawColumn = query[sortKey]
  const column    = rawColumn && allowedColumns.includes(rawColumn) ? rawColumn : defaultColumn

  const rawOrder  = typeof query[orderKey] === 'string' ? query[orderKey].toUpperCase() : ''
  const direction = rawOrder === 'ASC' ? 'ASC' : defaultOrder === 'ASC' ? 'ASC' : 'DESC'

  return { column, direction, orderBy: `${column} ${direction}` }
}

/**
 * Encode a cursor value as a URL-safe base64 string.
 *
 * @param {any} value — raw cursor value (e.g. a timestamp or row id)
 * @returns {string}  — opaque base64url string safe for use in URLs
 */
function encodeCursor(value) {
  return Buffer.from(String(value)).toString('base64url')
}

/**
 * Decode a cursor string back to its raw value.
 *
 * @param {string|null} encoded — value from ?after= query param
 * @returns {string|null}       — decoded cursor value, or null if absent/invalid
 */
function decodeCursor(encoded) {
  if (!encoded || typeof encoded !== 'string') return null
  try {
    return Buffer.from(encoded, 'base64url').toString('utf8')
  } catch {
    return null
  }
}

/**
 * Parse cursor-based pagination parameters from req.query.
 *
 * Cursor pagination avoids OFFSET drift on large or frequently-updated tables
 * and is the preferred approach for infinite-scroll / real-time feeds.
 *
 * Client workflow:
 *   1. Fetch first page:  GET /items?limit=20
 *   2. Read meta.nextCursor from response
 *   3. Fetch next page:   GET /items?limit=20&after=<nextCursor>
 *   4. Stop when meta.hasNext === false
 *
 * @param {object} query — req.query
 * @returns {{ limit: number, cursor: string|null }} — decoded cursor value or null
 *
 * Example:
 *   const { limit, cursor } = parseCursorPagination(req.query)
 *   const rows = await db.any(
 *     `SELECT * FROM items ${cursor ? 'WHERE created_at < $1' : ''} ORDER BY created_at DESC LIMIT $${cursor ? 2 : 1}`,
 *     cursor ? [cursor, limit + 1] : [limit + 1]
 *   )
 *   const hasNext  = rows.length > limit
 *   const data     = hasNext ? rows.slice(0, limit) : rows
 *   const nextCursor = hasNext ? encodeCursor(data[data.length - 1].created_at) : null
 *   res.json({ data, meta: { limit, hasNext, nextCursor } })
 */
function parseCursorPagination(query = {}) {
  const limit  = Math.min(MAX_LIMIT, Math.max(MIN_LIMIT, parseInt(query.limit) || DEFAULT_LIMIT))
  const cursor = decodeCursor(query.after || null)
  return { limit, cursor }
}

module.exports = { parsePagination, paginationMeta, paginatedQuery, parseSortBy, encodeCursor, decodeCursor, parseCursorPagination, DEFAULT_LIMIT, MAX_LIMIT }
