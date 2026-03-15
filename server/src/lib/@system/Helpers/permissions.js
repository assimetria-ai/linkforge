// @system — team role permissions
//
// Defines the capabilities granted to each team role.  Import this module
// wherever you need to gate logic on what a team member is allowed to do.
//
// Usage:
//   const { hasPermission, getPermissions } = require('./permissions')
//   if (!hasPermission(req.membership.role, 'members:invite')) {
//     return res.status(403).json({ message: 'Insufficient permissions' })
//   }

'use strict'

/**
 * Human-readable labels for every permission key.
 * Returned by the permissions-matrix endpoint so clients can display them.
 */
const PERMISSION_LABELS = {
  'team:view':             'View team details and members',
  'team:update':           'Rename and update team settings',
  'team:delete':           'Delete the team permanently',
  'members:invite':        'Invite new members',
  'members:remove':        'Remove members from the team',
  'members:change_role':   'Change member roles (owner only)',
  'invites:view':          'View pending invitations',
  'invites:cancel':        'Cancel pending invitations',
}

/**
 * Capabilities granted to each team role.
 * Roles are hierarchical: owner ⊃ admin ⊃ member.
 */
const TEAM_ROLE_PERMISSIONS = {
  owner: [
    'team:view',
    'team:update',
    'team:delete',
    'members:invite',
    'members:remove',
    'members:change_role',
    'invites:view',
    'invites:cancel',
  ],
  admin: [
    'team:view',
    'team:update',
    'members:invite',
    'members:remove',
    'invites:view',
    'invites:cancel',
  ],
  member: [
    'team:view',
  ],
}

/**
 * Returns the permission keys granted to a role.
 * Returns [] for unknown roles.
 *
 * @param {string} role — 'owner' | 'admin' | 'member'
 * @returns {string[]}
 */
function getPermissions(role) {
  return TEAM_ROLE_PERMISSIONS[role] ?? []
}

/**
 * Returns true if the role has the given permission.
 *
 * @param {string} role
 * @param {string} permission — e.g. 'members:invite'
 * @returns {boolean}
 */
function hasPermission(role, permission) {
  return getPermissions(role).includes(permission)
}

/**
 * Returns a serialisable matrix suitable for API responses:
 * [{ role, permissions: [{ key, label }] }, ...]
 */
function buildPermissionsMatrix() {
  return Object.entries(TEAM_ROLE_PERMISSIONS).map(([role, keys]) => ({
    role,
    permissions: keys.map(key => ({ key, label: PERMISSION_LABELS[key] ?? key })),
  }))
}

/**
 * Returns all defined permission keys with labels.
 * Useful for building comparison tables in the UI.
 */
function allPermissions() {
  return Object.entries(PERMISSION_LABELS).map(([key, label]) => ({ key, label }))
}

module.exports = {
  TEAM_ROLE_PERMISSIONS,
  PERMISSION_LABELS,
  getPermissions,
  hasPermission,
  buildPermissionsMatrix,
  allPermissions,
}
