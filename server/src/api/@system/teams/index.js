// @system — team collaboration API
//
// GET    /api/teams                              — list teams for the current user
// POST   /api/teams                              — create a team (caller becomes owner)
// GET    /api/teams/:teamId                      — get team + members (members only)
// PATCH  /api/teams/:teamId                      — rename team (owner/admin only)
// DELETE /api/teams/:teamId                      — delete team (owner only)
//
// GET    /api/teams/:teamId/invites              — list pending invites (owner/admin)
// POST   /api/teams/:teamId/invites              — invite a user by email (owner/admin)
// DELETE /api/teams/:teamId/invites/:inviteId    — cancel invite (owner/admin)
//
// POST   /api/invites/:token/accept              — accept an invite (authenticated)
//
// PATCH  /api/teams/:teamId/members/:memberId    — update member role (owner only)
// DELETE /api/teams/:teamId/members/:memberId    — remove member (owner/admin, or self)

'use strict'

const express = require('express')
const crypto  = require('crypto')
const router  = express.Router()
const db      = require('../../../lib/@system/PostgreSQL')
const logger  = require('../../../lib/@system/Logger')
const { authenticate } = require('../../../lib/@system/Helpers/auth')
const { validate }     = require('../../../lib/@system/Validation')
const {
  CreateTeamBody,
  UpdateTeamBody,
  InviteMemberBody,
  UpdateMemberRoleBody,
} = require('../../../lib/@system/Validation/schemas/@system/teams')
const {
  getPermissions,
  buildPermissionsMatrix,
  allPermissions,
} = require('../../../lib/@system/Helpers/permissions')

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns the calling user's membership row for a team, or null. */
async function getMembership(teamId, userId) {
  return db.oneOrNone(
    'SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2',
    [teamId, userId]
  )
}

/** Returns true if the team exists. */
async function teamExists(teamId) {
  const row = await db.oneOrNone('SELECT id FROM teams WHERE id = $1', [teamId])
  return !!row
}

/**
 * Middleware — loads the calling user's team membership and attaches it to req.
 * Responds 404 if the team does not exist; 403 if the user is not a member
 * (unless the user has the global 'admin' role, who can view any team).
 */
async function requireMembership(req, res, next) {
  try {
    const { teamId } = req.params
    const exists = await teamExists(teamId)
    if (!exists) return res.status(404).json({ message: 'Team not found' })

    const membership = await getMembership(teamId, req.user.id)

    if (!membership && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You are not a member of this team' })
    }

    req.membership = membership // may be null for global admins
    next()
  } catch (err) {
    next(err)
  }
}

/**
 * Middleware — requires the caller to be an owner or admin of the team
 * (or a global system admin).
 */
async function requireAdminRole(req, res, next) {
  if (req.user.role === 'admin') return next()
  if (!req.membership || !['owner', 'admin'].includes(req.membership.role)) {
    return res.status(403).json({ message: 'Insufficient team permissions' })
  }
  next()
}

/**
 * Middleware — requires the caller to be the owner of the team
 * (or a global system admin).
 */
async function requireOwnerRole(req, res, next) {
  if (req.user.role === 'admin') return next()
  if (!req.membership || req.membership.role !== 'owner') {
    return res.status(403).json({ message: 'Only the team owner can perform this action' })
  }
  next()
}

// ── Permissions matrix ────────────────────────────────────────────────────────

// GET /api/teams/permissions — full permissions matrix for all roles (authenticated)
// Useful for building role-comparison UI without embedding the matrix client-side.
router.get('/teams/permissions', authenticate, (req, res) => {
  res.json({
    matrix:         buildPermissionsMatrix(),
    allPermissions: allPermissions(),
  })
})

// ── List teams ────────────────────────────────────────────────────────────────

// GET /api/teams — teams the current user belongs to
router.get('/teams', authenticate, async (req, res, next) => {
  try {
    const rows = await db.any(
      `SELECT t.id, t.name, t.created_at, tm.role AS user_role,
              (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) AS member_count
         FROM teams t
         JOIN team_members tm ON tm.team_id = t.id AND tm.user_id = $1
        ORDER BY t.created_at DESC`,
      [req.user.id]
    )
    res.json({ teams: rows })
  } catch (err) {
    next(err)
  }
})

// ── Create team ───────────────────────────────────────────────────────────────

// POST /api/teams — create a new team; caller becomes owner
router.post('/teams', authenticate, validate({ body: CreateTeamBody }), async (req, res, next) => {
  try {
    const { name } = req.body

    const team = await db.tx(async t => {
      const newTeam = await t.one(
        'INSERT INTO teams (name, created_by) VALUES ($1, $2) RETURNING *',
        [name.trim(), req.user.id]
      )
      await t.none(
        'INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3)',
        [newTeam.id, req.user.id, 'owner']
      )
      return newTeam
    })

    logger.info({ teamId: team.id, userId: req.user.id }, 'team created')
    res.status(201).json({ team: { ...team, user_role: 'owner', member_count: 1 } })
  } catch (err) {
    next(err)
  }
})

