# UX Patterns Documentation

This template includes a comprehensive set of reusable UX components and patterns for building modern web applications. All components are fully customizable, responsive, and follow best practices.

## 📍 Quick Access

Visit `/app/ux-patterns` in your running application to see interactive demos of all components.

## Table of Contents

1. [Dashboard Components](#dashboard-components)
2. [Onboarding Flows](#onboarding-flows)
3. [User Settings](#user-settings)
4. [Best Practices](#best-practices)

---

## Dashboard Components

Location: `client/src/app/components/@system/Dashboard/`

### DashboardLayout

A flexible layout component that provides consistent structure for dashboard pages.

**Usage:**
```jsx
import { DashboardLayout } from '@/app/components/@system/Dashboard'

function MyDashboard() {
  return (
    <DashboardLayout>
      <DashboardLayout.Content>
        <DashboardLayout.Header
          title="Dashboard Title"
          description="Description text"
          actions={<Button>Action</Button>}
        />
        
        <DashboardLayout.Section
          title="Section Title"
          description="Section description"
        >
          {/* Section content */}
        </DashboardLayout.Section>
      </DashboardLayout.Content>
    </DashboardLayout>
  )
}
```

### StatCard & StatCardGrid

Display key metrics with trends and comparisons.

**Usage:**
```jsx
import { StatCard, StatCardGrid } from '@/app/components/@system/Dashboard'
import { Users, DollarSign } from 'lucide-react'

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
    value: '$45,234',
    trend: { value: 8.2, direction: 'up' },
    description: 'this month',
    icon: DollarSign,
  },
]

function Dashboard() {
  return (
    <StatCardGrid>
      {stats.map(stat => <StatCard key={stat.label} {...stat} />)}
    </StatCardGrid>
  )
}
```

**Props:**
- `label`: string - The metric label
- `value`: string | number - The metric value
- `trend`: { value: number, direction: 'up' | 'down' } - Optional trend indicator
- `description`: string - Optional description/context
- `icon`: React Component - Optional icon component

### RecentActivityList

Display a timeline of recent events or activities.

**Usage:**
```jsx
import { RecentActivityList } from '@/app/components/@system/Dashboard'
import { Users, FileText } from 'lucide-react'

const activities = [
  {
    id: 1,
    icon: Users,
    title: 'New user signed up',
    description: 'john@example.com',
    timestamp: '2024-01-15T10:30:00Z',
    variant: 'success', // 'success' | 'warning' | 'error' | 'default'
  },
  {
    id: 2,
    icon: FileText,
    title: 'Document created',
    description: 'Project proposal',
    timestamp: '2024-01-15T09:15:00Z',
    variant: 'default',
  },
]

function Dashboard() {
  return <RecentActivityList items={activities} limit={5} />
}
```

### QuickActions

Provide shortcuts to common actions.

**Usage:**
```jsx
import { QuickActions } from '@/app/components/@system/Dashboard'
import { Plus, Users, FileText } from 'lucide-react'

const actions = [
  {
    id: 'create-user',
    icon: Users,
    label: 'Add User',
    onClick: () => console.log('Add user'),
  },
  {
    id: 'new-doc',
    icon: FileText,
    label: 'New Document',
    onClick: () => navigate('/documents/new'),
  },
]

function Dashboard() {
  return <QuickActions actions={actions} />
}
```

### DataTable

A feature-rich table with sorting, searching, pagination, and bulk actions.

**Usage:**
```jsx
import { DataTable } from '@/app/components/@system/Dashboard'

const columns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  {
    key: 'status',
    label: 'Status',
    render: (value) => (
      <span className={value === 'active' ? 'text-green-600' : 'text-gray-400'}>
        {value}
      </span>
    ),
  },
]

const data = [
  { id: 1, name: 'John Doe', email: 'john@example.com', status: 'active' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'inactive' },
]

function UsersList() {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchable
      paginated
      selectable
      onRowClick={(row) => console.log('Clicked:', row)}
    />
  )
}
```

### WelcomeCard

Display a dismissible welcome message with call-to-action buttons.

**Usage:**
```jsx
import { WelcomeCard } from '@/app/components/@system/Dashboard'

function Dashboard() {
  return (
    <WelcomeCard
      userName="John"
      message="Welcome back! Here's what you can do:"
      actions={[
        { label: 'Take a tour', onClick: () => startTour() },
        { label: 'View docs', onClick: () => navigate('/docs') },
      ]}
      onDismiss={() => console.log('Dismissed')}
    />
  )
}
```

### FiltersBar & BulkActions

Add filtering and bulk operation capabilities to tables.

**Usage:**
```jsx
import { FiltersBar, BulkActions, commonBulkActions } from '@/app/components/@system/Dashboard'

function UsersList() {
  const [filters, setFilters] = useState({})
  const [selectedIds, setSelectedIds] = useState([])

  const filterOptions = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
      ],
    },
    {
      key: 'plan',
      label: 'Plan',
      options: [
        { value: 'free', label: 'Free' },
        { value: 'premium', label: 'Premium' },
      ],
    },
  ]

  const bulkActions = [
    ...commonBulkActions, // Includes export, delete
    {
      id: 'assign-role',
      label: 'Assign Role',
      icon: Shield,
      action: (ids) => console.log('Assigning role to:', ids),
    },
  ]

  return (
    <>
      <FiltersBar
        filters={filterOptions}
        activeFilters={filters}
        onChange={setFilters}
      />
      
      {selectedIds.length > 0 && (
        <BulkActions
          selectedCount={selectedIds.length}
          actions={bulkActions}
          selectedIds={selectedIds}
          onClearSelection={() => setSelectedIds([])}
        />
      )}
      
      {/* Your table here */}
    </>
  )
}
```

---

## Onboarding Flows

Location: `client/src/app/components/@system/Onboarding/`

### OnboardingWizard

A multi-step wizard that guides users through initial setup.

**Usage:**
```jsx
import { OnboardingWizard } from '@/app/components/@system/Onboarding'

function OnboardingPage() {
  return (
    <OnboardingWizard
      onComplete={() => {
        console.log('Onboarding completed')
        navigate('/app')
      }}
      onSkip={() => {
        console.log('Onboarding skipped')
        navigate('/app')
      }}
    />
  )
}
```

**Customization:**

To customize the onboarding steps, modify the `STEPS` array in `OnboardingWizard.jsx`:

```jsx
const STEPS = [
  {
    id: 'welcome',
    title: 'Welcome! Let\'s get started',
    description: 'Tell us a bit about yourself',
    icon: Sparkles,
    // Add your custom fields and logic here
  },
  // Add more steps...
]
```

### GuidedTour

Interactive tooltips that highlight and explain UI features.

**Usage:**
```jsx
import { GuidedTour } from '@/app/components/@system/Onboarding'

const tourSteps = [
  {
    target: '#dashboard-stats',
    title: 'Dashboard Overview',
    content: 'Track your key metrics at a glance.',
    placement: 'bottom', // 'top' | 'right' | 'bottom' | 'left'
  },
  {
    target: '#quick-actions',
    title: 'Quick Actions',
    content: 'Access common tasks quickly.',
    placement: 'right',
  },
]

function Dashboard() {
  const [showTour, setShowTour] = useState(false)

  return (
    <>
      <button onClick={() => setShowTour(true)}>Start Tour</button>
      
      {showTour && (
        <GuidedTour
          steps={tourSteps}
          onComplete={() => {
            setShowTour(false)
            console.log('Tour completed')
          }}
          onSkip={() => setShowTour(false)}
        />
      )}
      
      {/* Your dashboard content with id="dashboard-stats", etc. */}
    </>
  )
}
```

### ProgressChecklist

Help users complete important setup tasks.

**Usage:**
```jsx
import { ProgressChecklist } from '@/app/components/@system/Onboarding'

const checklistItems = [
  {
    id: 'profile',
    label: 'Complete your profile',
    description: 'Add your name and profile picture',
    completed: true,
    action: () => navigate('/settings/profile'),
  },
  {
    id: 'verify-email',
    label: 'Verify your email',
    description: 'Check your inbox',
    completed: false,
    action: () => resendVerificationEmail(),
  },
  {
    id: 'invite-team',
    label: 'Invite team members',
    description: 'Collaborate with your team',
    completed: false,
    action: () => navigate('/team/invite'),
  },
]

function Dashboard() {
  return (
    <ProgressChecklist
      items={checklistItems}
      title="Get Started"
      description="Complete these tasks to get the most out of your account"
      onComplete={() => console.log('All tasks completed!')}
    />
  )
}
```

---

## User Settings

Location: `client/src/app/components/@system/UserSettings/`

### UserSettings (Container)

A tabbed container for all settings sections.

**Usage:**
```jsx
import {
  UserSettings,
  ProfileSettings,
  SecuritySettings,
  NotificationSettings,
} from '@/app/components/@system/UserSettings'

function SettingsPage() {
  return (
    <UserSettings defaultTab="profile">
      <UserSettings.Tab id="profile" label="Profile" icon={User}>
        <ProfileSettings />
      </UserSettings.Tab>
      
      <UserSettings.Tab id="security" label="Security" icon={Shield}>
        <SecuritySettings />
      </UserSettings.Tab>
      
      <UserSettings.Tab id="notifications" label="Notifications" icon={Bell}>
        <NotificationSettings />
      </UserSettings.Tab>
    </UserSettings>
  )
}
```

### Individual Settings Components

Each settings component can be used standalone:

```jsx
import { ProfileSettings } from '@/app/components/@system/UserSettings'

function ProfilePage() {
  return (
    <Card>
      <CardContent>
        <ProfileSettings />
      </CardContent>
    </Card>
  )
}
```

**Available Components:**
- `ProfileSettings` - Name, email, avatar
- `SecuritySettings` - Password, 2FA, active sessions
- `NotificationSettings` - Email and in-app notification preferences
- `PreferencesSettings` - Theme, language, timezone
- `KeyboardShortcuts` - View and customize keyboard shortcuts
- `DataExport` - Export account data (GDPR compliance)
- `ConnectedAccounts` - OAuth connections and linked accounts

---

## Best Practices

### 1. **Consistent Layout**

Use `DashboardLayout` for all app pages to maintain consistency:

```jsx
function MyPage() {
  return (
    <DashboardLayout>
      <DashboardLayout.Content>
        <DashboardLayout.Header
          title="Page Title"
          description="Page description"
        />
        {/* Page content */}
      </DashboardLayout.Content>
    </DashboardLayout>
  )
}
```

### 2. **Progressive Disclosure**

Show advanced features gradually:

- Start with a simple dashboard
- Use `ProgressChecklist` to guide users
- Reveal advanced features after core tasks are complete

### 3. **First-Time User Experience**

Implement a proper onboarding flow:

```jsx
function App() {
  const { user } = useAuthContext()
  
  if (user && !user.onboardingCompleted) {
    return <OnboardingWizard onComplete={completeOnboarding} />
  }
  
  return <Dashboard />
}
```

### 4. **Contextual Help**

Use `GuidedTour` for new features:

```jsx
function NewFeaturePage() {
  const [hasSeenTour, setHasSeenTour] = useState(
    localStorage.getItem('newFeatureTour') === 'completed'
  )
  
  useEffect(() => {
    if (!hasSeenTour) {
      setShowTour(true)
    }
  }, [hasSeenTour])
  
  return (
    <>
      {showTour && (
        <GuidedTour
          steps={tourSteps}
          onComplete={() => {
            localStorage.setItem('newFeatureTour', 'completed')
            setHasSeenTour(true)
          }}
        />
      )}
      {/* Feature content */}
    </>
  )
}
```

### 5. **Responsive Design**

All components are responsive. Test on multiple screen sizes:

- Mobile: 320px - 767px
- Tablet: 768px - 1023px
- Desktop: 1024px+

### 6. **Accessibility**

Components follow WCAG 2.1 guidelines:
- Keyboard navigation
- Screen reader support
- ARIA labels
- Color contrast compliance

### 7. **Performance**

Optimize data loading:

```jsx
// Use lazy loading for heavy components
const HeavyDashboard = lazy(() => import('./HeavyDashboard'))

// Paginate large data sets
<DataTable
  data={users}
  paginated
  pageSize={20}
/>

// Debounce search inputs
const [searchTerm, setSearchTerm] = useState('')
const debouncedSearch = useDebounce(searchTerm, 300)
```

---

## Customization

### Theme Customization

All components use Tailwind CSS and respect your theme configuration:

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          // Your brand colors
        },
      },
    },
  },
}
```

### Component Customization

Create custom variants by extending base components:

```jsx
// CustomStatCard.jsx
import { StatCard } from '@/app/components/@system/Dashboard'

