// @custom — workspace invitation & member management API
// Provides the canonical /api/workspaces/:id/invite and /api/workspace-members/:id endpoints
// These wrap the teams system (workspaces = teams in Linkforge)

const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const { authenticate } = require('../../../lib/@system/Helpers/auth')
const TeamRepo = require('../../../db/repos/@custom/TeamRepo')
const PermissionRepo = require('../../../db/repos/@custom/PermissionRepo')
const Email = require('../../../lib/@system/Email')
const logger = require('../../../lib/@system/Logger')

// JWT secret for invite tokens (falls back to app JWT keys)
const INVITE_SECRET = process.env.INVITE_JWT_SECRET || process.env.JWT_PRIVATE_KEY || 'linkforge-invite-secret'
const INVITE_EXPIRY = '7d'

// Permission middleware
const requireTeamPermission = (permission) => async (req, res, next) => {
  try {
    const team_id = parseInt(req.params.id || req.params.team_id, 10)
    if (!team_id || isNaN(team_id)) {
      return res.status(400).json({ message: 'Invalid workspace ID' })
    }
    const hasPermission = await PermissionRepo.checkUserPermission(req.user.id, permission, team_id)
    if (!hasPermission) {
      return res.status(403).json({ message: `Missing permission: ${permission}` })
    }
    req.team_id = team_id
    next()
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/workspaces/:id/invite
 * Invite a member to the workspace via email with JWT token
 */
router.post('/workspaces/:id/invite', authenticate, requireTeamPermission('members.invite'), async (req, res, next) => {
  try {
    const { id } = req.params
    const team_id = parseInt(id, 10)
    const { email, role = 'member', name } = req.body

    if (!email || email.trim().length === 0) {
      return res.status(400).json({ message: 'Email is required' })
    }

    const validRoles = ['admin', 'member']
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: `Invalid role. Must be one of: ${validRoles.join(', ')}` })
    }

    const emailLower = email.toLowerCase().trim()

    // Cannot invite yourself
    if (emailLower === req.user.email.toLowerCase()) {
      return res.status(400).json({ message: 'Cannot invite yourself' })
    }

    // Check if user is already a member
    const { db } = require('../../../db')
    const existingUser = await db.oneOrNone('SELECT id FROM users WHERE email = $1', [emailLower])
    if (existingUser) {
      const existingMember = await TeamRepo.findMember(team_id, existingUser.id)
      if (existingMember) {
        return res.status(409).json({ message: 'User is already a workspace member' })
      }
    }

    // Check for existing pending invitation
    const existingInvites = await TeamRepo.findInvitationsByTeam(team_id, { status: 'pending' })
    const alreadyInvited = existingInvites.find(inv => inv.email === emailLower)
    if (alreadyInvited) {
      return res.status(409).json({ message: 'User already has a pending invitation' })
    }

    // Generate JWT invite token
    const invite_token = jwt.sign(
      {
        type: 'workspace_invite',
        team_id,
        email: emailLower,
        role,
        invited_by: req.user.id,
      },
      INVITE_SECRET,
      { expiresIn: INVITE_EXPIRY }
    )

    // Create invitation record
    const invitation = await TeamRepo.createInvitation({
      team_id,
      email: emailLower,
      name: name?.trim() || null,
      role,
      invite_token,
      invited_by: req.user.id,
    })

    // Get team info for email
    const team = await TeamRepo.findById(team_id)

    // Send invitation email
    try {
      await Email.sendInvitationEmail({
        to: emailLower,
        inviterName: req.user.name || req.user.email,
        orgName: team.name,
        token: invite_token,
        role,
      })
    } catch (emailError) {
      logger.warn({ err: emailError, email: emailLower }, 'Failed to send invitation email (invitation still created)')
    }

    logger.info(
      { teamId: team_id, email: emailLower, role, invitedBy: req.user.id },
      'workspace invitation created with JWT token'
    )

    res.status(201).json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        name: invitation.name,
        role: invitation.role,
        status: invitation.status,
        created_at: invitation.created_at,
        expires_at: invitation.expires_at,
      },
      invite_link: `${process.env.CLIENT_URL || process.env.FRONTEND_URL || ''}/accept-invite?token=${invite_token}`,
    })
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/workspaces/accept-invite
 * Accept a workspace invitation using JWT token
 */
