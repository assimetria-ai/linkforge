# UX Features Guide

This document provides an overview of the comprehensive UX components and patterns available in the Product Template.

## Overview

The template includes three core UX feature categories:

1. **Dashboard Components** - Data visualization and quick actions
2. **Onboarding System** - User onboarding and guided tours
3. **User Settings** - Profile, security, and preferences management

---

## 1. Dashboard Components

Located in `/client/src/app/components/@system/Dashboard/`

### Components

#### DashboardLayout
Main container for dashboard pages with consistent structure.

```jsx
import { DashboardLayout } from '@/app/components/@system/Dashboard'

function MyDashboard() {
  return (
    <DashboardLayout>
      <DashboardLayout.Content>
        <DashboardLayout.Header
          title="Dashboard"
          description="Overview of your account"
          actions={<Button>Action</Button>}
        />
        <DashboardLayout.Section title="Section">
          {/* Content */}
        </DashboardLayout.Section>
      </DashboardLayout.Content>
    </DashboardLayout>
  )
}
```

#### StatCard
Display key metrics with trends and comparisons.

```jsx
import { StatCard, StatCardGrid } from '@/app/components/@system/Dashboard'
import { Users } from 'lucide-react'

const stats = [
  {
    label: 'Total Users',
    value: '2,543',
    trend: { value: 12.5, direction: 'up' },
    description: 'vs last month',
    icon: Users,
  }
]

<StatCardGrid>
  {stats.map(stat => <StatCard key={stat.label} {...stat} />)}
</StatCardGrid>
```

**Features:**
- Automatic trend indicators (up/down arrows)
- Color-coded trends (green for up, red for down)
- Icon support with customizable icons
- Responsive grid layout

#### QuickActions
Frequently used actions in a compact grid.

```jsx
import { QuickActions } from '@/app/components/@system/Dashboard'
import { Plus, Users, FileText } from 'lucide-react'

const actions = [
  {
    id: 'create-user',
    icon: Plus,
    label: 'Add User',
    onClick: () => console.log('Add user'),
  },
  // ... more actions
]

<QuickActions actions={actions} />
```

**Features:**
- Grid layout for multiple actions
- Icon + label design
- Hover effects
- Click handlers

#### RecentActivityList
Display recent events and activities.

```jsx
import { RecentActivityList } from '@/app/components/@system/Dashboard'
import { Users, DollarSign } from 'lucide-react'

const activities = [
  {
    id: 1,
    icon: Users,
    title: 'New user signed up',
    description: 'john@example.com',
    timestamp: new Date().toISOString(),
    variant: 'success', // or 'warning', 'default'
  }
]

<RecentActivityList items={activities} limit={5} />
```

**Features:**
- Color-coded activity types (success, warning, default)
- Relative timestamps
- Icon support
- Limit parameter for controlling display count

#### DataTable
Feature-rich data table with sorting, search, and pagination.

```jsx
import { DataTable } from '@/app/components/@system/Dashboard'

const columns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { 
    key: 'status', 
    label: 'Status',
    render: (value) => <Badge variant={value}>{value}</Badge>
  }
]

<DataTable
  columns={columns}
  data={data}
  searchable
  paginated
  onRowClick={(row) => console.log(row)}
/>
```

**Features:**
- Column sorting
- Search/filter
- Pagination
- Row click handlers
- Custom cell renderers
- Responsive design

---

## 2. Onboarding System

Located in `/client/src/app/components/@system/Onboarding/`

### OnboardingWizard

Multi-step wizard for new user onboarding.

**Location:** `/onboarding` page

**Steps:**
1. **Welcome** - Name and display name
2. **Profile** - Job title, company, location
3. **Preferences** - Email notifications and digests
4. **Invite Team** - Optional team member invitations
5. **Complete** - Success message and next steps

```jsx
import { OnboardingWizard } from '@/app/components/@system/Onboarding'

function OnboardingPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="max-w-lg">
        <OnboardingWizard />
      </div>
    </div>
  )
}
```

