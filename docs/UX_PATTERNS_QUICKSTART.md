# UX Patterns Quick Start Guide

This guide helps you quickly implement common UX patterns using the template's built-in components.

## 🎯 Quick Links

- [Dashboard Setup](#dashboard-setup) - Get a dashboard running in 5 minutes
- [Onboarding Flow](#onboarding-flow) - Add user onboarding in 10 minutes
- [User Settings](#user-settings) - Complete settings page in 15 minutes

---

## Dashboard Setup

### 1. Basic Dashboard (5 minutes)

```jsx
import { 
  DashboardLayout,
  StatCard,
  StatCardGrid,
  QuickActions,
  RecentActivityList
} from '@/app/components/@system'
import { Users, DollarSign, Activity } from 'lucide-react'

export function MyDashboard() {
  // 1. Define your stats
  const stats = [
    {
      label: 'Total Users',
      value: '2,543',
      trend: { value: 12.5, direction: 'up' },
      description: 'vs last month',
      icon: Users,
    },
    {
      label: 'Revenue',
      value: '$45,231',
      trend: { value: 8.3, direction: 'up' },
      description: 'this month',
      icon: DollarSign,
    },
    {
      label: 'Active Now',
      value: '127',
      icon: Activity,
    },
  ]

  // 2. Define quick actions
  const actions = [
    { id: 'add-user', icon: Users, label: 'Add User', onClick: () => {} },
    { id: 'view-reports', icon: Activity, label: 'Reports', onClick: () => {} },
  ]

  // 3. Define recent activity
  const activity = [
    {
      id: 1,
      icon: Users,
      title: 'New user signed up',
      description: 'john@example.com',
      timestamp: new Date().toISOString(),
      variant: 'success',
    },
  ]

  return (
    <DashboardLayout>
      <DashboardLayout.Content>
        <DashboardLayout.Header
          title="Dashboard"
          description="Welcome back!"
        />

        {/* Stats */}
        <StatCardGrid>
          {stats.map(stat => <StatCard key={stat.label} {...stat} />)}
        </StatCardGrid>

        {/* Activity + Actions */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <RecentActivityList items={activity} limit={5} />
          <QuickActions actions={actions} />
        </div>
      </DashboardLayout.Content>
    </DashboardLayout>
  )
}
```

**Done!** You have a fully functional dashboard with:
- ✅ Responsive layout with sidebar
- ✅ Stat cards with trend indicators
- ✅ Quick action buttons
- ✅ Recent activity feed

### 2. Add Data Table (2 minutes)

```jsx
import { DataTable } from '@/app/components/@system'

const columns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
]

const data = [
  { id: 1, name: 'John Doe', email: 'john@example.com', status: 'active' },
  // ... more rows
]

// Add to your dashboard:
<DataTable
  title="Users"
  columns={columns}
  data={data}
  searchable
  paginated
  onRowClick={(row) => console.log('Clicked:', row)}
/>
```

### 3. Add Welcome Card with Onboarding Tasks (3 minutes)

```jsx
import { WelcomeCard } from '@/app/components/@system'

const tasks = [
  {
    id: 'profile',
    title: 'Complete your profile',
    description: 'Add your photo and bio',
    completed: false,
  },
  {
    id: 'billing',
    title: 'Add payment method',
    description: 'Start your free trial',
    completed: false,
  },
]

// Add at the top of your dashboard:
<WelcomeCard
  user={user}
  tasks={tasks}
  onTaskClick={(task) => navigate(task.route)}
  onDismiss={() => {}}
/>
```

---

## Onboarding Flow

### 1. Add Onboarding Route (2 minutes)

```jsx
// In your routes file
import { OnboardingWizard } from '@/app/components/@system'

<Route path="/onboarding" element={
  <div className="min-h-screen flex items-center justify-center p-4">
    <div className="max-w-2xl w-full">
      <OnboardingWizard />
    </div>
  </div>
} />
```

**That's it!** The `OnboardingWizard` handles everything:
- ✅ 5-step wizard (welcome, profile, preferences, invite, complete)
- ✅ Progress indicator
- ✅ Data persistence to backend
- ✅ Skip functionality
- ✅ Auto-redirect on completion

### 2. Redirect New Users (3 minutes)

```jsx
// In your App.jsx or main layout
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthContext } from '@/app/store/@system/auth'

function App() {
  const { user, isAuthenticated } = useAuthContext()
  const navigate = useNavigate()

  useEffect(() => {
    // Redirect to onboarding if not completed
    if (isAuthenticated && !user?.onboardingCompleted) {
      navigate('/onboarding')
    }
  }, [isAuthenticated, user, navigate])

  return <YourApp />
}
```

### 3. Add Product Tour (5 minutes)

```jsx
import { GuidedTour } from '@/app/components/@system'
import { useState } from 'react'

function Dashboard() {
  const [showTour, setShowTour] = useState(false)

  // 1. Define tour steps with data-tour attributes
  const steps = [
    {
      selector: '[data-tour="stats"]',
      title: 'Your Key Metrics',
      content: 'Track important numbers at a glance.',
    },
    {
      selector: '[data-tour="actions"]',
      title: 'Quick Actions',
      content: 'Common tasks are just one click away.',
    },
  ]

  return (
    <>
      <Button onClick={() => setShowTour(true)}>Take a tour</Button>
      
      <GuidedTour
        steps={steps}
        isActive={showTour}
        onComplete={() => setShowTour(false)}
        onSkip={() => setShowTour(false)}
        storageKey="dashboard-tour"
      />

      {/* 2. Add data-tour attributes to your elements */}
      <div data-tour="stats">
        <StatCardGrid>...</StatCardGrid>
      </div>

      <div data-tour="actions">
        <QuickActions actions={actions} />
      </div>
    </>
  )
}
```

### 4. Add Progress Checklist (3 minutes)

```jsx
import { ProgressChecklist } from '@/app/components/@system'

const tasks = [
  {
    id: 'profile',
    title: 'Complete profile',
    description: 'Add photo and bio',
    completed: true,
    icon: User,
    estimatedTime: '2 min'
  },
  {
    id: 'billing',
    title: 'Add payment method',
    completed: false,
    icon: CreditCard,
    estimatedTime: '3 min'
  },
]

<ProgressChecklist
  title="Getting Started"
  tasks={tasks}
  onTaskClick={(task) => handleTask(task)}
  onDismiss={() => setShowChecklist(false)}
  showProgress={true}
/>
```

---

## User Settings

### 1. Create Settings Page (5 minutes)

```jsx
import { UserSettings } from '@/app/components/@system'
import { DashboardLayout } from '@/app/components/@system'

export function SettingsPage() {
  const handleUpdate = (updates) => {
    console.log('Settings updated:', updates)
    // Save to API
  }

  return (
    <DashboardLayout>
      <DashboardLayout.Content>
        <DashboardLayout.Header
          title="Settings"
          description="Manage your account preferences"
        />
        
        <UserSettings
          defaultTab="profile"
          onUpdate={handleUpdate}
        />
      </DashboardLayout.Content>
    </DashboardLayout>
  )
}
```

**Done!** You get a complete settings interface with:
- ✅ Profile settings (name, email, role)
- ✅ Security settings (2FA, sessions)
- ✅ Notification preferences
- ✅ General preferences (theme, language)
- ✅ Connected accounts
- ✅ Data export
- ✅ Keyboard shortcuts

### 2. Add Custom Settings Tab (10 minutes)

```jsx
import { 
  SettingsSection, 
  SettingsRow,
  UserSettings 
} from '@/app/components/@system'
import { Switch } from '@/app/components/@system/ui'

// Option 1: Use UserSettings with custom sections
function SettingsPage() {
  return (
    <UserSettings defaultTab="profile">
      {/* Add custom content to existing tabs via children if needed */}
    </UserSettings>
  )
}

// Option 2: Build custom settings page from scratch
function CustomSettingsPage() {
  return (
    <DashboardLayout>
      <DashboardLayout.Content>
        <h1 className="text-2xl font-bold mb-6">Custom Settings</h1>
        
        <SettingsSection
          title="Privacy Settings"
          description="Control who can see your information"
        >
          <SettingsRow
            label="Make profile public"
            description="Allow others to view your profile"
          >
            <Switch checked={isPublic} onCheckedChange={setPublic} />
          </SettingsRow>

          <SettingsRow
            label="Show activity status"
            description="Let others see when you're online"
          >
            <Switch checked={showStatus} onCheckedChange={setShowStatus} />
          </SettingsRow>
        </SettingsSection>

        <SettingsSection
          title="Email Preferences"
          description="Manage your email notifications"
        >
          <SettingsRow
            label="Marketing emails"
            description="Product updates and news"
          >
            <Switch checked={marketing} onCheckedChange={setMarketing} />
          </SettingsRow>
        </SettingsSection>
      </DashboardLayout.Content>
    </DashboardLayout>
  )
}
```

---

## Common Patterns

### Loading States

```jsx
// Dashboard with loading
<StatCard loading />
<DataTable loading />

// Custom loading with Skeleton
import { Skeleton } from '@/app/components/@system'

<Skeleton className="h-32 w-full" />
```

### Empty States

```jsx
import { EmptyState } from '@/app/components/@system'
import { Inbox } from 'lucide-react'

<EmptyState
  icon={<Inbox className="h-12 w-12" />}
  title="No items yet"
  description="Get started by creating your first item"
  action={<Button onClick={handleCreate}>Create Item</Button>}
/>
```

### Notifications & Alerts

```jsx
import { Alert } from '@/app/components/@system'
import { Toast } from '@/app/components/@system'

// Alert banner
<Alert variant="success" title="Success!" dismissible>
  Your changes have been saved.
</Alert>

// Toast notification (import useToast hook)
import { useToast } from '@/app/components/@system'

function MyComponent() {
  const { toast } = useToast()

  const handleSave = () => {
    // ... save logic
    toast({
      title: 'Saved successfully',
      description: 'Your changes have been saved.',
      variant: 'success'
    })
  }
}
```

### Modals & Confirmation Dialogs

```jsx
import { Modal, ConfirmModal } from '@/app/components/@system'

// Standard modal
<Modal
  open={isOpen}
  onClose={() => setOpen(false)}
  title="Edit Profile"
  footer={
    <>
      <Button variant="outline" onClick={() => setOpen(false)}>
        Cancel
      </Button>
      <Button onClick={handleSave}>Save</Button>
    </>
  }
>
  <form>...</form>
</Modal>

// Confirmation modal
<ConfirmModal
  open={showConfirm}
  onClose={() => setConfirm(false)}
  onConfirm={handleDelete}
  title="Delete this item?"
  description="This action cannot be undone."
  variant="destructive"
  confirmText="Delete"
  cancelText="Cancel"
/>
```

### Command Palette (⌘K)

```jsx
import { CommandPalette, useCommandPalette } from '@/app/components/@system'

function App() {
  const { open, setOpen } = useCommandPalette()

  const commands = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      category: 'Navigation',
      href: '/app',
      icon: Home,
      shortcut: '⌘D'
    },
    {
      id: 'new-project',
      label: 'New Project',
      category: 'Actions',
      onSelect: () => createProject(),
      icon: Plus,
      shortcut: '⌘N'
    },
  ]

  return (
    <>
      <CommandPalette
        open={open}
        onOpenChange={setOpen}
        commands={commands}
      />
      
      {/* Trigger from anywhere */}
      <Button onClick={() => setOpen(true)}>
        Open ⌘K
      </Button>
    </>
  )
}
```

---

## Mobile Responsiveness

All components are mobile-first and responsive out of the box:

```jsx
// Automatically responsive
<StatCardGrid>  {/* 1 col on mobile, 2 on tablet, 4 on desktop */}
  <StatCard {...} />
</StatCardGrid>

<DataTable ... />  {/* Switches to card view on mobile */

<DashboardLayout>  {/* Hamburger menu on mobile */}
  ...
</DashboardLayout>
```

For custom responsive layouts:

```jsx
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
  {/* Responsive grid */}
</div>

<div className="flex flex-col sm:flex-row gap-4">
  {/* Stack on mobile, row on desktop */}
</div>
```

---

## API Integration

### Required Backend Endpoints

```javascript
// Onboarding
PATCH /users/me/onboarding  // Save onboarding data
POST /teams/invites          // Send team invitations

// Settings
GET    /users/me              // Get user profile
PATCH  /users/me              // Update profile
GET    /users/me/2fa/status   // Check 2FA status
POST   /users/me/2fa/enable   // Enable 2FA
POST   /users/me/2fa/disable  // Disable 2FA
GET    /users/me/sessions     // List active sessions
DELETE /users/me/sessions/:id // Revoke session
GET    /users/me/notifications // Get preferences
PATCH  /users/me/notifications // Update preferences

// Dashboard
GET /dashboard/stats    // Dashboard statistics
GET /dashboard/activity // Recent activity
GET /dashboard/users    // User list for table
```

### Example API Call

```jsx
import { api } from '@/app/lib/@system/api'

// In your component
const [stats, setStats] = useState([])
const [loading, setLoading] = useState(true)

useEffect(() => {
  async function fetchStats() {
    try {
      const data = await api.get('/dashboard/stats')
      setStats(data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoading(false)
    }
  }

  fetchStats()
}, [])
```

---

## Checklist: Complete UX Implementation

### Dashboard ✅
- [ ] Create dashboard page with DashboardLayout
- [ ] Add StatCardGrid with key metrics
- [ ] Implement QuickActions for common tasks
- [ ] Add RecentActivityList for activity feed
- [ ] Include DataTable for tabular data
- [ ] Add WelcomeCard for new users
- [ ] Connect to backend API for real data

### Onboarding ✅
- [ ] Create /onboarding route with OnboardingWizard
- [ ] Add redirect logic for new users
- [ ] Implement backend endpoint for onboarding data
- [ ] (Optional) Add GuidedTour for product walkthrough
- [ ] (Optional) Add ProgressChecklist in dashboard

### User Settings ✅
- [ ] Create /app/settings route
- [ ] Add UserSettings component with all tabs
- [ ] Implement ProfileSettings with name/email
- [ ] Add SecuritySettings with 2FA and sessions
- [ ] Configure NotificationSettings
- [ ] Connect to backend API for updates

### Polish ✅
- [ ] Add loading states to all data fetching
- [ ] Implement error handling with Alert/Toast
- [ ] Add empty states for tables and lists
- [ ] Test mobile responsiveness
- [ ] Add CommandPalette for keyboard shortcuts
- [ ] Implement confirmation dialogs for destructive actions

---

## Next Steps

1. **Customize the content** - Replace mock data with real API calls
2. **Match your brand** - Update colors, fonts, and copy
3. **Add your features** - Build on top of these patterns
4. **Test thoroughly** - Mobile, desktop, different browsers
5. **Deploy** - Your UX is ready for production!

---

## Need Help?

- Check component source code in `/client/src/app/components/@system`
- Read full docs in `/docs/UX_FEATURES.md` and `/docs/UX_COMPONENTS.md`
- Look at example usage in `/client/src/app/pages/app/@system/HomePage.jsx`
- Review test files in `/e2e/@system`

---

**Time to complete**: ~30 minutes for full UX setup

**Result**: Production-ready dashboard, onboarding, and settings with best-practice UX patterns.