// ── Get team ──────────────────────────────────────────────────────────────────

// GET /api/teams/:teamId — team details + member list
router.get('/teams/:teamId', authenticate, requireMembership, async (req, res, next) => {
  try {
    const { teamId } = req.params

    const [team, members, invites] = await Promise.all([
      db.one('SELECT * FROM teams WHERE id = $1', [teamId]),
      db.any(
        `SELECT tm.id, tm.role, tm.joined_at,
                u.id AS user_id, u.name, u.email
           FROM team_members tm
           JOIN users u ON u.id = tm.user_id
          WHERE tm.team_id = $1
          ORDER BY
            CASE tm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,
            tm.joined_at`,
        [teamId]
      ),
      db.any(
        `SELECT id, email, role, created_at, expires_at
           FROM team_invites
          WHERE team_id = $1
            AND accepted_at IS NULL
            AND expires_at > now()
          ORDER BY created_at DESC`,
        [teamId]
      ),
    ])

    res.json({
      team: {
        ...team,
        user_role: req.membership?.role ?? null,
        members,
        pending_invites: invites,
      },
    })
  } catch (err) {
    next(err)
  }
})

// ── Current user's permissions for a team ────────────────────────────────────

// GET /api/teams/:teamId/me/permissions — effective permissions for the calling user
router.get('/teams/:teamId/me/permissions', authenticate, requireMembership, (req, res) => {
  const role        = req.membership?.role ?? null
  const permissions = getPermissions(role)
  res.json({ role, permissions })
})

// ── Update team ───────────────────────────────────────────────────────────────

// PATCH /api/teams/:teamId — rename team
router.patch(
  '/teams/:teamId',
  authenticate,
  requireMembership,
  requireAdminRole,
  validate({ body: UpdateTeamBody }),
  async (req, res, next) => {
    try {
      const { teamId } = req.params
      const { name }   = req.body

      if (!name?.trim()) return res.status(400).json({ message: 'Name is required' })

      const team = await db.one(
        'UPDATE teams SET name = $2, updated_at = now() WHERE id = $1 RETURNING *',
        [teamId, name.trim()]
      )

      res.json({ team })
    } catch (err) {
      next(err)
    }
  }
)

// ── Delete team ───────────────────────────────────────────────────────────────

// DELETE /api/teams/:teamId — only the owner can delete
router.delete(
  '/teams/:teamId',
  authenticate,
  requireMembership,
  requireOwnerRole,
  async (req, res, next) => {
    try {
      const { teamId } = req.params
      await db.none('DELETE FROM teams WHERE id = $1', [teamId])
      logger.info({ teamId, userId: req.user.id }, 'team deleted')
      res.status(204).end()
    } catch (err) {
      next(err)
    }
  }
)

// ── Invite management ─────────────────────────────────────────────────────────

// GET /api/teams/:teamId/invites — list pending invites
router.get(
  '/teams/:teamId/invites',
  authenticate,
  requireMembership,
  requireAdminRole,
  async (req, res, next) => {
    try {
      const rows = await db.any(
        `SELECT i.id, i.email, i.role, i.created_at, i.expires_at,
                u.name AS invited_by_name
           FROM team_invites i
           JOIN users u ON u.id = i.invited_by
          WHERE i.team_id     = $1
            AND i.accepted_at IS NULL
            AND i.expires_at  > now()
          ORDER BY i.created_at DESC`,
        [req.params.teamId]
      )
      res.json({ invites: rows })
    } catch (err) {
      next(err)
    }
  }
)

// POST /api/teams/:teamId/invites — invite a user by email
router.post(
  '/teams/:teamId/invites',
  authenticate,
  requireMembership,
  requireAdminRole,
  validate({ body: InviteMemberBody }),
  async (req, res, next) => {
    try {
      const { teamId } = req.params
      const { email, role = 'member' } = req.body
      const normalised = email.trim().toLowerCase()

      // Check if the user is already a member
      const existingUser = await db.oneOrNone(
        'SELECT id FROM users WHERE lower(email) = $1',
        [normalised]
      )
      if (existingUser) {
        const alreadyMember = await db.oneOrNone(
          'SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2',
          [teamId, existingUser.id]
        )
        if (alreadyMember) {
          return res.status(409).json({ message: 'User is already a member of this team' })
        }
      }

      // Cancel any existing pending invite for this email in this team
      await db.none(
        `UPDATE team_invites SET accepted_at = now()
          WHERE team_id = $1 AND email = $2 AND accepted_at IS NULL`,
        [teamId, normalised]
      )

      const token  = crypto.randomBytes(32).toString('hex')
      const invite = await db.one(
        `INSERT INTO team_invites (team_id, invited_by, email, role, token)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, email, role, created_at, expires_at`,
        [teamId, req.user.id, normalised, role, token]
      )

      logger.info({ teamId, email: normalised, role }, 'team invite created')

      // The token is returned in the response so the caller can send it however
      // they wish (email, in-app notification, etc.).
      res.status(201).json({ invite: { ...invite, token } })
    } catch (err) {
      next(err)
    }
  }
)