**Features:**
- Visual progress indicator
- Back/forward navigation
- Skip option for each step
- Data persistence via API
- Automatic redirect after completion
- Error handling
- Team invitations (optional)

**State Management:**
- Saves onboarding completion status to user profile
- Checks `user.onboardingCompleted` flag
- Redirects completed users to `/app`

### GuidedTour

Interactive product tour with spotlight effects.

```jsx
import { GuidedTour } from '@/app/components/@system/Onboarding'

const tourSteps = [
  {
    selector: '[data-tour="dashboard"]',
    title: 'Your Dashboard',
    content: 'This is your command center. View key metrics at a glance.'
  },
  {
    selector: '[data-tour="create-button"]',
    title: 'Create Something New',
    content: 'Click here to create a new project.'
  }
]

<GuidedTour
  steps={tourSteps}
  isActive={showTour}
  onComplete={() => setShowTour(false)}
  onSkip={() => setShowTour(false)}
  storageKey="product-tour-completed"
/>
```

**Features:**
- Position-aware tooltips (auto-adjusts to available space)
- Spotlight effect on target elements
- Step progress indicator
- Skip and back navigation
- LocalStorage persistence
- Responsive positioning

**Usage Pattern:**
1. Add `data-tour="identifier"` to elements
2. Define steps with selectors and content
3. Control visibility with `isActive` prop
4. Handle completion/skip callbacks

### ProgressChecklist

Compact checklist for tracking onboarding tasks.

```jsx
import { ProgressChecklist } from '@/app/components/@system/Onboarding'
import { User, CreditCard, Settings, Users } from 'lucide-react'

const tasks = [
  {
    id: 'profile',
    title: 'Complete your profile',
    description: 'Add your photo and bio',
    icon: User,
    completed: false,
    estimatedTime: '2 min'
  },
  // ... more tasks
]

<ProgressChecklist
  title="Getting Started"
  tasks={tasks}
  onTaskClick={(task) => handleTask(task)}
  onDismiss={() => setShowChecklist(false)}
  showProgress={true}
/>
```

**Features:**
- Visual progress bar
- Collapsible interface
- Dismissable when complete
- Task completion checkboxes
- Estimated time per task
- Icon support
- "All complete" celebration state

---

## 3. User Settings

Located in `/client/src/app/pages/app/@system/SettingsPage.tsx`

### Tabs Structure

The settings page uses a tabbed interface with three main sections:

#### Profile Tab
- **Display Name** - User's full name
- **Email** - Read-only email address
- **Role** - Read-only user role
- **Save Changes** - Updates user profile
- **Danger Zone** - Account deletion (protected)

#### Security Tab
- **Two-Factor Authentication**
  - Enable/disable TOTP
  - QR code setup
  - Backup codes
- **Active Sessions**
  - List all login sessions
  - Device and browser detection
  - IP address tracking
  - Revoke individual sessions
  - "Current session" indicator

#### Notifications Tab
- **Email Notifications**
  - Security alerts (always on)
  - Billing updates
  - Activity digest
  - Marketing/product updates
- **In-App Notifications**
  - Enable/disable notification center
  - Mentions and replies
  - Weekly digest

### Settings Components

#### TwoFactorSetup
Located in `/client/src/app/components/@system/TwoFactor/`

```jsx
import { TwoFactorSetup } from '@/app/components/@system/TwoFactor'

<TwoFactorSetup
  enabled={totpEnabled}
  onStatusChange={(enabled) => setTotpEnabled(enabled)}
/>
```

**Features:**
- QR code generation for authenticator apps
- Manual secret key display
- Verification code input
- Backup codes generation
- Enable/disable functionality

#### Session Management

```jsx
const sessions = await getSessions()

sessions.map(session => (
  <SessionCard
    session={session}
    onRevoke={handleRevoke}
    isCurrent={session.isCurrent}
  />
))
```

