# Teams & Collaboration

The template includes a complete team collaboration system with role-based access control, member management, and invitation workflows.

## Features

- ✅ **Team Management** - Create, update, delete teams
- ✅ **Member Management** - Add, remove, update member roles
- ✅ **Role-Based Access Control** - Owner, Admin, Member, Viewer roles
- ✅ **Granular Permissions** - Custom permissions per member
- ✅ **Invitation System** - Email-based team invitations with expiry
- ✅ **Activity Logging** - Complete audit trail of team actions
- ✅ **Multi-Team Support** - Users can be members of multiple teams

---

## Table of Contents

- [Database Schema](#database-schema)
- [Roles & Permissions](#roles--permissions)
- [API Endpoints](#api-endpoints)
- [Usage Examples](#usage-examples)
- [Frontend Integration](#frontend-integration)

---

## Database Schema

### Teams Table

```sql
CREATE TABLE teams (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  description     TEXT,
  owner_id        INTEGER NOT NULL REFERENCES users(id),
  settings        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Team Members Table

```sql
CREATE TABLE team_members (
  id              SERIAL PRIMARY KEY,
  team_id         INTEGER NOT NULL REFERENCES teams(id),
  user_id         INTEGER NOT NULL REFERENCES users(id),
  role            TEXT NOT NULL DEFAULT 'member',
  permissions     JSONB DEFAULT '[]',
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);
```

### Team Invitations Table

```sql
CREATE TABLE team_invitations (
  id              SERIAL PRIMARY KEY,
  team_id         INTEGER NOT NULL REFERENCES teams(id),
  email           TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'member',
  permissions     JSONB DEFAULT '[]',
  invited_by      INTEGER NOT NULL REFERENCES users(id),
  token           TEXT NOT NULL UNIQUE,
  expires_at      TIMESTAMPTZ NOT NULL,
  accepted_at     TIMESTAMPTZ,
  accepted_by     INTEGER REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Team Activity Log Table

```sql
CREATE TABLE team_activity_log (
  id              SERIAL PRIMARY KEY,
  team_id         INTEGER NOT NULL REFERENCES teams(id),
  user_id         INTEGER REFERENCES users(id),
  action          TEXT NOT NULL,
  details         JSONB DEFAULT '{}',
  ip_address      TEXT,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## Roles & Permissions

### Role Hierarchy

| Role | Level | Description |
|------|-------|-------------|
| **Owner** | 4 | Full control, cannot be removed |
| **Admin** | 3 | Manage members, settings, content |
| **Member** | 2 | Create and edit content |
| **Viewer** | 1 | Read-only access |

### Permission Matrix

| Permission | Viewer | Member | Admin | Owner |
|------------|--------|--------|-------|-------|
| `team.read` | ✅ | ✅ | ✅ | ✅ |
| `team.update` | ❌ | ❌ | ✅ | ✅ |
| `team.delete` | ❌ | ❌ | ❌ | ✅ |
| `members.read` | ✅ | ✅ | ✅ | ✅ |
| `members.invite` | ❌ | ❌ | ✅ | ✅ |
| `members.remove` | ❌ | ❌ | ✅ | ✅ |
| `members.update_role` | ❌ | ❌ | ✅ | ✅ |
| `invitations.read` | ❌ | ❌ | ✅ | ✅ |
| `invitations.revoke` | ❌ | ❌ | ✅ | ✅ |
| `content.create` | ❌ | ✅ | ✅ | ✅ |
| `content.update` | ❌ | ✅ | ✅ | ✅ |
| `content.delete` | ❌ | ❌ | ✅ | ✅ |
| `activity.read` | ❌ | ❌ | ✅ | ✅ |

### Custom Permissions

Members can have custom permissions beyond their role:

```javascript
// Example: Give a member specific permission
await req.db.teamMembers.update(teamId, userId, {
  permissions: ['content.delete', 'settings.update']
})
```

---

## API Endpoints

### Teams

#### `GET /api/teams`
List all teams for the authenticated user.

**Response:**
```json
{
  "teams": [
    {
      "id": 1,
      "name": "Acme Corp",
      "slug": "acme-corp",
      "description": "Main team",
      "owner_id": 42,
      "role": "owner",
      "permissions": [],
      "joined_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 1
}
```

#### `POST /api/teams`
Create a new team.

**Request:**
```json
{
  "name": "My Team",
  "description": "Team description",
  "settings": {}
}
```

**Response:**
```json
{
  "team": {
    "id": 1,
    "name": "My Team",
    "slug": "my-team",
    "description": "Team description",
    "owner_id": 42
  }
}
```

#### `GET /api/teams/:teamId`
Get team details.

**Response:**
```json
{
  "team": {
    "id": 1,
    "name": "My Team",
    "member_count": 5,
    "role_stats": {
      "owner": 1,
      "admin": 2,
      "member": 2
    },
    "user_role": "owner",
    "user_permissions": []
  }
}
```

#### `PATCH /api/teams/:teamId`
Update team (requires `team.update` permission).

**Request:**
```json
{
  "name": "Updated Name",
  "description": "New description"
}
```

#### `DELETE /api/teams/:teamId`
Delete team (owner only).

---

### Members

#### `GET /api/teams/:teamId/members`
List all team members (requires `members.read` permission).

**Response:**
```json
{
  "members": [
    {
      "id": 1,
      "user_id": 42,
      "email": "user@example.com",
      "name": "John Doe",
      "role": "owner",
      "permissions": [],
      "joined_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### `PATCH /api/teams/:teamId/members/:userId`
Update member role/permissions (requires `members.update_role` permission).

**Request:**
```json
{
  "role": "admin",
  "permissions": []
}
```

**Rules:**
- Cannot modify yourself
- Cannot modify team owner
- Cannot assign role higher than your own
- Cannot modify someone with higher role

#### `DELETE /api/teams/:teamId/members/:userId`
Remove member from team (requires `members.remove` permission).

**Rules:**
- Cannot remove yourself (use `/leave` endpoint)
- Cannot remove team owner
- Cannot remove someone with higher role

#### `POST /api/teams/:teamId/members/leave`
Leave a team.

**Note:** Team owner cannot leave. Transfer ownership or delete the team first.

---

### Invitations

#### `GET /api/teams/:teamId/invitations`
List team invitations (requires `invitations.read` permission).

**Query Params:**
- `includeExpired` - Include expired invitations (default: false)

**Response:**
```json
{
  "invitations": [
    {
      "id": 1,
      "email": "newuser@example.com",
      "role": "member",
      "invited_by": 42,
      "inviter_name": "John Doe",
      "expires_at": "2024-01-08T00:00:00Z",
      "accepted_at": null
    }
  ]
}
```

#### `POST /api/teams/:teamId/invitations`
Invite a user to the team (requires `members.invite` permission).

**Request:**
```json
{
  "email": "newuser@example.com",
  "role": "member",
  "permissions": [],
  "expiresInDays": 7
}
```

**Rules:**
- Cannot invite yourself
- Cannot invite with role higher than your own
- User cannot already be a member
- No pending invitation for same email

#### `POST /api/teams/:teamId/invitations/:invitationId/resend`
Resend invitation email (requires `invitations.resend` permission).

#### `DELETE /api/teams/:teamId/invitations/:invitationId`
Revoke invitation (requires `invitations.revoke` permission).

#### `POST /api/invitations/accept/:token`
Accept a team invitation (authenticated).

**Response:**
```json
{
  "success": true,
  "team": { /* team details */ },
  "role": "member"
}
```

#### `GET /api/invitations/pending`
Get pending invitations for current user (authenticated).

**Response:**
```json
{
  "invitations": [
    {
      "id": 1,
      "team_name": "Acme Corp",
      "team_slug": "acme-corp",
      "role": "member",
      "inviter_name": "John Doe",
      "inviter_email": "john@example.com",
      "expires_at": "2024-01-08T00:00:00Z",
      "token": "abc123..."
    }
  ]
}
```

**Note:** This endpoint is automatically called by the `useTeamInvitations()` hook and displayed on the Teams page.

---

### Activity Log

#### `GET /api/teams/:teamId/activity`
Get team activity log (requires `activity.read` permission).

**Query Params:**
- `limit` - Number of records (default: 50)
- `offset` - Pagination offset
- `action` - Filter by action type
- `user_id` - Filter by user

**Response:**
```json
{
  "activities": [
    {
      "id": 1,
      "action": "member.joined",
      "user_name": "Jane Smith",
      "details": { "role": "member", "via": "invitation" },
      "ip_address": "192.168.1.1",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 100,
  "limit": 50,
  "offset": 0
}
```

#### `GET /api/teams/:teamId/activity/recent`
Get recent activity (requires `activity.read` permission).

**Query Params:**
- `limit` - Number of records (default: 10)

---

## Usage Examples

### Creating a Team

```javascript
const response = await fetch('/api/teams', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken
  },
  credentials: 'include',
  body: JSON.stringify({
    name: 'My Team',
    description: 'A great team'
  })
})

const { team } = await response.json()
```

### Inviting a Member

```javascript
const response = await fetch(`/api/teams/${teamId}/invitations`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken
  },
  credentials: 'include',
  body: JSON.stringify({
    email: 'newmember@example.com',
    role: 'member'
  })
})

const { invitation } = await response.json()
```

### Accepting an Invitation

```javascript
const response = await fetch(`/api/invitations/accept/${token}`, {
  method: 'POST',
  headers: {
    'X-CSRF-Token': csrfToken
  },
  credentials: 'include'
})

const { team, role } = await response.json()
```

### Checking Permissions in Custom Code

```javascript
const { requireTeamMembership } = require('./lib/@system/permissions')

// Require minimum role
router.get('/api/teams/:teamId/sensitive-data',
  authenticate,
  requireTeamMembership({ minRole: 'admin' }),
  async (req, res) => {
    // Only admins and owners can access this
    res.json({ data: '...' })
  }
)

// Require specific permission
router.delete('/api/teams/:teamId/content/:id',
  authenticate,
  requireTeamMembership({ permission: 'content.delete' }),
  async (req, res) => {
    // User must have content.delete permission
    await deleteContent(req.params.id)
    res.json({ success: true })
  }
)

// Manual permission check
const { hasPermission } = require('./lib/@system/permissions')

if (hasPermission(req.teamRole, 'content.delete', req.teamPermissions)) {
  // User can delete content
}
```

---

## Frontend Integration

### React Context

Create a Teams context for global state:

```jsx
// context/TeamsContext.jsx
import { createContext, useContext, useState, useEffect } from 'react'

const TeamsContext = createContext()

export function TeamsProvider({ children }) {
  const [teams, setTeams] = useState([])
  const [currentTeam, setCurrentTeam] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTeams()
  }, [])

  async function fetchTeams() {
    const response = await fetch('/api/teams', { credentials: 'include' })
    const data = await response.json()
    setTeams(data.teams)
    setLoading(false)
  }

  return (
    <TeamsContext.Provider value={{ teams, currentTeam, setCurrentTeam, loading, fetchTeams }}>
      {children}
    </TeamsContext.Provider>
  )
}

export const useTeams = () => useContext(TeamsContext)
```

### Team Selector Component

```jsx
// components/TeamSelector.jsx
import { useTeams } from '../context/TeamsContext'

export function TeamSelector() {
  const { teams, currentTeam, setCurrentTeam } = useTeams()

  return (
    <select
      value={currentTeam?.id || ''}
      onChange={(e) => setCurrentTeam(teams.find(t => t.id === parseInt(e.target.value)))}
    >
      <option value="">Select a team</option>
      {teams.map(team => (
        <option key={team.id} value={team.id}>
          {team.name}
        </option>
      ))}
    </select>
  )
}
```

### Permission Hook

```jsx
// hooks/useTeamPermission.js
import { useTeams } from '../context/TeamsContext'

export function useTeamPermission(permission) {
  const { currentTeam } = useTeams()
  
  if (!currentTeam) return false
  
  const role = currentTeam.role
  const customPermissions = currentTeam.permissions || []
  
  return hasPermission(role, permission, customPermissions)
}

// Client-side permission check (replicate backend logic)
function hasPermission(role, permission, customPermissions) {
  if (customPermissions.includes(permission)) return true
  
  const PERMISSIONS = {
    'team.update': ['admin', 'owner'],
    'members.invite': ['admin', 'owner'],
    // ... other permissions
  }
  
  return PERMISSIONS[permission]?.includes(role) || false
}
```

### Usage in Components

```jsx
import { useTeamPermission } from '../hooks/useTeamPermission'

export function TeamSettings() {
  const canUpdate = useTeamPermission('team.update')
  const canInvite = useTeamPermission('members.invite')
  
  return (
    <div>
      {canUpdate && (
        <button>Edit Team</button>
      )}
      {canInvite && (
        <button>Invite Member</button>
      )}
    </div>
  )
}
```

### Pending Invitations Hook

```jsx
// hooks/@custom/useTeamInvitations.js
import { useTeamInvitations } from '../hooks/@custom/useTeamInvitations'

export function MyComponent() {
  const {
    invitations,        // Array of pending invitations
    invitationCount,    // Number of pending invitations
    loading,            // Loading state
    error,              // Error message if any
    refresh,            // Function to refresh invitations
    acceptInvitation,   // Function to accept an invitation
  } = useTeamInvitations()

  return (
    <div>
      {invitationCount > 0 && (
        <span className="badge">{invitationCount} pending</span>
      )}
    </div>
  )
}
```

### Pending Invitations Component

```jsx
// Display pending invitations on Teams page
import { PendingInvitations } from '../../components/@system/Teams'

export function TeamsPage() {
  return (
    <div>
      <PendingInvitations onInvitationAccepted={() => {
        // Refresh teams list or navigate
        console.log('Invitation accepted!')
      }} />
    </div>
  )
}
```

### Invitation Notification Badge

```jsx
// Show notification badge in navigation
import { InvitationBadge } from '../../components/@system/Teams'

export function Navigation() {
  return (
    <nav>
      <a href="/app/teams">
        Teams
        <InvitationBadge className="ml-2" />
      </a>
    </nav>
  )
}
```

---

## Activity Actions

The following actions are logged to the activity log:

- `team.created` - Team was created
- `team.updated` - Team details were updated
- `member.added` - Member was added directly
- `member.joined` - Member joined via invitation
- `member.role_updated` - Member role or permissions changed
- `member.removed` - Member was removed
- `member.left` - Member left voluntarily
- `invitation.sent` - Invitation was sent
- `invitation.resent` - Invitation was resent
- `invitation.revoked` - Invitation was revoked

---

## Security Considerations

1. **Email Verification**: Ensure users have verified email before accepting invitations
2. **Rate Limiting**: Apply rate limits to invitation endpoints to prevent spam
3. **Token Expiry**: Invitations expire after 7 days by default
4. **Audit Logging**: All team actions are logged with IP and user agent
5. **Role Hierarchy**: Lower roles cannot modify higher roles
6. **Owner Protection**: Team owner cannot be removed or demoted

---

## Database Cleanup

Schedule periodic cleanup of expired invitations:

```javascript
// scheduler/tasks/@custom/cleanup-invitations.js
module.exports = async () => {
  const { db } = require('../../../lib/@system/PostgreSQL')
  const TeamInvitationsRepository = require('../../../db/repos/@system/team-invitations')
  const repo = new TeamInvitationsRepository(db)
  
  const count = await repo.cleanupExpired()
  console.log(`Cleaned up ${count} expired invitations`)
}
```

---

## Extending the System

### Adding New Roles

Edit `server/src/lib/@system/permissions.js`:

```javascript
const ROLE_HIERARCHY = {
  viewer: 1,
  member: 2,
  moderator: 3,  // New role
  admin: 4,
  owner: 5
}
```

### Adding New Permissions

```javascript
const PERMISSIONS = {
  // ... existing permissions
  'analytics.view': ['admin', 'owner'],
  'billing.manage': ['owner']
}
```

### Custom Permission Logic

For complex scenarios, implement custom checks:

```javascript
// Custom middleware
function requireTeamBilling(req, res, next) {
  const team = await req.db.teams.findById(req.params.teamId)
  
  if (team.settings.billingEnabled && req.teamRole !== 'owner') {
    return res.status(403).json({ error: 'Only owner can manage billing' })
  }
  
  next()
}
```

---

## Testing

Example tests for teams API:

```javascript
// __tests__/teams.test.js
describe('Teams API', () => {
  test('should create team', async () => {
    const response = await request(app)
      .post('/api/teams')
      .set('Cookie', authCookie)
      .send({ name: 'Test Team' })
    
    expect(response.status).toBe(201)
    expect(response.body.team.name).toBe('Test Team')
  })
  
  test('should not allow member to remove admin', async () => {
    const response = await request(app)
      .delete(`/api/teams/${teamId}/members/${adminId}`)
      .set('Cookie', memberCookie)
    
    expect(response.status).toBe(403)
  })
})
```

---

## Migration

To apply the teams schema:

```bash
cd server
npm run migrate
```

The migration file is located at:
`server/src/db/migrations/@system/20240308000000_add_teams.sql`

---

## Support

For questions or issues with the teams system, see:
- [GitHub Issues](https://github.com/assimetria-ai/product-template/issues)
- [Documentation](https://docs.openclaw.ai)
- #product-template channel (Discord)
