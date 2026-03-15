// @system — audit log service
//
// Records user actions to the audit_log table for compliance, debugging, and
// security review.  All writes degrade gracefully: if the DB is unavailable or
// the table has not been migrated yet, the error is logged and execution continues.
//
// Usage:
//   const auditLog = require('../AuditLog')
//   await auditLog.log({ userId, action: 'file.upload', resourceType: 'file', resourceId: key, ip: req.ip })
//   const { entries, total } = await auditLog.getRecent({ limit: 50 })

const logger = require('../Logger')

// Lazy-load the DB so this module can be required even before DATABASE_URL is set.
function getDb() {
  return require('../PostgreSQL')
}

// ── Write ─────────────────────────────────────────────────────────────────────

/**
 * Insert one audit log entry.
 *
 * @param {object}  opts
 * @param {number}  [opts.userId]       - ID of the acting user (null for anonymous)
 * @param {string}  opts.action         - Verb that identifies the event, e.g. 'user.login', 'file.delete'
 * @param {string}  [opts.resourceType] - Type of object acted on, e.g. 'file', 'team'
 * @param {string}  [opts.resourceId]   - Identifier of the affected object
 * @param {object}  [opts.meta]         - Additional free-form context (stored as JSONB)
 * @param {string}  [opts.ip]           - Client IP address
 */
async function log({ userId = null, action, resourceType = null, resourceId = null, meta = {}, ip = null } = {}) {
  if (!action) return

  try {
    const db = getDb()
    await db.none(
      `INSERT INTO audit_log (user_id, action, resource_type, resource_id, meta, ip)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId || null, action, resourceType || null, resourceId || null, meta, ip || null]
    )
  } catch (err) {
    // Never throw — audit logging must not interrupt the main request path.
    logger.warn({ err, action, userId }, 'audit log write failed')
  }
}

// ── Read ──────────────────────────────────────────────────────────────────────

/**
 * Return recent audit log entries, newest first.
 *
 * @param {object}  [opts]
 * @param {number}  [opts.limit=50]   - Max rows to return (1–500)
 * @param {number}  [opts.offset=0]   - Pagination offset
 * @param {number}  [opts.userId]     - Filter to a specific user
 * @param {string}  [opts.action]     - Filter by action prefix (e.g. 'file.' matches all file events)
 * @returns {Promise<{ entries: object[], total: number }>}
 */
async function getRecent({ limit = 50, offset = 0, userId, action } = {}) {
  const clampedLimit = Math.min(Math.max(1, limit), 500)

  try {
    const db = getDb()

    const conditions = []
    const values     = []

    if (userId) {
      values.push(userId)
      conditions.push(`user_id = $${values.length}`)
    }

    if (action) {
      values.push(`${action}%`)
      conditions.push(`action LIKE $${values.length}`)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const [rows, countRow] = await Promise.all([
      db.any(
        `SELECT id, user_id, action, resource_type, resource_id, meta, ip,
                created_at
           FROM audit_log
           ${where}
           ORDER BY created_at DESC
           LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, clampedLimit, offset]
      ),
      db.one(
        `SELECT COUNT(*) AS total FROM audit_log ${where}`,
        values
      ),
    ])

    return { entries: rows, total: parseInt(countRow.total, 10) }
  } catch (err) {
    logger.warn({ err }, 'audit log read failed')
    return { entries: [], total: 0 }
  }
}

module.exports = { log, getRecent }
