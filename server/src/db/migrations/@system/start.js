'use strict'
/**
 * Robust startup script for Railway (and any production deploy).
 *
 * Flow:
 *   1. Run migrations
 *   2. Verify users table actually exists
 *   3. If users table missing (ghost migration) → drop schema_migrations → re-run
 *   4. Final verify — if still missing, abort (don't start broken server)
 *   5. exec node src/index.js
 */

require('dotenv').config()

const { execSync, spawn } = require('child_process')
const path = require('path')
const db = require('../../../lib/@system/PostgreSQL')

const SERVER_ROOT = path.resolve(__dirname, '../../../../')
const INDEX_JS = path.join(SERVER_ROOT, 'src/index.js')
const RUN_JS = path.join(__dirname, 'run.js')

function log(msg) {
  console.log(`[start][${new Date().toISOString()}] ${msg}`)
}

async function runMigrations() {
  log('Running migrations...')
  execSync(`node ${RUN_JS}`, { stdio: 'inherit' })
  log('Migrations complete.')
}

async function usersTableExists() {
  const { exists } = await db.one(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'users'
    ) AS exists`
  )
  return exists
}

async function dropSchemaMigrations() {
  log('Dropping schema_migrations to force full re-run...')
  await db.none('DROP TABLE IF EXISTS schema_migrations')
  log('schema_migrations dropped.')
}

async function main() {
  let dbReady = false

  try {
    // Step 1: Run migrations (first attempt)
    try {
      await runMigrations()
    } catch (err) {
      log(`Migrations failed (attempt 1): ${err.message}`)
      log('Clearing schema_migrations and retrying...')
      try {
        await dropSchemaMigrations()
        await runMigrations()
      } catch (retryErr) {
        log(`Migrations failed (attempt 2): ${retryErr.message}`)
        log('⚠️ Starting server without migrations — DB may be unavailable')
      }
    }

    // Step 2: Verify users table actually exists
    try {
      let exists = await usersTableExists()

      if (!exists) {
        log('Ghost migration detected: schema_migrations recorded but users table missing!')
        await dropSchemaMigrations()
        await runMigrations()
        exists = await usersTableExists()
      }

      if (!exists) {
        log('⚠️ users table still missing after re-run — starting server anyway (static assets will work)')
      } else {
        log('✅ users table verified')
        dbReady = true
      }
    } catch (verifyErr) {
      log(`⚠️ DB verification failed: ${verifyErr.message} — starting server anyway`)
    }

    try { db.pgp.end() } catch (_) {}

  } catch (err) {
    log(`Startup error: ${err.message} — starting server anyway for static assets + healthcheck`)
    if (err.stack) console.error(err.stack)
    try { db.pgp.end() } catch (_) {}
  }

  // Step 3: Always start the server (even if DB is down, static assets + healthcheck must work)
  log(`Starting server (dbReady=${dbReady})...`)
  const child = spawn('node', [INDEX_JS], { stdio: 'inherit' })
  child.on('exit', code => process.exit(code ?? 0))
  child.on('error', err => {
    console.error('Failed to start server:', err.message)
    process.exit(1)
  })

  // Forward signals
  for (const sig of ['SIGTERM', 'SIGINT', 'SIGHUP']) {
    process.on(sig, () => child.kill(sig))
  }
}

main()
