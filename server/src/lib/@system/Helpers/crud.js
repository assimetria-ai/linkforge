// @system — CRUD helpers
//
// Reusable building blocks for common database operations.
// All helpers use parameterised queries — never string-interpolate untrusted values.
//
// Usage:
//   const { findById, findAll, create, update, remove, buildUpdateSet } = require('./crud')
//   const { assertFound, upsert, createMany } = require('./crud')
//
//   // GET /items/:id — throw NotFoundError automatically
//   const item = assertFound(await findById(db, 'items', req.params.id), 'Item not found')
//
//   // POST /items
//   const item = await create(db, 'items', { title: 'Hello', status: 'draft' })
//
//   // PATCH /items/:id
//   const item = await update(db, 'items', req.params.id, req.body)
//
//   // DELETE /items/:id
//   const deleted = await remove(db, 'items', req.params.id)
//
//   // INSERT ... ON CONFLICT ... DO UPDATE
//   const row = await upsert(db, 'items', { slug: 'hello', title: 'Hi' }, {
//     conflict: 'slug',
//     update:   ['title', 'body'],
//   })
//
//   // Bulk insert
//   const rows = await createMany(db, 'tags', [{ name: 'js' }, { name: 'ts' }])

const { NotFoundError } = require('./errors')

/**
 * Build a parameterised SET clause for a partial UPDATE.
 *
 * Only includes keys that are present in `data`.
 * Skips undefined values and a configurable set of protected columns
 * (id, created_at by default).
 *
 * Always appends `updated_at = now()` unless the caller passes
 * opts.skipUpdatedAt = true.
 *
 * @param {object}   data       — partial record (only the fields to update)
 * @param {number}   startIndex — starting $N index (default 1); id is typically $N-last
 * @param {object}   opts
 * @param {string[]} opts.skip           — additional column names to exclude
 * @param {boolean}  opts.skipUpdatedAt  — omit the auto-appended updated_at = now()
 * @returns {{ set: string, params: any[], nextIndex: number }}
 *
 * Example:
 *   buildUpdateSet({ title: 'New', status: 'active' }, 1)
 *   → { set: 'title = $1, status = $2, updated_at = now()', params: ['New', 'active'], nextIndex: 3 }
 */
function buildUpdateSet(data, startIndex = 1, { skip = [], skipUpdatedAt = false } = {}) {
  const ALWAYS_SKIP = new Set(['id', 'created_at', ...skip])

  const parts  = []
  const params = []
  let   idx    = startIndex

  for (const [key, val] of Object.entries(data)) {
    if (val === undefined) continue
    if (ALWAYS_SKIP.has(key)) continue

    parts.push(`${key} = $${idx}`)
    params.push(val)
    idx++
  }

  if (!skipUpdatedAt) {
    parts.push('updated_at = now()')
  }

  return { set: parts.join(', '), params, nextIndex: idx }
}

/**
 * Find a single row by primary key.
 *
 * @param {object}  db      — pg-promise db instance
 * @param {string}  table   — table name (trusted, not user-supplied)
 * @param {any}     id      — primary key value
 * @param {object}  opts
 * @param {string}  opts.idColumn  — primary key column (default: 'id')
 * @param {string}  opts.columns   — SELECT column list (default: '*')
 * @returns {Promise<object|null>} — null if not found
 */
async function findById(db, table, id, { idColumn = 'id', columns = '*' } = {}) {
  return db.oneOrNone(
    `SELECT ${columns} FROM ${table} WHERE ${idColumn} = $1`,
    [id]
  )
}

/**
 * Find all rows from a table with optional WHERE, ORDER BY, and pagination.
 *
 * @param {object}  db
 * @param {string}  table
 * @param {object}  opts
 * @param {string}  opts.where     — SQL fragment appended after FROM table (e.g. 'WHERE status = $1')
 * @param {any[]}   opts.params    — bound parameters for `where`
 * @param {string}  opts.orderBy   — ORDER BY clause (default: 'created_at DESC')
 * @param {number}  opts.limit     — LIMIT (default: 20)
 * @param {number}  opts.offset    — OFFSET (default: 0)
 * @param {string}  opts.columns   — SELECT column list (default: '*')
 * @returns {Promise<object[]>}
 */
