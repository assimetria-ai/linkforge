// @system — Email bounce & complaint handler
// Processes delivery failures (bounces), spam complaints, and unsubscribes
// from email provider webhooks and stores them in the DB for suppression.
//
// Supported event types:
//   - hard_bounce:  Permanent delivery failure (invalid address, domain gone)
//   - soft_bounce:  Temporary failure (mailbox full, server down)
//   - complaint:    Recipient marked email as spam (ISP feedback loop)
//   - unsubscribe:  User clicked unsubscribe link
//
// Suppression rules:
//   - Hard bounces → immediately suppress (never send again)
//   - Complaints → immediately suppress (critical for deliverability)
//   - Soft bounces → suppress after 3 failures within 7 days
//   - Unsubscribes → suppress until manually re-subscribed
//
// DB table: email_suppressions
//   CREATE TABLE IF NOT EXISTS email_suppressions (
//     id            SERIAL PRIMARY KEY,
//     email         TEXT NOT NULL,
//     reason        TEXT NOT NULL CHECK (reason IN ('hard_bounce','soft_bounce','complaint','unsubscribe')),
//     provider      TEXT,
//     details       JSONB DEFAULT '{}',
//     suppressed    BOOLEAN NOT NULL DEFAULT true,
//     bounce_count  INTEGER NOT NULL DEFAULT 1,
//     first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
//     last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
//     UNIQUE(email, reason)
//   );
//   CREATE INDEX IF NOT EXISTS idx_email_suppressions_email ON email_suppressions(email);
//   CREATE INDEX IF NOT EXISTS idx_email_suppressions_suppressed ON email_suppressions(suppressed) WHERE suppressed = true;
//
// Usage:
//   const bounces = require('../lib/@system/Email/bounces')
//   await bounces.recordBounce({ email, type: 'hard_bounce', provider: 'resend', details: {...} })
//   const suppressed = await bounces.isSuppressed('user@example.com')
//   const list = await bounces.getSuppressionList({ limit: 50 })

'use strict'

const logger = require('../Logger')

const SOFT_BOUNCE_THRESHOLD = 3
const SOFT_BOUNCE_WINDOW_DAYS = 7

function getDb() {
  return require('../PostgreSQL')
}

/**
 * Record a bounce, complaint, or unsubscribe event.
 * Handles deduplication: updates last_seen_at and bounce_count if the same
 * email+reason already exists.
 *
 * @param {object} opts
 * @param {string} opts.email      Recipient address
 * @param {string} opts.type       Event type: hard_bounce | soft_bounce | complaint | unsubscribe
 * @param {string} [opts.provider] Email provider that reported the event
 * @param {object} [opts.details]  Raw webhook payload or additional metadata
 */
async function recordBounce({ email, type, provider = null, details = {} }) {
  if (!email || !type) {
    logger.warn({ email, type }, '[Email/Bounces] missing required fields')
    return
  }

  const normalizedEmail = email.toLowerCase().trim()
  const db = getDb()

  try {
    // Upsert: insert or update existing record
    const result = await db.one(`
      INSERT INTO email_suppressions (email, reason, provider, details, suppressed, bounce_count)
      VALUES ($1, $2, $3, $4::jsonb, $5, 1)
      ON CONFLICT (email, reason) DO UPDATE SET
        last_seen_at = NOW(),
        bounce_count = email_suppressions.bounce_count + 1,
        provider = COALESCE($3, email_suppressions.provider),
        details = COALESCE($4::jsonb, email_suppressions.details),
        suppressed = CASE
          WHEN $2 IN ('hard_bounce', 'complaint', 'unsubscribe') THEN true
          WHEN $2 = 'soft_bounce' AND email_suppressions.bounce_count + 1 >= ${SOFT_BOUNCE_THRESHOLD}
            AND email_suppressions.first_seen_at > NOW() - INTERVAL '${SOFT_BOUNCE_WINDOW_DAYS} days'
            THEN true
          ELSE email_suppressions.suppressed
        END
      RETURNING id, email, reason, suppressed, bounce_count
    `, [normalizedEmail, type, provider, JSON.stringify(details), type !== 'soft_bounce'])

    logger.info({
      email: normalizedEmail,
      type,
      provider,
      suppressed: result.suppressed,
      bounceCount: result.bounce_count,
    }, '[Email/Bounces] event recorded')

    return result
  } catch (err) {
    // If the table doesn't exist yet, log warning but don't crash
    if (err.code === '42P01') {
      logger.warn('[Email/Bounces] email_suppressions table not found — run migrations')
      return null
    }
    logger.error({ err, email: normalizedEmail, type }, '[Email/Bounces] failed to record')
    throw err
  }
}

/**
 * Check if an email address is suppressed (should not receive emails).
 *
 * @param {string} email
 * @returns {Promise<boolean>}
 */
