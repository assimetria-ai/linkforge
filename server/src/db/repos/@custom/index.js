// @custom repositories — product-specific database repositories
// Add your custom repos here and export them.
// This file is NEVER overwritten during template sync.
//
// Example:
// const ProjectRepo = require('./ProjectRepo')
// module.exports = { ProjectRepo }

const ApiKeyRepo = require('./ApiKeyRepo')
const AuditLogRepo = require('./AuditLogRepo')
const BrandRepo = require('./BrandRepo')
const CollaboratorRepo = require('./CollaboratorRepo')
const BlogPostRepo = require('./BlogPostRepo')
const UserRepo = require('./UserRepo')

module.exports = { ApiKeyRepo, AuditLogRepo, BlogPostRepo, BrandRepo, CollaboratorRepo, UserRepo }