async function findAll(db, table, {
  where    = '',
  params   = [],
  orderBy  = 'created_at DESC',
  limit    = 20,
  offset   = 0,
  columns  = '*',
} = {}) {
  const limitIdx  = params.length + 1
  const offsetIdx = params.length + 2

  return db.any(
    `SELECT ${columns} FROM ${table} ${where} ORDER BY ${orderBy} LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    [...params, limit, offset]
  )
}

/**
 * Count all rows matching an optional WHERE clause.
 *
 * @param {object} db
 * @param {string} table
 * @param {object} opts
 * @param {string} opts.where   — SQL fragment (e.g. 'WHERE status = $1')
 * @param {any[]}  opts.params
 * @returns {Promise<number>}
 */
async function countAll(db, table, { where = '', params = [] } = {}) {
  const { count } = await db.one(
    `SELECT COUNT(*) FROM ${table} ${where}`,
    params
  )
  return parseInt(count, 10)
}

/**
 * Insert a new row and return the full created record.
 *
 * @param {object}   db
 * @param {string}   table
 * @param {object}   data         — column→value pairs to insert
 * @param {object}   opts
 * @param {string[]} opts.skip    — columns to exclude from insert
 * @returns {Promise<object>}     — created row (RETURNING *)
 */
async function create(db, table, data, { skip = [] } = {}) {
  const SKIP = new Set(['id', 'created_at', 'updated_at', ...skip])

  const columns = []
  const params  = []
  let   idx     = 1

  for (const [key, val] of Object.entries(data)) {
    if (SKIP.has(key)) continue
    if (val === undefined) continue
    columns.push(key)
    params.push(val)
    idx++
  }

  if (columns.length === 0) {
    throw new Error('create(): no insertable columns in data')
  }

  const colList    = columns.join(', ')
  const valPlacers = columns.map((_, i) => `$${i + 1}`).join(', ')

  return db.one(
    `INSERT INTO ${table} (${colList}) VALUES (${valPlacers}) RETURNING *`,
    params
  )
}

/**
 * Partially update a row by primary key.
 *
 * Only columns present in `data` are updated. Returns null if the row
 * does not exist.
 *
 * @param {object}  db
 * @param {string}  table
 * @param {any}     id
 * @param {object}  data          — partial record to apply
 * @param {object}  opts
 * @param {string}  opts.idColumn — primary key column (default: 'id')
 * @param {string[]} opts.skip    — additional columns to exclude from update
 * @returns {Promise<object|null>} — updated row, or null if not found
 */
async function update(db, table, id, data, { idColumn = 'id', skip = [] } = {}) {
  const { set, params, nextIndex } = buildUpdateSet(data, 1, { skip })

  if (!set || set === 'updated_at = now()') {
    // Nothing to update other than the timestamp — still valid, but return early
    return findById(db, table, id, { idColumn })
  }

  return db.oneOrNone(
    `UPDATE ${table} SET ${set} WHERE ${idColumn} = $${nextIndex} RETURNING *`,
    [...params, id]
  )
}

/**
 * Delete a row by primary key.
 *
 * @param {object} db
 * @param {string} table
 * @param {any}    id
 * @param {object} opts
 * @param {string} opts.idColumn — primary key column (default: 'id')
 * @returns {Promise<boolean>}   — true if a row was deleted, false if not found
 */
async function remove(db, table, id, { idColumn = 'id' } = {}) {
  const result = await db.result(
    `DELETE FROM ${table} WHERE ${idColumn} = $1`,
    [id]
  )
  return result.rowCount > 0
}

/**
 * Soft-delete a row by setting deleted_at = now().
 *
 * Requires the table to have a `deleted_at` timestamp column.
 *
 * @param {object} db
 * @param {string} table
 * @param {any}    id
 * @param {object} opts
 * @param {string} opts.idColumn    — primary key column (default: 'id')
 * @param {string} opts.deletedCol  — soft-delete column (default: 'deleted_at')
 * @returns {Promise<object|null>}  — updated row, or null if not found
 */
async function softDelete(db, table, id, { idColumn = 'id', deletedCol = 'deleted_at' } = {}) {
  return db.oneOrNone(
    `UPDATE ${table} SET ${deletedCol} = now() WHERE ${idColumn} = $1 AND ${deletedCol} IS NULL RETURNING *`,
    [id]
  )
}

/**
 * Assert that a row was found; throw NotFoundError if it is null/undefined.
 *
 * Eliminates the repetitive `if (!row) throw new NotFoundError(...)` pattern.
 *
 * @param {object|null} row     — result of findById or similar
 * @param {string}      message — error message (default: 'Not found')
 * @returns {object}            — the row, unchanged
 * @throws {NotFoundError}
 *
 * Example:
 *   const item = assertFound(await findById(db, 'items', req.params.id), 'Item not found')
 */
function assertFound(row, message = 'Not found') {
  if (row === null || row === undefined) throw new NotFoundError(message)
  return row
}

/**
 * Insert a row or update on conflict (upsert).
 *
 * @param {object}   db
 * @param {string}   table
 * @param {object}   data               — column→value pairs to insert
 * @param {object}   opts
 * @param {string|string[]} opts.conflict — conflict target column(s), e.g. 'slug' or ['team_id', 'user_id']
 * @param {string[]} opts.update         — columns to update on conflict (omit for DO NOTHING)
 * @param {string[]} opts.skip           — columns to exclude from insert
 * @param {string}   opts.returning      — RETURNING clause (default: '*')
 * @returns {Promise<object|null>}       — upserted row, or null on DO NOTHING conflict
 *
 * Example:
 *   await upsert(db, 'slugs', { slug: 'hello', title: 'Hi' }, {
 *     conflict: 'slug',
 *     update:   ['title', 'updated_by'],
 *   })
 */
async function upsert(db, table, data, { conflict, update: updateCols, skip = [], returning = '*' } = {}) {
  if (!conflict) throw new Error('upsert(): conflict column(s) are required')

  const SKIP = new Set(['id', 'created_at', 'updated_at', ...skip])
  const columns = []
  const params  = []

  for (const [key, val] of Object.entries(data)) {
    if (SKIP.has(key) || val === undefined) continue
    columns.push(key)
    params.push(val)
  }

  if (columns.length === 0) throw new Error('upsert(): no insertable columns in data')

  const colList       = columns.join(', ')
  const valPlacers    = columns.map((_, i) => `$${i + 1}`).join(', ')
  const conflictTarget = Array.isArray(conflict) ? conflict.join(', ') : conflict

  let conflictAction
  if (!updateCols || updateCols.length === 0) {
    conflictAction = 'DO NOTHING'
  } else {
    const setCols = updateCols.map(col => `${col} = EXCLUDED.${col}`)
    setCols.push('updated_at = now()')
    conflictAction = `DO UPDATE SET ${setCols.join(', ')}`
  }

  return db.oneOrNone(
    `INSERT INTO ${table} (${colList}) VALUES (${valPlacers})
     ON CONFLICT (${conflictTarget}) ${conflictAction}
     RETURNING ${returning}`,
    params
  )
}

/**
 * Bulk-insert multiple rows in a single query.
 *
 * Column list is derived from the first row. Missing keys in subsequent rows
 * are inserted as NULL. Skips id, created_at, updated_at by default.
 *
 * @param {object}   db
 * @param {string}   table
 * @param {object[]} rows    — array of column→value objects
 * @param {object}   opts
 * @param {string[]} opts.skip — additional columns to exclude
 * @returns {Promise<object[]>} — all inserted rows (RETURNING *)
 *
 * Example:
 *   const tags = await createMany(db, 'tags', [{ name: 'js' }, { name: 'ts' }])
 */
async function createMany(db, table, rows, { skip = [] } = {}) {
  if (!rows || rows.length === 0) return []

  const SKIP = new Set(['id', 'created_at', 'updated_at', ...skip])
  const columns = Object.keys(rows[0]).filter(k => !SKIP.has(k) && rows[0][k] !== undefined)

  if (columns.length === 0) throw new Error('createMany(): no insertable columns in rows')

  const colList  = columns.join(', ')
  let   paramIdx = 1
  const allParams = []

  const rowPlaceholders = rows.map(row => {
    const placeholders = columns.map(() => `$${paramIdx++}`).join(', ')
    for (const col of columns) {
      allParams.push(row[col] ?? null)
    }
    return `(${placeholders})`
  })

  return db.any(
    `INSERT INTO ${table} (${colList}) VALUES ${rowPlaceholders.join(', ')} RETURNING *`,
    allParams
  )
}

module.exports = { buildUpdateSet, findById, findAll, countAll, create, update, remove, softDelete, assertFound, upsert, createMany }
