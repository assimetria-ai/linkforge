/**
 * @system Database Middleware
 * Attaches database repositories to req.db for easy access
 */

const db = require('../PostgreSQL')
const TeamRepo = require('../../../db/repos/@system/TeamRepo')
const UserRepo = require('../../../db/repos/@system/UserRepo')

function tryRequire(path) {
  try {
    return require(path)
  } catch (_) {
    return null
  }
}

const TeamsRepository = tryRequire('../../../db/repos/@system/teams')
const TeamMembersRepository = tryRequire('../../../db/repos/@system/team-members')
const TeamInvitationsRepository = tryRequire('../../../db/repos/@system/team-invitations')
const TeamActivityLogRepository = tryRequire('../../../db/repos/@system/team-activity-log')

const teams = TeamsRepository ? new TeamsRepository(db) : TeamRepo
const teamMembers = TeamMembersRepository ? new TeamMembersRepository(db) : null
const teamInvitations = TeamInvitationsRepository ? new TeamInvitationsRepository(db) : null
const teamActivityLog = TeamActivityLogRepository ? new TeamActivityLogRepository(db) : null

/**
 * Database middleware - attaches repositories to req.db
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
function attachDatabase(req, res, next) {
  const repos = {
    db,
    teams,
    users: UserRepo,
  }

  if (teamMembers) repos.teamMembers = teamMembers
  if (teamInvitations) repos.teamInvitations = teamInvitations
  if (teamActivityLog) repos.teamActivityLog = teamActivityLog

  req.db = repos
  next()
}

module.exports = attachDatabase