**Features:**
- Device/browser parsing from User-Agent
- IP address display
- Creation timestamp
- Current session protection (can't revoke)
- Individual session revocation

---

## Best Practices

### Dashboard
1. **Use mock data placeholders** - Comment with `@custom` for easy replacement
2. **Keep stats focused** - Limit to 4-6 key metrics
3. **Prioritize above-the-fold content** - Most important info first
4. **Use consistent icons** - Lucide React for all icons

### Onboarding
1. **Keep it short** - 3-5 steps maximum
2. **Make everything optional** - Allow skip on all steps
3. **Show progress clearly** - Visual progress indicator
4. **Provide value immediately** - Don't gate core features
5. **Save state** - Persist completion to avoid showing twice

### Settings
1. **Group related settings** - Use tabs or sections
2. **Provide clear descriptions** - Explain what each setting does
3. **Show save state** - Loading and success indicators
4. **Validate input** - Client and server-side validation
5. **Dangerous actions** - Separate and clearly marked

---

## Customization

### Dashboard

Replace mock data in `/client/src/app/pages/app/@system/HomePage.jsx`:

```jsx
// @custom — Replace with real data from your API
const stats = await api.get('/dashboard/stats')
const activities = await api.get('/dashboard/activity')
```

### Onboarding

Customize steps in `/client/src/app/components/@system/Onboarding/OnboardingWizard.jsx`:

```jsx
const STEPS = [
  {
    id: 'custom-step',
    title: 'Your Custom Step',
    description: 'Collect specific data',
    icon: YourIcon,
  },
  // Add more steps
]
```

Add corresponding step component:

```jsx
function CustomStep({ data, onDataChange }) {
  return (
    <div className="space-y-6">
      {/* Your custom form fields */}
    </div>
  )
}
```

### Settings

Add new tabs in `SettingsPage.tsx`:

```jsx
<Tabs value={activeTab} onValueChange={setTab}>
  <TabsList>
    <TabsTrigger value="profile">Profile</TabsTrigger>
    <TabsTrigger value="custom">Custom</TabsTrigger>
  </TabsList>
  
  <TabsContent value="custom">
    {/* Your custom settings */}
  </TabsContent>
</Tabs>
```

---

## API Integration

### Required Endpoints

#### Onboarding
- `PATCH /users/me/onboarding` - Save onboarding data
- `POST /teams/invites` - Send team invitations

#### Settings
- `GET /users/me` - Get user profile
- `PATCH /users/me` - Update user profile
- `GET /users/me/2fa/status` - Get 2FA status
- `POST /users/me/2fa/enable` - Enable 2FA
- `POST /users/me/2fa/disable` - Disable 2FA
- `GET /users/me/sessions` - List active sessions
- `DELETE /users/me/sessions/:id` - Revoke session
- `GET /users/me/notifications` - Get notification preferences
- `PATCH /users/me/notifications` - Update notification preferences

#### Dashboard
- `GET /dashboard/stats` - Get dashboard statistics
- `GET /dashboard/activity` - Get recent activity
- `GET /dashboard/users` - Get recent users

---

## Accessibility

All components follow accessibility best practices:

- **Keyboard navigation** - Full keyboard support
- **ARIA labels** - Proper semantic HTML and ARIA attributes
- **Focus management** - Clear focus indicators
- **Screen reader support** - Descriptive labels and announcements
- **Color contrast** - WCAG AA compliant
- **Responsive design** - Works on all screen sizes

---

## Examples

### Complete Dashboard Page

```jsx
import { 
  DashboardLayout, 
  StatCard, 
  StatCardGrid, 
  QuickActions,
  RecentActivityList,
  DataTable 
} from '@/app/components/@system/Dashboard'
import { Users, DollarSign, Activity, Plus } from 'lucide-react'

export function MyDashboard() {
  return (
    <DashboardLayout>
      <DashboardLayout.Content>
        <DashboardLayout.Header
          title="Dashboard"
          description="Welcome back!"
          actions={
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Item
            </Button>
          }
        />

        <StatCardGrid>
          <StatCard
            label="Total Users"
            value="2,543"
            trend={{ value: 12.5, direction: 'up' }}
            icon={Users}
          />
          {/* More stats */}
        </StatCardGrid>

        <div className="grid gap-6 lg:grid-cols-2">
          <DashboardLayout.Section title="Quick Actions">
            <QuickActions actions={actions} />
          </DashboardLayout.Section>

          <DashboardLayout.Section title="Recent Activity">
            <RecentActivityList items={activities} limit={5} />
          </DashboardLayout.Section>
        </div>

        <DashboardLayout.Section title="Recent Users">
          <DataTable
            columns={columns}
            data={users}
            searchable
            paginated
          />
        </DashboardLayout.Section>
      </DashboardLayout.Content>
    </DashboardLayout>
  )
}
```

### Onboarding Flow

```jsx
// In your app
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthContext } from '@/app/store/@system/auth'

function App() {
  const { user, isAuthenticated } = useAuthContext()
  const navigate = useNavigate()

  useEffect(() => {
    // Redirect to onboarding if user hasn't completed it
    if (isAuthenticated && !user?.onboardingCompleted) {
      navigate('/onboarding')
    }
  }, [isAuthenticated, user, navigate])

  return <YourApp />
}
```

---

## Testing

Test your UX components:

```javascript
// Dashboard
import { render, screen } from '@testing-library/react'
import { StatCard } from '@/app/components/@system/Dashboard'

test('displays stat card with trend', () => {
  render(
    <StatCard
      label="Users"
      value="100"
      trend={{ value: 10, direction: 'up' }}
    />
  )
  
  expect(screen.getByText('Users')).toBeInTheDocument()
  expect(screen.getByText('100')).toBeInTheDocument()
})

// Onboarding
test('completes onboarding wizard', async () => {
  const { user } = render(<OnboardingWizard />)
  
  // Fill in welcome step
  await user.type(screen.getByPlaceholderText('John Doe'), 'Test User')
  await user.click(screen.getByText('Continue'))
  
  // Complete remaining steps...
})
```

---

## Performance

### Code Splitting

All dashboard and onboarding components are lazy-loaded:

```jsx
const OnboardingWizard = lazy(() =>
  import('@/app/components/@system/Onboarding').then(m => ({
    default: m.OnboardingWizard
  }))
)
```

### Optimization Tips

1. **Memoize expensive calculations**
```jsx
const sortedData = useMemo(
  () => data.sort((a, b) => a.value - b.value),
  [data]
)
```

2. **Debounce search inputs**
```jsx
const debouncedSearch = useMemo(
  () => debounce((value) => handleSearch(value), 300),
  []
)
```

3. **Virtualize long lists**
```jsx
import { useVirtualizer } from '@tanstack/react-virtual'
// Use for tables with >100 rows
```

---

## Migration from Existing Dashboards

If you have an existing dashboard, migrate gradually:

1. **Add new components alongside old ones**
2. **Test thoroughly**
3. **Update API endpoints**
4. **Switch over section by section**
5. **Remove old code once stable**

Example:

```jsx
// Old dashboard
<div className="old-dashboard">
  {/* Existing code */}
</div>

// Add new components
<DashboardLayout>
  <StatCardGrid>
    {/* New stats */}
  </StatCardGrid>
</DashboardLayout>
```

---

## Troubleshooting

### OnboardingWizard not showing
- Check `user.onboardingCompleted` flag in database
- Verify route is configured in AppRoutes.jsx
- Check authentication context is working

### Dashboard components not styling correctly
- Ensure Tailwind CSS is configured
- Check for conflicting global styles
- Verify component imports are correct

### Settings not saving
- Check API endpoints are implemented
- Verify authentication token is valid
- Check network tab for error responses

---

## Resources

- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Lucide Icons](https://lucide.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [React Router](https://reactrouter.com)

---

## Support

For questions or issues:

1. Check this documentation
2. Review component source code
3. Check the template README.md
4. Create an issue in the repository
