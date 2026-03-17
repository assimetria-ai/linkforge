'use strict'

/**
 * Migration 014 – System onboarding flow foundation
 * - users.onboarding_data JSONB DEFAULT '{}'
 * - users.active_brand_id INTEGER REFERENCES brands(id)
 * - subscriptions.brand_id INTEGER REFERENCES brands(id) (idempotent safeguard)
 * - team_invites table for onboarding invitations
 */

exports.up = async (db) => {
  await db.none(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS onboarding_data JSONB NOT NULL DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS active_brand_id INTEGER REFERENCES brands(id) ON DELETE SET NULL;
  `)

  await db.none(`
    ALTER TABLE subscriptions
      ADD COLUMN IF NOT EXISTS brand_id INTEGER REFERENCES brands(id) ON DELETE SET NULL;
  `)

  await db.none(`
    CREATE INDEX IF NOT EXISTS idx_users_active_brand_id ON users(active_brand_id);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_brand_id ON subscriptions(brand_id);
  `)

  await db.none(`
    CREATE TABLE IF NOT EXISTS team_invites (
      id SERIAL PRIMARY KEY,
      brand_id INTEGER REFERENCES brands(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      invited_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)

  await db.none(`
    CREATE INDEX IF NOT EXISTS idx_team_invites_brand_id ON team_invites(brand_id);
    CREATE INDEX IF NOT EXISTS idx_team_invites_email ON team_invites(email);
    CREATE INDEX IF NOT EXISTS idx_team_invites_created_at ON team_invites(created_at DESC);
  `)
}

exports.down = async (db) => {
  await db.none(`
    DROP INDEX IF EXISTS idx_team_invites_created_at;
    DROP INDEX IF EXISTS idx_team_invites_email;
    DROP INDEX IF EXISTS idx_team_invites_brand_id;
    DROP TABLE IF EXISTS team_invites;
  `)

  await db.none(`
    ALTER TABLE users
      DROP COLUMN IF EXISTS active_brand_id,
      DROP COLUMN IF EXISTS onboarding_data;
  `)
}

