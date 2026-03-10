# UX Components Guide

This template includes a comprehensive set of UX components and patterns to help you build a professional, user-friendly application. All components are **mobile-responsive** and follow **accessibility best practices**.

## 📊 Dashboard Components

### DashboardLayout
Standard app layout with responsive sidebar and header.

```jsx
import { DashboardLayout } from '@/app/components/@system/Dashboard'

<DashboardLayout>
  <DashboardLayout.Header
    title="Dashboard"
    description="Welcome back!"
    actions={<Button>Action</Button>}
  />
  <DashboardLayout.Content>
    {/* Your content */}
  </DashboardLayout.Content>
</DashboardLayout>
```

**Features:**
- Responsive sidebar (drawer on mobile, persistent on desktop)
- Mobile hamburger menu
- Role-based navigation items
- Custom nav items support

### StatCard & StatCardGrid
Display key metrics with trend indicators.

```jsx
import { StatCard, StatCardGrid } from '@/app/components/@system/Dashboard'

<StatCardGrid>
  <StatCard
    label="Total Users"
    value="1,234"
    trend={12} // Percentage change
    description="vs last month"
    icon={Users}
    action={{ label: 'View all', onClick: () => {} }}
  />
</StatCardGrid>
```

**Features:**
- Trend indicators (up/down arrows)
- Optional icons
- Loading states
- Optional action buttons
- Responsive grid layout (1-4 columns)

### RecentActivityList
Display recent activity/events feed.

```jsx
import { RecentActivityList } from '@/app/components/@system/Dashboard'

<RecentActivityList
  items={[
    {
      id: 1,
      icon: Users,
      title: 'New user signed up',
      description: 'john@example.com',
      timestamp: '2024-03-01T10:00:00Z',
      variant: 'success',
    },
  ]}
/>
```

**Variants:** `default`, `success`, `warning`, `danger`

### QuickActions
Quick access buttons for common actions.

```jsx
import { QuickActions } from '@/app/components/@system/Dashboard'

<QuickActions
  actions={[
    { id: '1', icon: Plus, label: 'New Item', onClick: () => {} },
    { id: '2', icon: Users, label: 'Add User', onClick: () => {} },
  ]}
/>
```

### DataTable & MobileTable
Sortable, searchable tables with mobile support.

```jsx
import { DataTable } from '@/app/components/@system/Dashboard'

<DataTable
  title="Users"
  data={users}
  columns={[
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
  ]}
  onRowClick={(row) => console.log(row)}
  searchPlaceholder="Search users..."
/>
```

**Features:**
- Client-side search and sorting
- Custom cell renderers
- Row click handling
- Pagination support
- Mobile-optimized table variant
- Empty states

### WelcomeCard
Onboarding checklist for new users.

```jsx
import { WelcomeCard } from '@/app/components/@system/Dashboard'

<WelcomeCard
  user={user}
  tasks={[
    { id: '1', title: 'Complete profile', description: 'Add details', completed: false },
  ]}
  onTaskClick={(task) => navigate(task.route)}
  onDismiss={() => {}}
/>
```

---

## 🎓 Onboarding Components

### OnboardingWizard
Multi-step wizard for new user onboarding.

```jsx
import { OnboardingWizard } from '@/app/components/@system/Onboarding'

<OnboardingWizard />
```

**Features:**
- Step-by-step flow
- Progress indicator
- Back/forward navigation
- Skip functionality
- Form validation
- API integration ready

**Default steps:**
1. Welcome
2. Profile setup
3. Preferences
4. Team invites (optional)
5. Completion

### GuidedTour
Interactive product tour with tooltips.

```jsx
import { GuidedTour } from '@/app/components/@system/Onboarding'

<GuidedTour
  steps={[
    {
      selector: '[data-tour="stats"]',
      title: 'Your Metrics',
      content: 'Track important numbers here.',
    },
  ]}
  isActive={tourActive}
  onComplete={() => setTourActive(false)}
  storageKey="dashboard-tour-completed"
/>
```

**Features:**
- Highlight elements with tooltips
- Step progression
- Skip/complete
- localStorage persistence
- Mobile-responsive positioning

### FeatureSpotlight
Highlight new features to users.

```jsx
import { FeatureSpotlight, useFeatureSpotlight } from '@/app/components/@system/FeatureSpotlight'

<FeatureSpotlight
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  feature={{
    title: 'New Dashboard',
    description: 'Check out our redesigned dashboard...',
    image: '/images/new-dashboard.png',
    badge: 'New',
    cta: { label: 'Try it now', href: '/app' },
  }}
/>
```

**Hook for automatic display:**
```jsx
const { showSpotlight, closeSpotlight } = useFeatureSpotlight('feature-id', feature)
```

### AnnouncementBanner
Display announcements at the top of pages.

```jsx
import { AnnouncementBanner } from '@/app/components/@system/AnnouncementBanner'

<AnnouncementBanner
  id="banner-v1"
  message="🎉 New feature is live!"
  variant="gradient"
  action={{ label: 'Learn more', href: '/docs' }}
/>
```

**Variants:** `default`, `gradient`, `info`, `warning`, `success`

---

## ⚙️ User Settings

### UserSettings
Complete settings interface with tabs.

```jsx
import { UserSettings } from '@/app/components/@system/UserSettings'

<UserSettings
  user={user}
  onUpdate={async (updates) => { /* API call */ }}
  defaultTab="profile"
  onTabChange={(tab) => {}}
/>
```

