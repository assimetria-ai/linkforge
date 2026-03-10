# Teams & Collaboration Integration Guide

Complete guide for implementing team collaboration features in your product.

## 🎯 Quick Start

### 1. Database Migration

The teams schema is already in the database migrations:

```bash
cd server
npm run migrate
```

This creates 4 tables:
- `teams` - Team information
- `team_members` - User memberships with roles
- `team_invitations` - Email invitations
- `team_activity_log` - Audit trail

### 2. Add Routes to Your App

```javascript
// client/src/App.jsx
import { TeamsPage } from './pages/app/TeamsPage'
import { TeamDetailPage } from './pages/app/TeamDetailPage'

// Add to your routes:
<Route path="/app/teams" element={<TeamsPage />} />
<Route path="/app/teams/:teamId" element={<TeamDetailPage />} />
```

### 3. Add Navigation Link

```javascript
// In your sidebar/navigation
<Link to="/app/teams">Teams</Link>
```

Done! Your teams system is now live.

---

## 📦 What's Included

### Backend (Already Implemented)

✅ **Teams API** (`/api/teams`)
- Create, read, update, delete teams
- List user's teams
- Team slug generation

✅ **Members API** (`/api/teams/:teamId/members`)
- List members
- Update member roles
- Remove members
- Leave team

✅ **Invitations API** (`/api/teams/:teamId/invitations`)
- Send email invitations
- Accept/reject invitations
- Revoke pending invitations
- List pending invitations

✅ **Activity Log** (`/api/teams/:teamId/activity`)
- Audit trail of all team actions
- IP address and user agent tracking

✅ **Permissions System**
- Role-based access control (Owner, Admin, Member, Viewer)
- Granular custom permissions
- Middleware helpers

### Frontend (New Components)

✅ **TeamList** - Display user's teams with create option
✅ **MemberList** - Manage team members and roles
✅ **InvitationManager** - Send and manage invitations
✅ **CreateTeamModal** - Modal for creating teams
✅ **TeamsPage** - Main teams dashboard
✅ **TeamDetailPage** - Detailed team view with tabs

---

## 🔧 Component Usage

### TeamList Component

```jsx
import { TeamList } from '../components/@system/Teams'

function MyTeamsPage() {
  return (
    <TeamList
      onTeamSelect={(team) => navigate(`/teams/${team.id}`)}
      onCreateTeam={() => setShowModal(true)}
    />
  )
}
```

**Props:**
- `onTeamSelect(team)` - Called when user clicks a team
- `onCreateTeam()` - Called when user clicks "Create Team"

### MemberList Component

```jsx
import { MemberList } from '../components/@system/Teams'

function TeamMembersTab() {
  return (
    <MemberList
      teamId={teamId}
      userRole="admin" // Current user's role
      onInviteMember={() => switchToInviteTab()}
    />
  )
}
```

**Props:**
- `teamId` - The team ID
- `userRole` - Current user's role ('owner', 'admin', 'member', 'viewer')
- `onInviteMember()` - Called when "Invite Member" button clicked

### InvitationManager Component

```jsx
import { InvitationManager } from '../components/@system/Teams'

function TeamInvitationsTab() {
  return (
    <InvitationManager
      teamId={teamId}
      userRole="admin"
    />
  )
}
```

**Props:**
- `teamId` - The team ID
- `userRole` - Current user's role (only admins/owners see this)

### CreateTeamModal Component

```jsx
import { CreateTeamModal } from '../components/@system/Teams'

function MyPage() {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <Button onClick={() => setShowModal(true)}>
        Create Team
      </Button>

      <CreateTeamModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onTeamCreated={(team) => navigate(`/teams/${team.id}`)}
      />
    </>
  )
}
```

**Props:**
- `isOpen` - Boolean to show/hide modal
- `onClose()` - Called when modal closes
- `onTeamCreated(team)` - Called when team created successfully

---

## 🎨 Customization

### Styling

All components use Tailwind CSS classes. You can customize by:

1. **Override classes directly:**
```jsx
<TeamList className="custom-class" />
```

2. **Modify the components:**
```javascript
// Copy component to your @custom folder
client/src/app/components/@custom/Teams/TeamList.jsx

// Customize as needed
```

### Adding Custom Fields

**Backend:**
```javascript
// server/src/db/migrations/@custom/003_custom_team_fields.js
exports.up = async function(knex) {
  await knex.schema.table('teams', (table) => {
    table.text('logo_url')
    table.text('website')
  })
}
```

**Frontend:**
```jsx
// Update CreateTeamModal.jsx
<input
  type="url"
  placeholder="Team logo URL"
  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
/>
```

### Custom Roles

Add new roles in `server/src/lib/@system/permissions.js`:

