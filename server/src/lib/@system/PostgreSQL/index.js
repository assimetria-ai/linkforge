// @system — PostgreSQL client (pg-promise singleton)
//
// Usage:
//   const db = require('../PostgreSQL')
//   const rows = await db.any('SELECT * FROM items WHERE status = $1', ['active'])
//   const row  = await db.oneOrNone('SELECT * FROM users WHERE id = $1', [id])
//
// All pg-promise query methods are available:
//   db.any(sql, values)        — 0..n rows
//   db.one(sql, values)        — exactly 1 row, throws if 0 or >1
//   db.oneOrNone(sql, values)  — 0 or 1 row, throws if >1
//   db.none(sql, values)       — expects no rows returned
//   db.result(sql, values)     — returns raw PGResult (access .rowCount, .rows)
//   db.tx(fn)                  — transaction block
//   db.task(fn)                — task block (single connection, no transaction)

const pgPromise = require('pg-promise')

const isProd   = process.env.NODE_ENV === 'production'
const poolMax  = parseInt(process.env.DB_POOL_MAX                || '10', 10)
const idleMs   = parseInt(process.env.DB_POOL_IDLE_TIMEOUT       || '30000', 10)
const connMs   = parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT || '2000', 10)
const sslRaw   = process.env.DB_POOL_SSL

// SSL is on by default in production; set DB_POOL_SSL=false to disable.
const ssl = sslRaw === 'false' ? false : (isProd ? { rejectUnauthorized: false } : false)

// pg-promise initialisation options.
// Extend with initOptions.error / initOptions.query for query logging / Sentry.
const initOptions = {}

const pgp = pgPromise(initOptions)

const cn = {
  connectionString: process.env.DATABASE_URL,
  max:              poolMax,
  idleTimeoutMillis: idleMs,
  connectionTimeoutMillis: connMs,
  ssl: ssl || undefined,
}

// Singleton database instance — shared across all require() calls.
const db = pgp(cn)

module.exports = db
