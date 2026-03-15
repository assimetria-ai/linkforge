// @system — admin API
// GET    /api/admin/users       — list all users (paginated, searchable)
// PATCH  /api/admin/users/:id   — update user role or active status
// DELETE /api/admin/users/:id   — soft-delete user
// GET    /api/admin/analytics   — user count, signups, active sessions
// GET    /api/admin/settings    — app-wide settings
// PATCH  /api/admin/settings    — update app-wide settings
//
// All routes require authenticate + requireAdmin middleware.

'use strict'

const express  = require('express')
const router   = express.Router()
const db       = require('../../../lib/@system/PostgreSQL')
const logger   = require('../../../lib/@system/Logger')
const { authenticate, requireAdmin } = require('../../../lib/@system/Helpers/auth')
const UserRepo      = require('../../../db/repos/@system/UserRepo')
const AuditLogRepo  = require('../../../db/repos/@system/AuditLogRepo')

// ── Schema initialization ─────────────────────────────────────────────────────
// Adds admin-specific columns to users and creates app_settings.
// ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS are idempotent.

let _schemaReady = false

async function ensureAdminSchema() {
  if (_schemaReady) return
  await db.none(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active  BOOLEAN NOT NULL DEFAULT true;
    CREATE TABLE IF NOT EXISTS app_settings (
      key        TEXT        PRIMARY KEY,
      value      JSONB       NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)
  _schemaReady = true
}

// Initialize eagerly on module load; errors are non-fatal (logged only).
ensureAdminSchema().catch(err => logger.error({ err }, 'admin schema init failed'))

// ── Middleware shorthand ───────────────────────────────────────────────────────

const guard = [authenticate, requireAdmin]

// ── Users ─────────────────────────────────────────────────────────────────────

const VALID_ROLES = ['user', 'admin']
const PAGE_SIZE   = 20

// GET /api/admin/users
router.get('/admin/users', guard, async (req, res, next) => {
  try {
    await ensureAdminSchema()

    const page   = Math.max(1, parseInt(req.query.page   || '1',           10))
    const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit || String(PAGE_SIZE), 10)))
    const search = String(req.query.search || '').slice(0, 200)
    const offset = (page - 1) * limit

    const [users, total] = await Promise.all([
      UserRepo.findAll({ limit, offset, search }),
      UserRepo.count({ search }),
    ])

    res.json({
      users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/admin/users/:id
router.patch('/admin/users/:id', guard, async (req, res, next) => {
  try {
    await ensureAdminSchema()

    const { id }         = req.params
    const { role, is_active } = req.body

    if (role !== undefined) {
      if (!VALID_ROLES.includes(role)) {
        return res.status(400).json({ message: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` })
      }
      // Prevent an admin from changing their own role
      if (String(id) === String(req.user.id)) {
        return res.status(400).json({ message: 'You cannot change your own role.' })
      }

      const updated = await UserRepo.updateRole(id, role)
      if (!updated) return res.status(404).json({ message: 'User not found.' })

      await AuditLogRepo.create({
        user_id:       req.user.id,
        actor_email:   req.user.email,
        action:        'admin.user.role_changed',
        resource_type: 'user',
        resource_id:   id,
        new_data:      { role },
        ip_address:    req.ip,
        user_agent:    req.headers['user-agent'],
      })

      return res.json({ user: updated })
    }

    if (is_active !== undefined) {
      // Prevent an admin from deactivating themselves
      if (String(id) === String(req.user.id) && !is_active) {
        return res.status(400).json({ message: 'You cannot deactivate your own account.' })
      }

      const updated = await UserRepo.setActive(id, Boolean(is_active))
      if (!updated) return res.status(404).json({ message: 'User not found.' })

      await AuditLogRepo.create({
        user_id:       req.user.id,
        actor_email:   req.user.email,
        action:        'admin.user.active_changed',
        resource_type: 'user',
        resource_id:   id,
        new_data:      { is_active },
        ip_address:    req.ip,
        user_agent:    req.headers['user-agent'],
      })

      return res.json({ user: updated })
    }

    res.status(400).json({ message: 'Provide role or is_active to update.' })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/admin/users/:id
router.delete('/admin/users/:id', guard, async (req, res, next) => {
  try {
    await ensureAdminSchema()

    const { id } = req.params

    if (String(id) === String(req.user.id)) {
      return res.status(400).json({ message: 'You cannot delete your own account.' })
    }

    const deleted = await UserRepo.softDelete(id)
    if (!deleted) return res.status(404).json({ message: 'User not found.' })

    await AuditLogRepo.create({
      user_id:       req.user.id,
      actor_email:   req.user.email,
      action:        'admin.user.deleted',
      resource_type: 'user',
      resource_id:   id,
      ip_address:    req.ip,
      user_agent:    req.headers['user-agent'],
    })

    res.json({ message: 'User deleted.' })
  } catch (err) {
    next(err)
  }
})

// ── Analytics ─────────────────────────────────────────────────────────────────

// GET /api/admin/analytics
router.get('/admin/analytics', guard, async (req, res, next) => {
  try {
    await ensureAdminSchema()

    const [totalRow, last7Row, last30Row, sessionsRow] = await Promise.all([
      db.one(`SELECT COUNT(*) FROM users WHERE deleted_at IS NULL`),
      db.one(`SELECT COUNT(*) FROM users WHERE deleted_at IS NULL AND created_at >= now() - INTERVAL '7 days'`),
      db.one(`SELECT COUNT(*) FROM users WHERE deleted_at IS NULL AND created_at >= now() - INTERVAL '30 days'`),
      db.one(`SELECT COUNT(*) FROM sessions WHERE revoked_at IS NULL AND expires_at > now()`),
    ])

    res.json({
      totalUsers:     parseInt(totalRow.count,    10),
      newLast7Days:   parseInt(last7Row.count,    10),
      newLast30Days:  parseInt(last30Row.count,   10),
      activeSessions: parseInt(sessionsRow.count, 10),
    })
  } catch (err) {
    next(err)
  }
})

// ── Settings ──────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS = {
  appName:             'MyApp',
  registrationEnabled: true,
  emailVerifyRequired: false,
  maintenanceMode:     false,
}

const ALLOWED_KEYS = new Set(Object.keys(DEFAULT_SETTINGS))

async function getSettings() {
  const rows     = await db.any('SELECT key, value FROM app_settings')
  const settings = { ...DEFAULT_SETTINGS }
  for (const row of rows) {
    if (ALLOWED_KEYS.has(row.key)) settings[row.key] = row.value
  }
  return settings
}

// GET /api/admin/settings
router.get('/admin/settings', guard, async (req, res, next) => {
  try {
    await ensureAdminSchema()
    const settings = await getSettings()
    res.json({ settings })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/admin/settings
router.patch('/admin/settings', guard, async (req, res, next) => {
  try {
    await ensureAdminSchema()

    const incoming = req.body ?? {}
    const updates  = []

    for (const [key, value] of Object.entries(incoming)) {
      if (!ALLOWED_KEYS.has(key)) continue
      if (typeof value !== typeof DEFAULT_SETTINGS[key]) continue

      updates.push(
        db.none(
          `INSERT INTO app_settings (key, value, updated_at)
           VALUES ($1, $2::jsonb, now())
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
          [key, JSON.stringify(value)],
        ),
      )
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No valid settings provided.' })
    }

    await Promise.all(updates)

    await AuditLogRepo.create({
      user_id:       req.user.id,
      actor_email:   req.user.email,
      action:        'admin.settings.updated',
      resource_type: 'app_settings',
      new_data:      incoming,
      ip_address:    req.ip,
      user_agent:    req.headers['user-agent'],
    })

    const settings = await getSettings()
    res.json({ settings })
  } catch (err) {
    next(err)
  }
})

module.exports = router