router.post('/workspaces/accept-invite', authenticate, async (req, res, next) => {
  try {
    const { token } = req.body

    if (!token) {
      return res.status(400).json({ message: 'Invitation token is required' })
    }

    // Verify JWT token
    let decoded
    try {
      decoded = jwt.verify(token, INVITE_SECRET)
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        return res.status(400).json({ message: 'Invitation has expired' })
      }
      return res.status(400).json({ message: 'Invalid invitation token' })
    }

    if (decoded.type !== 'workspace_invite') {
      return res.status(400).json({ message: 'Invalid token type' })
    }

    // Verify email matches
    if (req.user.email.toLowerCase() !== decoded.email) {
      return res.status(403).json({ message: 'This invitation was sent to a different email address' })
    }

    // Look up invitation in DB
    const invitation = await TeamRepo.findInvitationByToken(token)
    if (!invitation) {
      return res.status(404).json({ message: 'Invitation not found' })
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({ message: `Invitation has already been ${invitation.status}` })
    }

    // Check if already a member
    const existingMember = await TeamRepo.findMember(decoded.team_id, req.user.id)
    if (existingMember) {
      return res.status(400).json({ message: 'You are already a member of this workspace' })
    }

    // Accept invitation (adds member in transaction)
    const accepted = await TeamRepo.acceptInvitation(token, req.user.id)

    const team = await TeamRepo.findById(decoded.team_id)

    logger.info(
      { teamId: decoded.team_id, userId: req.user.id, role: decoded.role },
      'workspace invitation accepted'
    )

    res.json({
      success: true,
      workspace: { id: team.id, name: team.name, slug: team.slug },
      role: decoded.role,
    })
  } catch (err) {
    next(err)
  }
})

/**
 * PATCH /api/workspace-members/:id
 * Update a workspace member's role
 * :id here is the team_members.id (membership record ID)
 */
router.patch('/workspace-members/:id', authenticate, async (req, res, next) => {
  try {
    const membershipId = parseInt(req.params.id, 10)
    const { role } = req.body

    if (!role) {
      return res.status(400).json({ message: 'Role is required' })
    }

    const validRoles = ['owner', 'admin', 'member']
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: `Invalid role. Must be one of: ${validRoles.join(', ')}` })
    }

    // Find the membership record
    const { db } = require('../../../db')
    const membership = await db.oneOrNone('SELECT * FROM team_members WHERE id = $1', [membershipId])

    if (!membership) {
      return res.status(404).json({ message: 'Membership not found' })
    }

    // Check requester has permission
    const hasPermission = await PermissionRepo.checkUserPermission(
      req.user.id,
      'members.roles.edit',
      membership.team_id
    )

    if (!hasPermission) {
      return res.status(403).json({ message: 'Missing permission: members.roles.edit' })
    }

    // Cannot modify your own role
    if (membership.user_id === req.user.id) {
      return res.status(400).json({ message: 'Cannot modify your own role' })
    }

    // Cannot modify the team owner
    const team = await TeamRepo.findById(membership.team_id)
    if (team.owner_id === membership.user_id) {
      return res.status(400).json({ message: 'Cannot modify workspace owner role' })
    }

    // Update the role
    const updated = await db.one(
      'UPDATE team_members SET role = $1, updated_at = now() WHERE id = $2 RETURNING *',
      [role, membershipId]
    )

    // Get user info for response
    const userInfo = await db.oneOrNone(
      'SELECT id, name, email, avatar_url FROM users WHERE id = $1',
      [updated.user_id]
    )

    logger.info(
      { membershipId, teamId: membership.team_id, userId: membership.user_id, newRole: role, updatedBy: req.user.id },
      'workspace member role updated'
    )

    res.json({
      member: {
        id: updated.id,
        team_id: updated.team_id,
        user_id: updated.user_id,
        role: updated.role,
        user_name: userInfo?.name,
        email: userInfo?.email,
        updated_at: updated.updated_at,
      },
    })
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/workspaces/:id/members
 * List workspace members
 */
router.get('/workspaces/:id/members', authenticate, requireTeamPermission('members.view'), async (req, res, next) => {
  try {
    const team_id = parseInt(req.params.id, 10)
    const { limit = 50, offset = 0 } = req.query

    const members = await TeamRepo.findMembersByTeam(team_id, {
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    })

    const total = await TeamRepo.countMembers(team_id)

    res.json({ members, total })
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/workspaces/:id/invitations
 * List pending invitations for a workspace
 */
router.get('/workspaces/:id/invitations', authenticate, requireTeamPermission('members.view'), async (req, res, next) => {
  try {
    const team_id = parseInt(req.params.id, 10)
    const invitations = await TeamRepo.findInvitationsByTeam(team_id, { status: 'pending' })

    res.json({ invitations })
  } catch (err) {
    next(err)
  }
})

/**
 * DELETE /api/workspaces/:id/invitations/:invitationId
 * Revoke a workspace invitation
 */
router.delete('/workspaces/:id/invitations/:invitationId', authenticate, requireTeamPermission('members.invite'), async (req, res, next) => {
  try {
    const { invitationId } = req.params

    const invitation = await require('../../../db').db.oneOrNone(
      'SELECT * FROM team_invitations WHERE id = $1',
      [invitationId]
    )

    if (!invitation) {
      return res.status(404).json({ message: 'Invitation not found' })
    }

    const revoked = await TeamRepo.revokeInvitation(invitation.invite_token)

    res.json({ success: true, invitation: revoked })
  } catch (err) {
    next(err)
  }
})

module.exports = router
