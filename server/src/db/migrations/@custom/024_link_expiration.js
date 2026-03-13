'use strict'

/**
 * Migration 024 – Link expiration
 * Adds expiration dates, click limits, and expiration email alerts to links.
 */

exports.up = async (db) => {
  await db.none(`
    -- Add expiration columns to links table
    ALTER TABLE links ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NULL;
    ALTER TABLE links ADD COLUMN IF NOT EXISTS click_limit BIGINT NULL;
    ALTER TABLE links ADD COLUMN IF NOT EXISTS expired_reason VARCHAR(50) NULL;
    ALTER TABLE links ADD COLUMN IF NOT EXISTS expiration_alert_sent BOOLEAN DEFAULT FALSE;
    ALTER TABLE links ADD COLUMN IF NOT EXISTS expiration_alert_days INTEGER NULL;

    -- Index for finding links that are about to expire (for alert cron)
    CREATE INDEX IF NOT EXISTS idx_links_expires_at 
      ON links(expires_at) 
      WHERE deleted_at IS NULL AND expires_at IS NOT NULL AND is_active = TRUE;

    -- Index for finding expired links efficiently
    CREATE INDEX IF NOT EXISTS idx_links_click_limit 
      ON links(click_limit, clicks) 
      WHERE deleted_at IS NULL AND click_limit IS NOT NULL AND is_active = TRUE;
  `)
  console.log('[024_link_expiration] applied: expiration columns added to links')
}

exports.down = async (db) => {
  await db.none(`
    DROP INDEX IF EXISTS idx_links_click_limit;
    DROP INDEX IF EXISTS idx_links_expires_at;
    ALTER TABLE links DROP COLUMN IF EXISTS expiration_alert_days;
    ALTER TABLE links DROP COLUMN IF EXISTS expiration_alert_sent;
    ALTER TABLE links DROP COLUMN IF EXISTS expired_reason;
    ALTER TABLE links DROP COLUMN IF EXISTS click_limit;
    ALTER TABLE links DROP COLUMN IF EXISTS expires_at;
  `)
  console.log('[024_link_expiration] rolled back: expiration columns removed')
}