```javascript
const ROLE_HIERARCHY = {
  viewer: 1,
  member: 2,
  moderator: 3,  // New role
  admin: 4,
  owner: 5
}

const PERMISSIONS = {
  'content.moderate': ['moderator', 'admin', 'owner'],
  // ... other permissions
}
```

---

## 🔐 Permissions System

### Role Hierarchy

| Role | Level | Default Permissions |
|------|-------|---------------------|
| **Viewer** | 1 | Read-only access |
| **Member** | 2 | Create and edit content |
| **Admin** | 3 | Manage members, invites |
| **Owner** | 4 | Full control |

### Using Permissions in API Routes

```javascript
const { requireTeamMembership } = require('./lib/@system/permissions')

// Require specific permission
router.get('/api/teams/:teamId/data',
  authenticate,
  requireTeamMembership({ permission: 'content.read' }),
  async (req, res) => {
    // req.teamMember - Full member object
    // req.teamRole - User's role string
    // req.teamPermissions - Custom permissions array
    res.json({ data: '...' })
  }
)

// Require minimum role
router.post('/api/teams/:teamId/settings',
  authenticate,
  requireTeamMembership({ minRole: 'admin' }),
  async (req, res) => {
    // Only admins and owners can access
  }
)

// Owner only
router.delete('/api/teams/:teamId',
  authenticate,
  requireTeamOwner(),
  async (req, res) => {
    // Only team owner can delete
  }
)
```

### Using Permissions in Frontend

```jsx
function TeamContent({ teamRole }) {
  const canEdit = ['member', 'admin', 'owner'].includes(teamRole)
  const canDelete = ['admin', 'owner'].includes(teamRole)
  const canManageMembers = ['admin', 'owner'].includes(teamRole)

  return (
    <div>
      {canEdit && <Button>Edit</Button>}
      {canDelete && <Button>Delete</Button>}
      {canManageMembers && <Button>Manage Members</Button>}
    </div>
  )
}
```

Or create a hook:

```javascript
// hooks/useTeamPermission.js
export function useTeamPermission(teamRole, permission) {
  const PERMISSIONS = {
    'content.edit': ['member', 'admin', 'owner'],
    'content.delete': ['admin', 'owner'],
    'members.invite': ['admin', 'owner'],
  }

  return PERMISSIONS[permission]?.includes(teamRole) || false
}

// Usage
const canEdit = useTeamPermission(teamRole, 'content.edit')
```

---

## 📧 Email Invitations

### Configure Email Service

The invitation system uses the template's email system. Make sure it's configured:

```bash
# .env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
SMTP_FROM_EMAIL=noreply@yourapp.com
SMTP_FROM_NAME="Your App"
```

### Customize Invitation Email

```javascript
// server/src/lib/@system/Email/templates/team-invitation.js
module.exports = {
  subject: ({ teamName }) => `You've been invited to join ${teamName}`,
  
  html: ({ teamName, inviterName, role, acceptUrl }) => `
    <h1>Join ${teamName}</h1>
    <p>${inviterName} has invited you to join as a ${role}.</p>
    <a href="${acceptUrl}">Accept Invitation</a>
  `,

  text: ({ teamName, inviterName, role, acceptUrl }) => `
    ${inviterName} has invited you to join ${teamName} as a ${role}.
    Accept: ${acceptUrl}
  `
}
```

### Invitation Flow

1. **Admin sends invitation:**
```javascript
POST /api/teams/:teamId/invitations
{
  "email": "user@example.com",
  "role": "member"
}
```

2. **User receives email with token link:**
```
https://yourapp.com/invitations/accept?token=abc123...
```

3. **User accepts (must be logged in):**
```javascript
POST /api/invitations/accept/abc123...
```

4. **User is added to team**

---

## 🧪 Testing

### Backend Tests

```javascript
// __tests__/teams.test.js
describe('Teams API', () => {
  let authCookie, teamId

  beforeEach(async () => {
    // Create test user and get auth cookie
    authCookie = await createTestUser()
  })

  test('should create team', async () => {
    const res = await request(app)
      .post('/api/teams')
      .set('Cookie', authCookie)
      .send({ name: 'Test Team' })

    expect(res.status).toBe(201)
    expect(res.body.team.name).toBe('Test Team')
    teamId = res.body.team.id
  })

  test('should not allow member to remove admin', async () => {
    // Create team, add member and admin
    // Try to remove admin as member
    const res = await request(app)
      .delete(`/api/teams/${teamId}/members/${adminId}`)
      .set('Cookie', memberCookie)

    expect(res.status).toBe(403)
  })
})
```

### Frontend Tests

```javascript
// __tests__/TeamList.test.jsx
import { render, screen, waitFor } from '@testing-library/react'
import { TeamList } from '../components/@system/Teams'

