// @system repositories — shared database repositories

const UserRepo = require('./UserRepo')
const TeamRepo = require('./TeamRepo')
const CollaboratorRepo = require('./CollaboratorRepo')
const ApiKeyRepo = require('./ApiKeyRepo')
const EmailLogRepo = require('./EmailLogRepo')
const PermissionRepo = require('./PermissionRepo')
const AuditLogRepo = require('./AuditLogRepo')
const FileUploadRepo   = require('./FileUploadRepo')
const SubscriptionRepo = require('./SubscriptionRepo')

module.exports = {
  UserRepo,
  TeamRepo,
  CollaboratorRepo,
  ApiKeyRepo,
  EmailLogRepo,
  PermissionRepo,
  AuditLogRepo,
  FileUploadRepo,
  SubscriptionRepo,
}
