'use strict'

/**
 * Migration 019 – Add UTM parameter columns to links table
 * Stores UTM tracking data (source, medium, campaign, term, content) with each link.
 */

exports.up = async (db) => {
  await db.none(`
    ALTER TABLE links
      ADD COLUMN IF NOT EXISTS utm_source VARCHAR(255),
      ADD COLUMN IF NOT EXISTS utm_medium VARCHAR(255),
      ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR(255),
      ADD COLUMN IF NOT EXISTS utm_term VARCHAR(255),
      ADD COLUMN IF NOT EXISTS utm_content VARCHAR(255);
  `)

  // Index for UTM analytics queries
  await db.none(`
    CREATE INDEX IF NOT EXISTS idx_links_utm_campaign
      ON links(utm_campaign) WHERE utm_campaign IS NOT NULL AND deleted_at IS NULL;
  `)
  await db.none(`
    CREATE INDEX IF NOT EXISTS idx_links_utm_source
      ON links(utm_source) WHERE utm_source IS NOT NULL AND deleted_at IS NULL;
  `)

  console.log('[019_utm_params] added UTM columns to links table')
}

exports.down = async (db) => {
  await db.none('DROP INDEX IF EXISTS idx_links_utm_campaign')
  await db.none('DROP INDEX IF EXISTS idx_links_utm_source')
  await db.none(`
    ALTER TABLE links
      DROP COLUMN IF EXISTS utm_source,
      DROP COLUMN IF EXISTS utm_medium,
      DROP COLUMN IF EXISTS utm_campaign,
      DROP COLUMN IF EXISTS utm_term,
      DROP COLUMN IF EXISTS utm_content;
  `)
  console.log('[019_utm_params] rolled back UTM columns')
}
