// @system — Search helpers
//
// Builds parameterised ILIKE search conditions for PostgreSQL.
// Never uses string interpolation — all values go through the parameterised
// query interface to prevent SQL injection.
//
// Usage:
//   const { parseSearch, buildSearchClause, applyFilters } = require('./search')
//
//   // In a route handler:
//   const { term, filters } = parseSearch(req.query, {
//     allowedFilters: ['status', 'category'],
//   })
//
//   const { clause, params, nextIndex } = buildSearchClause(term, ['title', 'body'], 1)
//   // clause  → '(title ILIKE $1 OR body ILIKE $1)'
//   // params  → ['%hello%']
//   // nextIndex → 2
//
//   const { clause: fClause, params: fParams } = applyFilters(filters, nextIndex)
//   // fClause → 'AND status = $2'
//   // fParams → ['active']
//
//   const where = [clause, fClause].filter(Boolean).join(' ')
//   // → '(title ILIKE $1 OR body ILIKE $1) AND status = $2'

/**
 * Parse search parameters from req.query.
 *
 * @param {object} query               — req.query
 * @param {object} opts
 * @param {string[]} opts.allowedFilters — whitelist of column names that may be filtered
 * @param {string}   opts.termKey        — query param key for the search term (default: 'q')
 * @param {number}   opts.maxTermLength  — max length to accept for the search term (default: 200)
 * @returns {{ term: string|null, filters: Record<string, string> }}
 */
function parseSearch(query = {}, { allowedFilters = [], termKey = 'q', maxTermLength = 200 } = {}) {
  const rawTerm = query[termKey]
  const term    = rawTerm && typeof rawTerm === 'string'
    ? rawTerm.trim().slice(0, maxTermLength) || null
    : null

  // Only keep filters that are on the explicit allowlist.
  // This prevents the caller from accidentally exposing arbitrary column filtering.
  const filters = {}
  for (const key of allowedFilters) {
    const val = query[key]
    if (val !== undefined && val !== '') {
      filters[key] = String(val)
    }
  }

  return { term, filters }
}

/**
 * Build a parameterised ILIKE search clause across multiple columns.
 *
 * All columns receive the same ILIKE pattern — useful for simple full-text
 * style search across a fixed set of text columns.
 *
 * @param {string|null} term       — search term (null → no clause generated)
 * @param {string[]}    columns    — table columns to search (e.g. ['title', 'body'])
 * @param {number}      startIndex — starting $N index for pg-promise params (default: 1)
 * @returns {{ clause: string, params: any[], nextIndex: number }}
 *
 * Example:
 *   buildSearchClause('hello', ['title', 'description'], 1)
 *   → { clause: '(title ILIKE $1 OR description ILIKE $1)', params: ['%hello%'], nextIndex: 2 }
 */
function buildSearchClause(term, columns, startIndex = 1) {
  if (!term || columns.length === 0) {
    return { clause: '', params: [], nextIndex: startIndex }
  }

  const pattern    = `%${term}%`
  const conditions = columns.map(col => `${col} ILIKE $${startIndex}`)

  return {
    clause:    `(${conditions.join(' OR ')})`,
    params:    [pattern],
    nextIndex: startIndex + 1,
  }
}

/**
 * Build parameterised equality filters from a filters object.
 *
 * @param {Record<string, string>} filters   — { column: value } pairs
 * @param {number}                 startIndex — starting $N index
 * @param {{ prefix?: string }}    opts       — 'AND ' prefix by default
 * @returns {{ clause: string, params: any[], nextIndex: number }}
 *
 * Example:
 *   applyFilters({ status: 'active', category: 'news' }, 2)
 *   → { clause: 'AND status = $2 AND category = $3', params: ['active', 'news'], nextIndex: 4 }
 */
function applyFilters(filters = {}, startIndex = 1, { prefix = 'AND ' } = {}) {
  const entries = Object.entries(filters)
  if (entries.length === 0) {
    return { clause: '', params: [], nextIndex: startIndex }
  }

  let idx    = startIndex
  const parts  = []
  const params = []

  for (const [col, val] of entries) {
    parts.push(`${col} = $${idx}`)
    params.push(val)
    idx++
  }

  return {
    clause:    `${prefix}${parts.join(` ${prefix}`)}`,
    params,
    nextIndex: idx,
  }
}

/**
 * Convenience: combine buildSearchClause + applyFilters into a single WHERE block.
 *
 * Returns a ready-to-append SQL fragment that starts with 'WHERE' when there
 * are conditions, or an empty string when there are none.
 *
 * @param {object} opts
 * @param {string|null} opts.term
 * @param {string[]}    opts.columns
 * @param {object}      opts.filters
 * @param {number}      opts.startIndex
 * @returns {{ where: string, params: any[], nextIndex: number }}
 *
 * Example:
 *   buildWhereClause({ term: 'hello', columns: ['title'], filters: { status: 'active' }, startIndex: 1 })
 *   → { where: 'WHERE (title ILIKE $1) AND status = $2', params: ['%hello%', 'active'], nextIndex: 3 }
 */
function buildWhereClause({ term = null, columns = [], filters = {}, startIndex = 1 } = {}) {
  const search  = buildSearchClause(term, columns, startIndex)
  const filter  = applyFilters(
    filters,
    search.nextIndex,
    { prefix: search.clause ? 'AND ' : '' }
  )

  const parts = [search.clause, filter.clause].filter(Boolean)

  return {
    where:     parts.length ? `WHERE ${parts.join(' ')}` : '',
    params:    [...search.params, ...filter.params],
    nextIndex: filter.nextIndex,
  }
}

/**
 * Parse a ?fields=col1,col2 query parameter into a validated column array.
 *
 * Enables sparse fieldsets — clients request only the columns they need,
 * reducing payload size. Only columns in allowedFields are returned,
 * preventing accidental exposure of sensitive columns.
 *
 * Returns null when the param is absent or produces no valid columns.
 * Callers should fall back to '*' on null.
 *
 * @param {object}   query         — req.query
 * @param {string[]} allowedFields — whitelisted column names (e.g. ['id', 'title', 'status'])
 * @returns {string[]|null}        — validated field array, or null
 *
 * Example:
 *   const fields = parseFields(req.query, ['id', 'title', 'status', 'created_at'])
 *   const columns = fields ? fields.join(', ') : '*'
 *   // ?fields=id,title,status → 'id, title, status'
 *   // ?fields=id,password     → ['id']  (password not in whitelist)
 *   // (no ?fields param)      → null   → use '*'
 */
function parseFields(query = {}, allowedFields = []) {
  if (!query.fields || allowedFields.length === 0) return null

  const valid = String(query.fields)
    .split(',')
    .map(f => f.trim())
    .filter(f => allowedFields.includes(f))

  return valid.length > 0 ? valid : null
}

module.exports = { parseSearch, buildSearchClause, applyFilters, buildWhereClause, parseFields }
