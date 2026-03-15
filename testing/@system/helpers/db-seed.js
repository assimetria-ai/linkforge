/**
 * @system/testing — DB Seed & Teardown
 *
 * Utilities for seeding test data and cleaning up after tests.
 * Works with PostgreSQL via pg-promise.
 */

const path = require('path')
const fs = require('fs')

/**
 * Create a test database connection.
 * @param {string} [connectionUrl] - override connection URL
 * @returns {object} pg-promise database instance
 */
function createTestDb(connectionUrl) {
  const pgp = require('pg-promise')()
  const url = connectionUrl || process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5433/test'
  return pgp(url)
}

/**
 * Run all @system migrations against the test DB.
 * @param {object} db - pg-promise database instance
 * @param {string} [migrationsDir] - path to migrations directory
 */
async function runMigrations(db, migrationsDir) {
  const dir = migrationsDir || path.resolve(process.cwd(), 'server/src/db/migrations')
  if (!fs.existsSync(dir)) return

  const files = fs.readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8')
    await db.none(sql)
  }
}

/**
 * Seed the test DB with default data.
 * @param {object} db - pg-promise database instance
 * @param {object} [options] - seed options
 * @param {boolean} [options.users] - seed test users (default: true)
 * @param {boolean} [options.teams] - seed test teams (default: false)
 * @param {Function} [options.custom] - custom seed function (receives db)
 */
async function seedTestData(db, options = {}) {
  const { users = true, teams = false, custom } = options
  const bcrypt = require('bcryptjs')

  if (users) {
    const hash = await bcrypt.hash('TestPassword1!', 10)
    await db.none(`
      INSERT INTO users (email, password_hash, name, email_verified, created_at)
      VALUES ($1, $2, $3, true, NOW())
      ON CONFLICT (email) DO NOTHING
    `, ['test@example.com', hash, 'Test User'])

    const adminHash = await bcrypt.hash('AdminPassword1!', 10)
    await db.none(`
      INSERT INTO users (email, password_hash, name, role, email_verified, created_at)
      VALUES ($1, $2, $3, $4, true, NOW())
      ON CONFLICT (email) DO NOTHING
    `, ['admin@example.com', adminHash, 'Admin User', 'admin'])
  }

  if (teams) {
    await db.none(`
      INSERT INTO teams (name, slug, owner_id, created_at)
      SELECT 'Test Team', 'test-team', id, NOW()
      FROM users WHERE email = 'test@example.com'
      ON CONFLICT DO NOTHING
    `)
  }

  if (custom) await custom(db)
}

/**
 * Teardown: truncate all tables (preserving schema).
 * @param {object} db - pg-promise database instance
 * @param {string[]} [excludeTables] - tables to skip
 */
async function teardownDb(db, excludeTables = []) {
  const tables = await db.any(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename NOT IN ('pg_stat_statements', 'schema_migrations')
  `)

  const toTruncate = tables
    .map((t) => t.tablename)
    .filter((t) => !excludeTables.includes(t))

  if (toTruncate.length > 0) {
    await db.none(`TRUNCATE TABLE ${toTruncate.join(', ')} CASCADE`)
  }
}

/**
 * Full reset: teardown + re-seed.
 * @param {object} db - pg-promise database instance
 * @param {object} [seedOptions] - passed to seedTestData
 */
async function resetDb(db, seedOptions = {}) {
  await teardownDb(db)
  await seedTestData(db, seedOptions)
}

/**
 * Close the test database connection.
 * @param {object} db - pg-promise database instance
 */
async function closeTestDb(db) {
  if (db && db.$pool) {
    await db.$pool.end()
  }
}

module.exports = {
  createTestDb,
  runMigrations,
  seedTestData,
  teardownDb,
  resetDb,
  closeTestDb,
}
