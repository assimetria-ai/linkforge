/**
 * @custom - Usage and cost tracking for dashboard
 * Tracks API usage, AI costs, and other metered services
 */

'use strict'

exports.up = async function (db) {
  // Enable uuid-ossp if not already
  await db.none(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`)

  // Usage tracking table for all metered services
  await db.none(`
    CREATE TABLE IF NOT EXISTS usage_events (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      service VARCHAR(50) NOT NULL,
      operation VARCHAR(100) NOT NULL,
      model VARCHAR(100),
      tokens_input INTEGER DEFAULT 0,
      tokens_output INTEGER DEFAULT 0,
      tokens_total INTEGER DEFAULT 0,
      bytes_processed BIGINT DEFAULT 0,
      requests_count INTEGER DEFAULT 1,
      cost_usd NUMERIC(10,6) DEFAULT 0,
      pricing_model VARCHAR(50),
      metadata JSONB
    );
  `)

  await db.none(`
    CREATE INDEX IF NOT EXISTS idx_usage_events_user_created ON usage_events(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_usage_events_service_created ON usage_events(service, created_at);
    CREATE INDEX IF NOT EXISTS idx_usage_events_created ON usage_events(created_at);
  `)

  // Aggregate cost summary
  await db.none(`
    CREATE TABLE IF NOT EXISTS usage_summary (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      service VARCHAR(50) NOT NULL,
      total_requests INTEGER DEFAULT 0,
      total_tokens BIGINT DEFAULT 0,
      total_bytes BIGINT DEFAULT 0,
      total_cost_usd NUMERIC(10,2) DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, date, service)
    );
  `)

  await db.none(`
    CREATE INDEX IF NOT EXISTS idx_usage_summary_user_date ON usage_summary(user_id, date);
  `)

  // User cost budget/limits
  await db.none(`
    CREATE TABLE IF NOT EXISTS user_cost_limits (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      monthly_limit_usd NUMERIC(10,2) DEFAULT 100,
      daily_limit_usd NUMERIC(10,2) DEFAULT 10,
      alerts_enabled BOOLEAN DEFAULT true,
      alert_threshold_percent INTEGER DEFAULT 80,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `)

  console.log('[017_usage_tracking] applied schema: usage_events, usage_summary, user_cost_limits')
}

exports.down = async function (db) {
  await db.none('DROP TABLE IF EXISTS user_cost_limits CASCADE;')
  await db.none('DROP TABLE IF EXISTS usage_summary CASCADE;')
  await db.none('DROP TABLE IF EXISTS usage_events CASCADE;')
  console.log('[017_usage_tracking] rolled back')
}
