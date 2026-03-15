// @system — listQuery
//
// All-in-one helper for paginated + searchable + filterable list endpoints.
//
// Combines parsePagination, parseSortBy, parseSearch, buildWhereClause,
// countAll, findAll, and paginationMeta into a single call — replacing
// ~10 lines of setup code in every list endpoint with one call.
//
// Usage:
//   const { listQuery, asyncHandler } = require('../lib/@system/Helpers')
//
//   const TABLE           = 'items'
//   const SEARCH_COLUMNS  = ['title', 'body']
//   const ALLOWED_FILTERS = ['status']
//   const ALLOWED_SORT    = ['title', 'status', 'created_at', 'updated_at']
//
//   router.get('/items', asyncHandler(async (req, res) => {
//     const result = await listQuery(db, TABLE, req.query, {
//       searchColumns:  SEARCH_COLUMNS,
//       allowedFilters: ALLOWED_FILTERS,
//       allowedSort:    ALLOWED_SORT,
//     })
//     res.json(result)
//   }))
//
// Returns: { data: rows[], meta: { total, page, pages, limit, offset, hasNext, hasPrev } }
//
// For more complex queries (JOINs, extra WHERE conditions), use the lower-level
// helpers (parsePagination, buildWhereClause, findAll, etc.) directly.

'use strict'

const { parsePagination, parseSortBy, paginationMeta } = require('./pagination')
const { parseSearch, buildWhereClause }                = require('./search')
const { findAll, countAll }                            = require('./crud')

/**
 * Execute a paginated + searchable + filterable list query.
 *
 * @param {object}   db
 * @param {string}   table                — table name (trusted, not user-supplied)
 * @param {object}   query                — req.query
 * @param {object}   opts
 * @param {string[]} opts.searchColumns   — columns to search with ILIKE (e.g. ['title', 'body'])
 * @param {string[]} opts.allowedFilters  — columns that may be equality-filtered (e.g. ['status'])
 * @param {string[]} opts.allowedSort     — columns that may be sorted on
 * @param {string}   opts.defaultSort     — default sort column (default: 'created_at')
 * @param {string}   opts.defaultOrder    — 'ASC' | 'DESC' (default: 'DESC')
 * @param {string}   opts.columns         — SELECT column list (default: '*')
 * @returns {Promise<{ data: object[], meta: object }>}
 */
async function listQuery(db, table, query = {}, {
  searchColumns  = [],
  allowedFilters = [],
  allowedSort    = ['created_at'],
  defaultSort    = 'created_at',
  defaultOrder   = 'DESC',
  columns        = '*',
} = {}) {
  const { limit, offset } = parsePagination(query)
  const { orderBy }       = parseSortBy(query, allowedSort, { default: defaultSort, defaultOrder })
  const { term, filters } = parseSearch(query, { allowedFilters })
  const { where, params } = buildWhereClause({ term, columns: searchColumns, filters })

  const [total, rows] = await Promise.all([
    countAll(db, table, { where, params }),
    findAll(db, table, { where, params, orderBy, limit, offset, columns }),
  ])

  return {
    data: rows,
    meta: paginationMeta(total, limit, offset),
  }
}

module.exports = { listQuery }
