'use strict';

const path = require('path');
const { execSync } = require('child_process');

// Workspace root: 4 levels up from qa-framework/
const WORKSPACE_ROOT = path.resolve(__dirname, '../../../../');
const BRANDS_DIR = path.join(WORKSPACE_ROOT, 'backend/public/brands');

/**
 * Attempt to load the pg module from several candidate locations.
 * Returns the pg module or null if unavailable.
 */
function loadPg() {
  const candidates = [
    'pg',
    path.join(WORKSPACE_ROOT, 'backend/node_modules/pg'),
    path.join(WORKSPACE_ROOT, 'node_modules/pg'),
    path.join(__dirname, '../../../node_modules/pg'),
  ];
  for (const p of candidates) {
    try {
      return require(p);
    } catch (_) {
      // try next
    }
  }
  return null;
}

/**
 * Create a lightweight DB client wrapper around a pg Pool.
 * Returns null if pg is unavailable or the connection fails.
 *
 * @param {string} [databaseUrl] - Override DATABASE_URL
 */
async function createDbClient(databaseUrl) {
  const url = databaseUrl || process.env.DATABASE_URL;
  if (!url) return null;

  const pg = loadPg();
  if (!pg) return null;

  const { Pool } = pg;
  const pool = new Pool({
    connectionString: url,
    ssl: url.includes('sslmode=disable') ? false : { rejectUnauthorized: false },
    max: 2,
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 5000,
  });

  const client = {
    async query(sql, params) {
      const res = await pool.query(sql, params);
      return res.rows;
    },
    async end() {
      try {
        await pool.end();
      } catch (_) {}
    },
  };

  // Verify connectivity
  try {
    await client.query('SELECT 1');
    return client;
  } catch (e) {
    await client.end();
    return null;
  }
}

/**
 * Query the OS database for product info by slug.
 * Tries several column combinations to handle schema variations.
 *
 * @param {object} db - DB client from createDbClient()
 * @param {string} slug
 * @returns {Promise<object|null>}
 */
async function getProductInfo(db, slug) {
  if (!db || !slug) return null;

  // Try full query first
  try {
    const rows = await db.query(
      `SELECT
         id, slug, name, status,
         railway_url, color_palette, description
       FROM products
       WHERE slug = $1
       LIMIT 1`,
      [slug]
    );
    if (rows && rows.length > 0) {
      const product = rows[0];

      // Optionally fetch brand asset data
      try {
        const assets = await db.query(
          `SELECT * FROM product_brand_assets WHERE product_id = $1 LIMIT 1`,
          [product.id]
        );
        product.brand_assets = assets[0] || null;
      } catch (_) {
        product.brand_assets = null;
      }

      return product;
    }
    return null;
  } catch (_) {}

  // Minimal fallback
  try {
    const rows = await db.query(
      `SELECT id, slug, name, status FROM products WHERE slug = $1 LIMIT 1`,
      [slug]
    );
    return rows[0] || null;
  } catch (_) {
    return null;
  }
}

/**
 * Check required tables exist in the product's own database.
 * Returns { found: string[], missing: string[] }.
 *
 * @param {object} db - DB client for the product's database
 * @param {string[]} requiredTables
 */
async function checkTables(db, requiredTables) {
  if (!db) return { found: [], missing: requiredTables };

  const rows = await db.query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name = ANY($1)`,
    [requiredTables]
  );

  const found = rows.map((r) => r.table_name);
  const missing = requiredTables.filter((t) => !found.includes(t));
  return { found, missing };
}

/**
 * Shell out to psql for a simple query.
 * Returns the raw output string or null on failure.
 *
 * @param {string} sql
 * @param {string} [databaseUrl]
 */
function psqlQuery(sql, databaseUrl) {
  const url = databaseUrl || process.env.DATABASE_URL;
  if (!url) return null;
  try {
    return execSync(`psql "${url}" -t -A -F '|' -c '${sql.replace(/'/g, "''")}'`, {
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
      .toString()
      .trim();
  } catch (_) {
    return null;
  }
}

module.exports = {
  createDbClient,
  getProductInfo,
  checkTables,
  psqlQuery,
  WORKSPACE_ROOT,
  BRANDS_DIR,
};