export function CustomStatCard(props) {
  return (
    <StatCard
      {...props}
      className="border-2 border-primary shadow-lg"
    />
  )
}
```

---

## Examples

### Complete Dashboard Example

```jsx
import {
  DashboardLayout,
  StatCardGrid,
  StatCard,
  RecentActivityList,
  QuickActions,
  DataTable,
  WelcomeCard,
} from '@/app/components/@system/Dashboard'

function Dashboard() {
  const { user } = useAuthContext()
  const [showWelcome, setShowWelcome] = useState(!user.hasSeenWelcome)

  return (
    <DashboardLayout>
      <DashboardLayout.Content>
        <DashboardLayout.Header
          title={`Welcome back, ${user.name}`}
          description="Here's what's happening with your account today"
        />

        {showWelcome && (
          <WelcomeCard
            userName={user.name}
            message="Let's get you started!"
            actions={[
              { label: 'Take a tour', onClick: startTour },
              { label: 'Complete setup', onClick: showOnboarding },
            ]}
            onDismiss={() => {
              setShowWelcome(false)
              markWelcomeSeen()
            }}
          />
        )}

        <StatCardGrid>
          {stats.map(stat => <StatCard key={stat.label} {...stat} />)}
        </StatCardGrid>

        <div className="grid gap-6 lg:grid-cols-2">
          <DashboardLayout.Section title="Quick Actions">
            <QuickActions actions={quickActions} />
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

---

## Support

For questions or issues:
1. Check the interactive demo at `/app/ux-patterns`
2. Review component source code in `client/src/app/components/@system/`
3. Consult this documentation
4. Reach out to the development team

---

## Version History

- **v1.0** - Initial release with Dashboard, Onboarding, and Settings components
- All components are production-ready and battle-tested
