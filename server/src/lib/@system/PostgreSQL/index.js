// Require logger first so it's available in pg-promise callbacks
const logger = require('../Logger')

const pgp = require('pg-promise')({
  /**
   * Called when a new client is acquired from the pool.
   * `useCount` is 0 on first checkout, increments on reuse.
   */
  connect({ client, useCount }) {
    if (useCount === 0) {
      logger.debug({ host: client.host, database: client.database }, 'PostgreSQL client connected')
    }
  },

  /**
   * Called when a client is returned to the pool.
   */
  disconnect({ client }) {
    logger.debug({ host: client.host, database: client.database }, 'PostgreSQL client released')
  },

  /**
   * Called on any pg-promise query error.
   */
  error(err, e) {
    logger.error({ err, query: e?.query }, 'PostgreSQL error')
  },
})

// ── Pool configuration ─────────────────────────────────────────────────────

const DB_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/product_template_dev'
const POOL_MAX = parseInt(process.env.DB_POOL_MAX ?? '10', 10)
const POOL_IDLE_TIMEOUT = parseInt(process.env.DB_POOL_IDLE_TIMEOUT ?? '30000', 10)
const POOL_CONNECTION_TIMEOUT = parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT ?? '2000', 10)

const connectionConfig = {
  connectionString: DB_URL,

  // Maximum number of clients in the pool.
  // Tune based on expected concurrency and your DB server's max_connections.
  max: POOL_MAX,

  // Close idle clients after this many milliseconds.
  idleTimeoutMillis: POOL_IDLE_TIMEOUT,

  // Throw an error if a client cannot be acquired within this period.
  connectionTimeoutMillis: POOL_CONNECTION_TIMEOUT,

  // Require SSL in production. Railway PostgreSQL uses self-signed certs, so
  // rejectUnauthorized defaults to false unless DB_SSL_REJECT_UNAUTHORIZED=true.
  // Set DB_POOL_SSL=false to disable SSL entirely. Set DB_SSL_CA for custom CA.
  ssl: process.env.NODE_ENV === 'production' && process.env.DB_POOL_SSL !== 'false'
    ? process.env.DB_SSL_CA
      ? { ca: require('fs').readFileSync(process.env.DB_SSL_CA) }
      : { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true' }
    : undefined,
}

const db = pgp(connectionConfig)

// ── Lifecycle helpers ──────────────────────────────────────────────────────

/**
 * Verify the pool can reach the database. Call once at server startup.
 * Throws if the connection fails so the process exits with a clear error.
 */
async function connectPool() {
  const conn = await db.connect()
  const { serverVersion } = conn.client
  conn.done() // return the client to the pool immediately
  logger.info(
    { serverVersion, poolMax: POOL_MAX, idleTimeout: POOL_IDLE_TIMEOUT },
    'PostgreSQL connected',
  )
}

/**
 * Drain the pool and close all connections. Call on SIGTERM / SIGINT.
 */
async function disconnectPool() {
  await pgp.end()
  logger.info('PostgreSQL pool closed')
}

// ── Exports ───────────────────────────────────────────────────────────────
//
// module.exports IS the pg-promise db object — existing repos continue to
// work unchanged: `const db = require('.../PostgreSQL')`.
//
// Lifecycle helpers are attached as extra properties:
//   const { connectPool, disconnectPool } = require('.../PostgreSQL')
//

module.exports = db
module.exports.connectPool = connectPool
module.exports.disconnectPool = disconnectPool
module.exports.pgp = pgp