// DELETE /api/teams/:teamId/invites/:inviteId — cancel invite
router.delete(
  '/teams/:teamId/invites/:inviteId',
  authenticate,
  requireMembership,
  requireAdminRole,
  async (req, res, next) => {
    try {
      const { teamId, inviteId } = req.params
      const result = await db.result(
        'DELETE FROM team_invites WHERE id = $1 AND team_id = $2',
        [inviteId, teamId]
      )
      if (result.rowCount === 0) {
        return res.status(404).json({ message: 'Invite not found' })
      }
      res.status(204).end()
    } catch (err) {
      next(err)
    }
  }
)

// ── Accept invite ─────────────────────────────────────────────────────────────

// POST /api/invites/:token/accept — authenticated user accepts an invite
router.post('/invites/:token/accept', authenticate, async (req, res, next) => {
  try {
    const { token } = req.params

    const invite = await db.oneOrNone(
      `SELECT * FROM team_invites
        WHERE token       = $1
          AND accepted_at IS NULL
          AND expires_at  > now()`,
      [token]
    )

    if (!invite) {
      return res.status(400).json({ message: 'Invite is invalid or has expired' })
    }

    // The invite email should match the authenticated user's email
    if (invite.email !== req.user.email.toLowerCase()) {
      return res.status(403).json({ message: 'This invite was sent to a different email address' })
    }

    // Check if already a member (idempotent)
    const alreadyMember = await db.oneOrNone(
      'SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2',
      [invite.team_id, req.user.id]
    )

    if (!alreadyMember) {
      await db.tx(async t => {
        await t.none(
          'INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3)',
          [invite.team_id, req.user.id, invite.role]
        )
        await t.none(
          'UPDATE team_invites SET accepted_at = now() WHERE id = $1',
          [invite.id]
        )
      })
      logger.info({ teamId: invite.team_id, userId: req.user.id }, 'team invite accepted')
    }

    const team = await db.one('SELECT id, name FROM teams WHERE id = $1', [invite.team_id])
    res.json({ message: 'Invite accepted', team })
  } catch (err) {
    next(err)
  }
})

// ── Member management ─────────────────────────────────────────────────────────

// PATCH /api/teams/:teamId/members/:memberId — update a member's role (owner only)
router.patch(
  '/teams/:teamId/members/:memberId',
  authenticate,
  requireMembership,
  requireOwnerRole,
  validate({ body: UpdateMemberRoleBody }),
  async (req, res, next) => {
    try {
      const { teamId, memberId } = req.params
      const { role }             = req.body

      // Prevent the owner from changing their own role via this endpoint
      const target = await db.oneOrNone(
        'SELECT * FROM team_members WHERE id = $1 AND team_id = $2',
        [memberId, teamId]
      )
      if (!target) return res.status(404).json({ message: 'Member not found' })
      if (target.user_id === req.user.id && role !== 'owner') {
        return res.status(400).json({ message: 'Use the transfer ownership endpoint to change your own role' })
      }

      // If promoting someone to owner, demote the current owner to admin first
      if (role === 'owner') {
        await db.none(
          `UPDATE team_members SET role = 'admin'
            WHERE team_id = $1 AND user_id = $2`,
          [teamId, req.user.id]
        )
      }

      const updated = await db.one(
        'UPDATE team_members SET role = $3 WHERE id = $1 AND team_id = $2 RETURNING *',
        [memberId, teamId, role]
      )

      res.json({ member: updated })
    } catch (err) {
      next(err)
    }
  }
)

// DELETE /api/teams/:teamId/members/:memberId — remove a member
router.delete(
  '/teams/:teamId/members/:memberId',
  authenticate,
  requireMembership,
  async (req, res, next) => {
    try {
      const { teamId, memberId } = req.params

      const target = await db.oneOrNone(
        'SELECT * FROM team_members WHERE id = $1 AND team_id = $2',
        [memberId, teamId]
      )
      if (!target) return res.status(404).json({ message: 'Member not found' })

      const isSelf        = target.user_id === req.user.id
      const isAdminOrAbove = req.membership && ['owner', 'admin'].includes(req.membership.role)
      const isGlobalAdmin  = req.user.role === 'admin'

      // Allow self-removal, team admin/owner removal, or global admin
      if (!isSelf && !isAdminOrAbove && !isGlobalAdmin) {
        return res.status(403).json({ message: 'Insufficient permissions to remove this member' })
      }

      // Prevent removing the sole owner
      if (target.role === 'owner') {
        const ownerCount = await db.one(
          `SELECT COUNT(*) AS count FROM team_members WHERE team_id = $1 AND role = 'owner'`,
          [teamId]
        )
        if (parseInt(ownerCount.count, 10) <= 1) {
          return res.status(400).json({ message: 'Cannot remove the only owner. Transfer ownership first.' })
        }
      }

      await db.none('DELETE FROM team_members WHERE id = $1', [memberId])
      logger.info({ teamId, memberId, removedBy: req.user.id }, 'team member removed')
      res.status(204).end()
    } catch (err) {
      next(err)
    }
  }
)

module.exports = router
