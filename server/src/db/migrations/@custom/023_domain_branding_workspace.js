'use strict'

/**
 * Migration 023 – Custom domains: workspace support, health checks, white-label branding
 * - Adds team_id for workspace-level domain ownership
 * - Adds branding fields for white-label support
 * - Adds health check tracking columns
 */

exports.up = async (db) => {
  // Add team_id for workspace-level domain ownership
  await db.none(`
    ALTER TABLE custom_domains
      ADD COLUMN IF NOT EXISTS team_id BIGINT REFERENCES teams(id) ON DELETE CASCADE
  `)
  await db.none(`
    CREATE INDEX IF NOT EXISTS idx_custom_domains_team_id
      ON custom_domains(team_id) WHERE deleted_at IS NULL
  `)

  // Health check columns
  await db.none(`
    ALTER TABLE custom_domains
      ADD COLUMN IF NOT EXISTS last_health_check_at TIMESTAMPTZ NULL,
      ADD COLUMN IF NOT EXISTS health_status VARCHAR(20) DEFAULT 'unknown',
      ADD COLUMN IF NOT EXISTS health_error TEXT NULL,
      ADD COLUMN IF NOT EXISTS consecutive_failures INT DEFAULT 0
  `)

  // White-label branding config (JSONB for flexibility)
  await db.none(`
    ALTER TABLE custom_domains
      ADD COLUMN IF NOT EXISTS branding JSONB DEFAULT '{}'::jsonb
  `)

  // Comment explaining branding schema
  await db.none(`
    COMMENT ON COLUMN custom_domains.branding IS
      'White-label branding config: { "company_name", "logo_url", "favicon_url", "primary_color", "background_color", "custom_css", "powered_by_hidden" }'
  `)

  console.log('[023_domain_branding_workspace] applied: team_id, health check, branding columns')
}

exports.down = async (db) => {
  await db.none('DROP INDEX IF EXISTS idx_custom_domains_team_id')
  await db.none(`
    ALTER TABLE custom_domains
      DROP COLUMN IF EXISTS team_id,
      DROP COLUMN IF EXISTS last_health_check_at,
      DROP COLUMN IF EXISTS health_status,
      DROP COLUMN IF EXISTS health_error,
      DROP COLUMN IF EXISTS consecutive_failures,
      DROP COLUMN IF EXISTS branding
  `)
  console.log('[023_domain_branding_workspace] rolled back')
}
