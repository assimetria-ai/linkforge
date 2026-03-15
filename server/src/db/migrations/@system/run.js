'use strict'
/**
 * Migration runner — executes @system migrations in order.
 * Tracks applied migrations in schema_migrations table.
 *
 * Each migration file exports { up(db) }.
 */

require('dotenv').config()

const fs = require('fs')
const path = require('path')
const db = require('../../../lib/@system/PostgreSQL')

const MIGRATIONS_DIR = __dirname

async function ensureMigrationsTable() {
  await db.none(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}

async function getAppliedMigrations() {
  const rows = await db.manyOrNone('SELECT name FROM schema_migrations ORDER BY id')
  return new Set(rows.map(r => r.name))
}

function getMigrationFiles() {
  return fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => /^\d/.test(f) && f.endsWith('.js'))
    .sort()
}

async function main() {
  const ts = () => new Date().toISOString()
  console.log(`[run][${ts()}] Starting migrations...`)

  await ensureMigrationsTable()
  const applied = await getAppliedMigrations()
  const files = getMigrationFiles()

  let count = 0
  for (const file of files) {
    const name = path.basename(file, '.js')
    if (applied.has(name)) continue

    console.log(`[run][${ts()}] Applying: ${name}`)
    const migration = require(path.join(MIGRATIONS_DIR, file))
    if (typeof migration.up === 'function') {
      await migration.up(db)
    }
    await db.none('INSERT INTO schema_migrations (name) VALUES ($1)', [name])
    count++
    console.log(`[run][${ts()}] Applied: ${name}`)
  }

  // Also run .sql files
  const sqlFiles = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => /^\d/.test(f) && f.endsWith('.sql'))
    .sort()

  for (const file of sqlFiles) {
    const name = path.basename(file, '.sql')
    if (applied.has(name)) continue

    console.log(`[run][${ts()}] Applying SQL: ${name}`)
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8')
    await db.none(sql)
    await db.none('INSERT INTO schema_migrations (name) VALUES ($1)', [name])
    count++
    console.log(`[run][${ts()}] Applied SQL: ${name}`)
  }

  console.log(`[run][${ts()}] Migrations complete. Applied ${count} new migration(s).`)
  await db.$pool.end()
}

main().catch(err => {
  console.error(`[run] Migration failed:`, err)
  process.exit(1)
})
