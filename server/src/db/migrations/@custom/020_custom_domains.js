'use strict'

/**
 * Migration 020 – Custom domains table for branded short links
 * Creates the custom_domains table with DNS verification and SSL tracking.
 */

const fs = require('fs')
const path = require('path')

const SCHEMAS_DIR = path.join(__dirname, '../../schemas/@custom')

exports.up = async (db) => {
  const sql = fs.readFileSync(path.join(SCHEMAS_DIR, 'custom_domains.sql'), 'utf8')
  await db.none(sql)
  // Add domain_id to links table for domain association
  await db.none(`
    ALTER TABLE links ADD COLUMN IF NOT EXISTS domain_id BIGINT REFERENCES custom_domains(id) ON DELETE SET NULL
  `)
  await db.none(`
    CREATE INDEX IF NOT EXISTS idx_links_domain_id ON links(domain_id) WHERE deleted_at IS NULL AND domain_id IS NOT NULL
  `)
  console.log('[020_custom_domains] applied schema: custom_domains + links.domain_id')
}

exports.down = async (db) => {
  await db.none('DROP INDEX IF EXISTS idx_links_domain_id')
  await db.none('ALTER TABLE links DROP COLUMN IF EXISTS domain_id')
  await db.none('DROP TRIGGER IF EXISTS trigger_custom_domains_updated_at ON custom_domains')
  await db.none('DROP FUNCTION IF EXISTS update_custom_domains_updated_at()')
  await db.none('DROP TABLE IF EXISTS custom_domains CASCADE')
  console.log('[020_custom_domains] rolled back: custom_domains')
}