jest.mock('../lib/@custom/teams', () => ({
  teamsApi: {
    list: jest.fn(() => Promise.resolve({
      teams: [
        { id: 1, name: 'Team 1', role: 'owner' },
        { id: 2, name: 'Team 2', role: 'member' },
      ]
    }))
  }
}))

test('renders team list', async () => {
  render(<TeamList />)
  
  await waitFor(() => {
    expect(screen.getByText('Team 1')).toBeInTheDocument()
    expect(screen.getByText('Team 2')).toBeInTheDocument()
  })
})
```

---

## 🔄 Activity Logging

All team actions are automatically logged. View activity:

```javascript
GET /api/teams/:teamId/activity?limit=50&offset=0
```

Logged actions:
- `team.created`
- `team.updated`
- `member.joined`
- `member.removed`
- `member.left`
- `member.role_updated`
- `invitation.sent`
- `invitation.revoked`

Custom logging:

```javascript
await req.db.teamActivityLog.log({
  team_id: teamId,
  user_id: req.user.id,
  action: 'custom.action',
  details: { key: 'value' },
  ip_address: req.ip,
  user_agent: req.get('user-agent')
})
```

---

## 🚀 Deployment Checklist

- [ ] Run database migrations
- [ ] Configure email service
- [ ] Test invitation emails
- [ ] Set up CORS for invite links
- [ ] Add team routes to frontend
- [ ] Test permissions in production
- [ ] Configure rate limiting for invitations
- [ ] Set up periodic cleanup of expired invitations

---

## 📖 API Reference

See full API documentation in [docs/TEAMS.md](./docs/TEAMS.md)

Quick reference:

- `GET /api/teams` - List teams
- `POST /api/teams` - Create team
- `GET /api/teams/:id` - Get team
- `PATCH /api/teams/:id` - Update team
- `DELETE /api/teams/:id` - Delete team (owner only)
- `GET /api/teams/:id/members` - List members
- `PATCH /api/teams/:id/members/:userId` - Update member
- `DELETE /api/teams/:id/members/:userId` - Remove member
- `POST /api/teams/:id/members/leave` - Leave team
- `GET /api/teams/:id/invitations` - List invitations
- `POST /api/teams/:id/invitations` - Send invitation
- `DELETE /api/teams/:id/invitations/:invitationId` - Revoke invitation
- `POST /api/invitations/accept/:token` - Accept invitation
- `GET /api/invitations/pending` - Get pending invitations
- `GET /api/teams/:id/activity` - View activity log

---

## 💡 Examples

### Multi-Team Workspace

```jsx
function AppLayout() {
  const [currentTeam, setCurrentTeam] = useState(null)
  const [teams, setTeams] = useState([])

  useEffect(() => {
    teamsApi.list().then(data => {
      setTeams(data.teams)
      setCurrentTeam(data.teams[0])
    })
  }, [])

  return (
    <div>
      <Sidebar>
        <TeamSelector
          teams={teams}
          current={currentTeam}
          onChange={setCurrentTeam}
        />
      </Sidebar>

      <MainContent teamId={currentTeam?.id} />
    </div>
  )
}
```

### Team-Scoped Content

```javascript
// Backend
router.get('/api/projects',
  authenticate,
  async (req, res) => {
    const teamId = req.query.team_id

    // Verify user is a member
    const isMember = await req.db.teamMembers.isMember(teamId, req.user.id)
    if (!isMember) {
      return res.status(403).json({ error: 'Not a team member' })
    }

    const projects = await ProjectRepo.findByTeam(teamId)
    res.json({ projects })
  }
)

// Frontend
function ProjectsList() {
  const { currentTeam } = useTeams()
  const { data } = useSWR(
    currentTeam ? `/api/projects?team_id=${currentTeam.id}` : null,
    fetcher
  )

  return <div>{data?.projects.map(...)}</div>
}
```

---

## 🆘 Troubleshooting

### Invitations not being sent

1. Check email configuration in `.env`
2. Check server logs for email errors
3. Verify SMTP credentials

### Permissions not working

1. Ensure `requireTeamMembership` middleware is applied
2. Check `req.teamRole` is set correctly
3. Verify permission names match `PERMISSIONS` object

### UI components not rendering

1. Check imports match component locations
2. Verify API responses match expected format
3. Check browser console for errors

---

## 📚 Further Reading

- [Backend API Documentation](./docs/TEAMS.md)
- [Permissions System](./server/src/lib/@system/permissions.js)
- [Database Schema](./server/src/db/schemas/@system/teams.sql)
- [Activity Logging](./docs/TEAMS.md#activity-actions)

---

## 🤝 Support

Questions? Check:
- [GitHub Issues](https://github.com/assimetria-ai/product-template/issues)
- [Discord Community](#product-template)
- [Documentation](https://docs.openclaw.ai)
