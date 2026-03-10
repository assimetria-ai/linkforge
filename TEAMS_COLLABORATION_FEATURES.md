# Teams & Collaboration Features

This document describes the team management and permissions system added to the product template.

## Overview

The template now supports **multi-tenant team/workspace management** with granular permissions. Users can:

- Create and join multiple teams/workspaces
- Invite members to teams with role-based access
- Manage team members and permissions
- Switch between different teams

## Database Schema

### New Tables

#### `teams`
Represents workspaces/organizations that users can create and own.

- `id` - Primary key
- `name` - Team name
- `slug` - URL-friendly identifier (e.g., 'acme-corp')
- `description` - Optional description
- `avatar_url` - Team avatar/logo
- `owner_id` - User who owns the team
- `settings` - JSONB for team-specific settings
- Soft delete support with `deleted_at`

#### `team_members`
Many-to-many relationship between users and teams.

- `id` - Primary key
- `team_id` - Reference to team
- `user_id` - Reference to user
- `role` - Member role: 'owner', 'admin', 'member', 'viewer'
- `permissions` - JSONB for granular permission overrides
- `joined_at` - When the user joined the team

#### `team_invitations`
Pending invitations scoped to specific teams.

- `id` - Primary key
- `team_id` - Team the invitation is for
- `email` - Invitee email
- `role` - Role they'll receive on acceptance
- `invite_token` - Unique token for the invitation link
- `invited_by` - User who sent the invitation
- `status` - 'pending', 'accepted', 'expired', 'revoked'
- `expires_at` - Invitation expiry (default: 7 days)

#### `permissions`
Registry of all available granular permissions.

- `id` - Primary key
- `name` - Permission identifier (e.g., 'billing.manage')
- `description` - Human-readable description
- `category` - Permission category ('team', 'members', 'billing', 'content', etc.)

#### `role_permissions`
Default permissions for each role.

- Maps roles ('owner', 'admin', 'member', 'viewer') to permissions
- Owner gets all permissions by default
- Other roles have restricted sets

#### `user_permissions`
Per-user permission overrides.

- Allows granting or revoking specific permissions for individual users
- Can be scoped to a specific team or global
- Overrides role-based permissions

## Default Permissions

The system includes the following default permissions:

### Team Management
- `team.settings.manage` - Manage team settings and details
- `team.delete` - Delete the team

### Member Management
- `members.invite` - Invite new team members
- `members.remove` - Remove team members
- `members.roles.edit` - Change member roles
- `members.view` - View team members list

### Billing
- `billing.view` - View billing and subscription details
- `billing.manage` - Manage billing, payment methods, and subscriptions

### Content
- `content.create` - Create new content/resources
- `content.edit` - Edit existing content/resources
- `content.delete` - Delete content/resources
- `content.view` - View content/resources

### API Keys
- `api_keys.create` - Create API keys
- `api_keys.view` - View API keys
- `api_keys.delete` - Delete API keys

### Audit
- `audit.view` - View audit logs

## Role Hierarchy

1. **Owner** - Full access to everything (all permissions)
2. **Admin** - Most permissions except team deletion and billing management
3. **Member** - Can manage content and view members
4. **Viewer** - Read-only access to content and members

## API Endpoints

### Teams

```
GET    /teams                    - List teams the user belongs to
POST   /teams                    - Create a new team
GET    /teams/:id                - Get team details
PATCH  /teams/:id                - Update team details
DELETE /teams/:id                - Soft delete team
```

### Team Members

```
GET    /teams/:team_id/members                     - List team members
DELETE /teams/:team_id/members/:user_id            - Remove member
PATCH  /teams/:team_id/members/:user_id/role       - Update member role
```

### Team Invitations

```
GET    /teams/:team_id/invitations                 - List team invitations
POST   /teams/:team_id/invitations                 - Invite member to team
POST   /teams/invitations/:token/accept            - Accept team invitation
DELETE /teams/:team_id/invitations/:token          - Revoke invitation
```

### Permissions

```
GET    /teams/:team_id/permissions/me              - Get my permissions in this team
```

## Client Components

### Pages

- **TeamsPage** (`/app/teams`) - List all teams the user belongs to, create new teams
- **TeamDetailPage** (`/app/teams/:id`) - View team members, manage invitations, update roles

### API Client

The `teamsApi` client (`app/lib/@custom/teams.js`) provides methods for all team-related operations:

```javascript
import { teamsApi } from '../lib/@custom/teams'

// List teams
const { teams } = await teamsApi.list()

// Create team
const { team } = await teamsApi.create({ name: 'Acme Inc', description: '...' })

// Invite member
const { invitation, invite_token } = await teamsApi.inviteMember(teamId, {
  email: 'user@example.com',
  role: 'member',
  name: 'John Doe'
})

// Get my permissions
const { permissions, role } = await teamsApi.getMyPermissions(teamId)
```

## Permission Checking

### Server-Side

Use the `requireTeamPermission` middleware:

```javascript
router.patch(
  '/teams/:id',
  authenticate,
  requireTeamPermission('team.settings.manage'),
  async (req, res, next) => {
    // Handler code
  }
)
```

Or check permissions programmatically:

```javascript
const hasPermission = await PermissionRepo.checkUserPermission(
  userId,
  'members.invite',
  teamId
)
```

### Client-Side

Check permissions received from the API:

```javascript
const { permissions } = await teamsApi.getMyPermissions(teamId)
const canInvite = permissions.includes('members.invite')
```

## Usage Examples

### Creating a Team

1. User clicks "Create Team" on the Teams page
2. Fills in team name and description
3. System generates a unique slug from the name
4. User is automatically added as the owner
5. Redirected to the team detail page

### Inviting Members

1. Team owner/admin navigates to team detail page
2. Clicks "Invite Member"
3. Enters email, optional name, and selects role
4. System generates invite token and returns invite URL
5. Invitee clicks the link and accepts the invitation
6. They're added to the team with the specified role

### Permission Overrides

Individual users can have permissions granted or revoked:

```javascript
// Grant a specific permission
await PermissionRepo.grantUserPermission(userId, 'billing.manage', teamId)

// Revoke a permission
await PermissionRepo.revokeUserPermission(userId, 'members.remove', teamId)
```

## Migrations

Run migrations to create the new tables:

```bash
npm run db:migrate
```

New migrations:
- `015_teams.js` - Creates teams, team_members, team_invitations tables
- `016_permissions.js` - Creates permissions, role_permissions, user_permissions tables

## Integration with Existing Collaborators

The existing `collaborators` table remains for backwards compatibility. It represents workspace-level collaborators that are not scoped to specific teams.

To fully integrate:
1. Consider migrating existing collaborators to team members
2. Or keep both systems for different use cases (workspace-level vs team-level access)

## Future Enhancements

- Team billing and subscription management
- Team-scoped resources (content, API keys, etc.)
- Team activity logs and audit trail
- Team switcher component in the header
- Team settings page (branding, integrations, etc.)
- Permission groups/presets
- Custom roles beyond the default 4

## Security Considerations

- All team operations require authentication
- Permission checks happen on every sensitive operation
- Invitations expire after 7 days
- Soft deletes preserve data integrity
- Owner role cannot be removed if they're the last owner
- Users can only see teams they're members of