async function isSuppressed(email) {
  if (!email) return false

  const normalizedEmail = email.toLowerCase().trim()
  const db = getDb()

  try {
    const row = await db.oneOrNone(
      'SELECT 1 FROM email_suppressions WHERE email = $1 AND suppressed = true LIMIT 1',
      [normalizedEmail]
    )
    return !!row
  } catch (err) {
    if (err.code === '42P01') {
      logger.warn('[Email/Bounces] email_suppressions table not found — skipping check')
      return false
    }
    logger.error({ err, email: normalizedEmail }, '[Email/Bounces] suppression check failed')
    // Fail open: if we can't check, allow the email through
    return false
  }
}

/**
 * Get details for a suppressed email address.
 *
 * @param {string} email
 * @returns {Promise<object[]>} Array of suppression records
 */
async function getSuppressionDetails(email) {
  const normalizedEmail = email.toLowerCase().trim()
  const db = getDb()

  return db.manyOrNone(
    `SELECT reason, provider, details, suppressed, bounce_count, first_seen_at, last_seen_at
     FROM email_suppressions
     WHERE email = $1
     ORDER BY last_seen_at DESC`,
    [normalizedEmail]
  )
}

/**
 * Get the full suppression list (for admin UI / export).
 *
 * @param {object} [opts]
 * @param {number} [opts.limit=100]
 * @param {number} [opts.offset=0]
 * @param {string} [opts.reason]    Filter by reason type
 * @param {boolean} [opts.suppressedOnly=true] Only return suppressed entries
 * @returns {Promise<{ items: object[], total: number }>}
 */
async function getSuppressionList({ limit = 100, offset = 0, reason, suppressedOnly = true } = {}) {
  const db = getDb()
  const conditions = []
  const params = []
  let paramIdx = 0

  if (suppressedOnly) {
    conditions.push('suppressed = true')
  }

  if (reason) {
    paramIdx++
    conditions.push(`reason = $${paramIdx}`)
    params.push(reason)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  paramIdx++
  const limitParam = paramIdx
  params.push(limit)

  paramIdx++
  const offsetParam = paramIdx
  params.push(offset)

  const [items, countRow] = await Promise.all([
    db.manyOrNone(
      `SELECT email, reason, provider, suppressed, bounce_count, first_seen_at, last_seen_at
       FROM email_suppressions ${where}
       ORDER BY last_seen_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      params
    ),
    db.one(
      `SELECT COUNT(*)::int AS total FROM email_suppressions ${where}`,
      reason ? [reason] : []
    ),
  ])

  return { items, total: countRow.total }
}

/**
 * Remove suppression for an email address (e.g. re-subscribe, manual override).
 *
 * @param {string} email
 * @param {string} [reason] Specific reason to clear, or all if omitted
 * @returns {Promise<number>} Number of records updated
 */
async function removeSuppression(email, reason) {
  const normalizedEmail = email.toLowerCase().trim()
  const db = getDb()

  let result
  if (reason) {
    result = await db.result(
      'UPDATE email_suppressions SET suppressed = false WHERE email = $1 AND reason = $2',
      [normalizedEmail, reason]
    )
  } else {
    result = await db.result(
      'UPDATE email_suppressions SET suppressed = false WHERE email = $1',
      [normalizedEmail]
    )
  }

  if (result.rowCount > 0) {
    logger.info({ email: normalizedEmail, reason, cleared: result.rowCount }, '[Email/Bounces] suppression removed')
  }

  return result.rowCount
}

/**
 * Get suppression statistics (for dashboards).
 *
 * @returns {Promise<object>}
 */
async function getStats() {
  const db = getDb()

  try {
    const stats = await db.one(`
      SELECT
        COUNT(*) FILTER (WHERE suppressed = true)::int AS total_suppressed,
        COUNT(*) FILTER (WHERE reason = 'hard_bounce' AND suppressed = true)::int AS hard_bounces,
        COUNT(*) FILTER (WHERE reason = 'soft_bounce' AND suppressed = true)::int AS soft_bounces,
        COUNT(*) FILTER (WHERE reason = 'complaint' AND suppressed = true)::int AS complaints,
        COUNT(*) FILTER (WHERE reason = 'unsubscribe' AND suppressed = true)::int AS unsubscribes,
        COUNT(*) FILTER (WHERE last_seen_at > NOW() - INTERVAL '24 hours')::int AS last_24h,
        COUNT(*) FILTER (WHERE last_seen_at > NOW() - INTERVAL '7 days')::int AS last_7d
      FROM email_suppressions
    `)
    return stats
  } catch (err) {
    if (err.code === '42P01') return null
    throw err
  }
}

module.exports = {
  recordBounce,
  isSuppressed,
  getSuppressionDetails,
  getSuppressionList,
  removeSuppression,
  getStats,
  SOFT_BOUNCE_THRESHOLD,
  SOFT_BOUNCE_WINDOW_DAYS,
}
