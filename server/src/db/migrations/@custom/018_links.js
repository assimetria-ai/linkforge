'use strict'

/**
 * Migration 018 – Links table for URL shortening
 * Creates the links table with slug, target_url, user_id, clicks, and tracking.
 */

const fs = require('fs')
const path = require('path')

const SCHEMAS_DIR = path.join(__dirname, '../../schemas/@custom')

exports.up = async (db) => {
  const sql = fs.readFileSync(path.join(SCHEMAS_DIR, 'links.sql'), 'utf8')
  await db.none(sql)
  console.log('[018_links] applied schema: links')
}

exports.down = async (db) => {
  await db.none('DROP TRIGGER IF EXISTS trigger_links_updated_at ON links')
  await db.none('DROP FUNCTION IF EXISTS update_links_updated_at()')
  await db.none('DROP TABLE IF EXISTS links CASCADE')
  console.log('[018_links] rolled back: links')
}