**Included tabs:**
- Profile (name, email, photo)
- Security (password, 2FA)
- Notifications (email, push preferences)
- Preferences (theme, language)
- Connections (OAuth accounts)
- Data (export, delete account)
- Shortcuts (keyboard shortcuts)

### SettingsSection & SettingsRow
Reusable components for building settings pages.

```jsx
import { SettingsSection, SettingsRow } from '@/app/components/@system/UserSettings'

<SettingsSection
  title="Notifications"
  description="Manage how you receive notifications"
>
  <SettingsRow
    label="Email notifications"
    description="Receive updates via email"
  >
    <Switch checked={enabled} onCheckedChange={setEnabled} />
  </SettingsRow>
</SettingsSection>
```

---

## 💬 Feedback & Help

### HelpWidget
Floating help button with search and articles.

```jsx
import { HelpWidget } from '@/app/components/@system/HelpWidget'

<HelpWidget position="bottom-right" />
```

**Features:**
- Floating button
- Search help articles
- Contextual help
- Support contact links
- Mobile-responsive panel

**Positions:** `bottom-right`, `bottom-left`, `top-right`, `top-left`

### FeedbackWidget
Collect user feedback and bug reports.

```jsx
import { FeedbackWidget } from '@/app/components/@system/FeedbackWidget'

<FeedbackWidget 
  position="bottom-left"
  onSubmit={async (feedback) => { /* API call */ }}
/>
```

**Feedback types:**
- Bug reports
- Feature requests
- Improvements
- Other

**Features:**
- Satisfaction rating
- Screenshot attachment (optional)
- Email follow-up
- Multi-step form

### CommandPalette
Quick search and navigation (⌘K).

```jsx
import { CommandPalette } from '@/app/components/@system/CommandPalette'

<CommandPalette />
```

**Features:**
- Keyboard shortcut (⌘K / Ctrl+K)
- Search pages, actions
- Recent searches
- Keyboard navigation

---

## 🚨 Error Handling & States

### ErrorBoundary
Catch and display React errors gracefully.

```jsx
import { ErrorBoundary } from '@/app/components/@system/ErrorBoundary'

<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

**HOC usage:**
```jsx
import { withErrorBoundary } from '@/app/components/@system/ErrorBoundary'

export default withErrorBoundary(MyComponent)
```

**Features:**
- Prevents app crashes
- User-friendly error UI
- Error logging (Sentry integration)
- Retry functionality
- Dev mode error details

### EmptyState
Display when no data is available.

```jsx
import { EmptyState } from '@/app/components/@system/EmptyState'

<EmptyState
  icon={FileText}
  title="No projects yet"
  description="Create your first project to get started"
  action={<Button>Create Project</Button>}
/>
```

### Alert
Alert messages with variants.

```jsx
import { Alert } from '@/app/components/@system/Alert'

<Alert variant="success">
  <CheckCircle className="h-4 w-4" />
  <div>
    <h4 className="font-medium">Success</h4>
    <p className="text-sm">Your changes were saved.</p>
  </div>
</Alert>
```

**Variants:** `default`, `success`, `warning`, `destructive`

### Skeleton Loaders
Loading states for async content.

```jsx
import { HomePageSkeleton, SettingsPageSkeleton } from '@/app/components/@system/Skeleton'

{loading ? <HomePageSkeleton /> : <HomePage />}
```

---

## 🎨 Best Practices

### Mobile Responsiveness
All components use mobile-first responsive design:
- Tailwind breakpoints: `sm:`, `md:`, `lg:`, `xl:`
- Touch-friendly targets (44x44px minimum)
- Responsive typography
- Mobile-optimized tables and forms

### Accessibility
- ARIA labels and roles
- Keyboard navigation
- Focus management
- Screen reader support
- Reduced motion support

### Performance
- Lazy loading
- Code splitting
- Memoization
- Virtualized lists (large datasets)

### Customization
- All components accept `className` prop
- Custom variants and themes
- Extensible with Tailwind utilities
- Override via `@custom` directory

---

## 📱 Mobile UX Utilities

The template includes mobile-specific utilities in `index.css`:

### Touch Targets
```jsx
<button className="touch-target">Click me</button>
```

### Safe Area Padding
```jsx
<div className="safe-padding-all">Content with notch support</div>
```

### Mobile Stack Layouts
```jsx
<div className="mobile-stack">
  {/* Stacks on mobile, row on desktop */}
</div>
```

### Horizontal Scrolling
```jsx
<div className="mobile-scroll-x">
  {/* Horizontal scroll on mobile */}
</div>
```

### Responsive Grid Patterns
```jsx
<div className="mobile-card-grid-3">
  {/* 1 column mobile, 2 tablet, 3 desktop */}
</div>
```

---

## 🧪 Testing & Showcase

Visit `/app/ux-showcase` to see all components in action with interactive examples and documentation.

---

## 🔧 Adding Custom UX Components

1. Create component in `client/src/app/components/@custom/`
2. Export from `@custom/index.jsx`
3. Import and use in your pages
4. (Optional) Add to UX showcase for documentation

**Example:**
```jsx
// @custom/MyComponent.jsx
export function MyComponent() {
  return <div>My custom component</div>
}

// @custom/index.jsx
export { MyComponent } from './MyComponent'
```

---

## 📚 Resources

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Lucide Icons](https://lucide.dev)
- [React Router](https://reactrouter.com)

---

**Need help?** Check the UX Showcase page (`/app/ux-showcase`) or open an issue.
