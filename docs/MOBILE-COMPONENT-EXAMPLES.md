# Mobile-Optimized Component Examples

Quick reference for mobile-responsive component patterns used in this template.

## 🎨 Layout Components

### DashboardLayout (with Mobile Menu)
```jsx
import { DashboardLayout } from '@/app/components/@system/Dashboard/DashboardLayout'

function MyPage() {
  return (
    <DashboardLayout>
      <DashboardLayout.Header
        title="Dashboard"
        description="Welcome back!"
        actions={<Button>New Project</Button>}
      />
      <DashboardLayout.Content>
        {/* Your content */}
      </DashboardLayout.Content>
    </DashboardLayout>
  )
}
```

**Mobile Features:**
- Floating hamburger button (bottom-right)
- Drawer sidebar on mobile
- Persistent sidebar on desktop
- Auto-stacking header on mobile

### Responsive Grid Layouts
```jsx
// 1-2-3 Column Grid (Mobile → Tablet → Desktop)
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  <Card>Item 1</Card>
  <Card>Item 2</Card>
  <Card>Item 3</Card>
</div>

// Auto-fit Responsive Grid
<div className="grid-auto-fit-cards">
  {items.map(item => <Card key={item.id}>{item.name}</Card>)}
</div>

// MetricGroup Component
<MetricGroup columns={3}>
  <MetricCard title="Users" value="2,543" change={12.5} trend="up" />
  <MetricCard title="Revenue" value="$45,231" change={-3.2} trend="down" />
  <MetricCard title="Orders" value="1,234" change={0} trend="neutral" />
</MetricGroup>
```

## 📊 Data Display

### MobileTable (Switches to Card View)
```jsx
import { MobileTable } from '@/app/components/@system/Dashboard/MobileTable'

const columns = [
  { key: 'name', label: 'Name', mobileLabel: 'Name', primary: true },
  { key: 'email', label: 'Email', mobileLabel: 'Email' },
  { key: 'status', label: 'Status', render: (value) => <Badge>{value}</Badge> },
  { key: 'date', label: 'Created', hideOnMobile: true },
]

function UsersList() {
  return (
    <MobileTable
      columns={columns}
      data={users}
      onRowClick={(user) => navigate(`/users/${user.id}`)}
    />
  )
}
```

**Mobile Features:**
- Desktop: Traditional table layout
- Mobile: Card-based layout with primary field highlighted
- Hide specific columns on mobile with `hideOnMobile`
- Touch-friendly row selection

### DataTable (with Horizontal Scroll)
```jsx
import { DataTable } from '@/app/components/@system/Dashboard/DataTable'

const columns = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email' },
  { key: 'status', label: 'Status', render: renderStatus },
]

function ProjectsTable() {
  return (
    <DataTable
      columns={columns}
      data={projects}
      searchable
      paginated
      pageSize={20}
      onRowClick={(project) => handleClick(project)}
    />
  )
}
```

**Mobile Features:**
- Horizontal scroll on mobile
- Responsive search bar
- Mobile-optimized pagination
- Touch-friendly sorting

## 📝 Forms

### Mobile-Optimized Form
```jsx
import { FormField, Input, Textarea } from '@/app/components/@system/Form/Form'
import { Button } from '@/app/components/@system/ui/button'

function ContactForm() {
  return (
    <form className="mobile-form-layout">
      {/* Stacks vertically on mobile, side-by-side on desktop */}
      <div className="mobile-form-row">
        <FormField label="First Name" required>
          <Input placeholder="John" />
        </FormField>
        <FormField label="Last Name" required>
          <Input placeholder="Doe" />
        </FormField>
      </div>

      <FormField label="Email" required>
        <Input type="email" placeholder="john@example.com" />
      </FormField>

      <FormField label="Message">
        <Textarea placeholder="Your message..." rows={4} />
      </FormField>

      {/* Full width on mobile, auto width on desktop */}
      <div className="mobile-button-group">
        <Button type="submit">Submit</Button>
        <Button type="button" variant="outline">Cancel</Button>
      </div>
    </form>
  )
}
```

**Mobile Features:**
- 44px minimum input height for touch
- 16px font size to prevent iOS zoom
- Responsive button widths
- Stack form fields vertically on mobile

## 💳 Cards & Metrics

### Responsive MetricCard
```jsx
import { MetricCard, MetricGroup } from '@/app/components/@system/MetricCard/MetricCard'
import { DollarSign, Users, ShoppingCart } from 'lucide-react'

function DashboardMetrics() {
  return (
    <MetricGroup columns={3}>
      <MetricCard
        title="Total Revenue"
        value="$45,231"
        change={12.5}
        trend="up"
        period="vs last month"
        icon={<DollarSign />}
        description="Revenue from all sources"
      />
      <MetricCard
        title="Active Users"
        value="2,543"
        change={-3.2}
        trend="down"
        icon={<Users />}
      />
      <MetricCard
        title="Orders"
        value="1,234"
        change={0}
        trend="neutral"
        icon={<ShoppingCart />}
      />
    </MetricGroup>
  )
}
```

**Mobile Features:**
- Responsive padding (p-4 sm:p-6)
- Scales text sizes (text-2xl sm:text-3xl)
- Icon sizes adjust (h-4 w-4 sm:h-5 w-5)
- Truncates long text
- Stack columns on mobile (1 col → 2 cols → 3 cols)

### Basic Responsive Card
```jsx
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/@system/Card/Card'

function InfoCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl sm:text-2xl">
          Card Title
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm sm:text-base text-muted-foreground">
          Card content with responsive text size
        </p>
      </CardContent>
    </Card>
  )
}
```

## 🧭 Navigation

### Header with Mobile Menu
```jsx
import { Header } from '@/app/components/@system/Header/Header'

function App() {
  return (
    <>
      <Header />
      {/* Your app content */}
    </>
  )
}
```

**Mobile Features:**
- Desktop: Horizontal nav with user dropdown
- Mobile: Hamburger menu with drawer
- Touch-friendly menu items (44px height)
- Auto-closing on navigation

### Sidebar with Mobile Drawer
```jsx
import { Sidebar, SidebarLogo, SidebarSection, SidebarItem } from '@/app/components/@system/Sidebar/Sidebar'
import { Home, Settings, Users } from 'lucide-react'

function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      >
        <SidebarLogo name="MyApp" />
        <SidebarSection>
          <SidebarItem icon={<Home />} label="Home" active />
          <SidebarItem icon={<Users />} label="Users" />
          <SidebarItem icon={<Settings />} label="Settings" />
        </SidebarSection>
      </Sidebar>

      {/* Mobile hamburger trigger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden"
      >
        <Menu />
      </button>
    </>
  )
}
```

## 🔘 Buttons & Actions

### Touch-Friendly Buttons
```jsx
import { Button } from '@/app/components/@system/ui/button'

// Default button (44px height on mobile)
<Button>Click Me</Button>

// Small button (40px height, still touch-friendly)
<Button size="sm">Small</Button>

// Large button (48px/56px height)
<Button size="lg">Large CTA</Button>

// Icon-only button (44px square on mobile)
<Button size="icon" variant="outline">
  <Settings className="h-4 w-4" />
</Button>
```

### Button Groups
```jsx
// Stack vertically on mobile, horizontal on desktop
<div className="mobile-button-group">
  <Button>Primary Action</Button>
  <Button variant="outline">Secondary</Button>
  <Button variant="ghost">Cancel</Button>
</div>
```

## 📄 Content Sections

### Responsive Hero Section
```jsx
import { HeroSection } from '@/app/components/@custom/HeroSection/HeroSection'

function LandingPage() {
  return (
    <HeroSection
      badge="Now in Production"
      headline="Build Amazing Products"
      subtitle="The fastest way to launch your SaaS"
      ctaLabel="Get Started Free"
      secondaryLabel="Sign In"
    />
  )
}
```

**Mobile Features:**
- Responsive text sizes (text-3xl sm:text-5xl lg:text-7xl)
- Stack buttons vertically on mobile
- Responsive padding and spacing
- Full-width buttons on mobile

### FAQ Accordion
```jsx
import { FAQ } from '@/app/components/@custom/FAQ'

function HelpPage() {
  return (
    <section>
      <FAQ />
    </section>
  )
}
```

**Mobile Features:**
- Touch-friendly expand/collapse (44px min height)
- Responsive text sizes
- Mobile-optimized padding
- Smooth animations

## 🎯 Interactive Elements

### Pagination
```jsx
import { Pagination, SimplePagination } from '@/app/components/@system/Pagination/Pagination'

// Full pagination with page numbers
<Pagination
  currentPage={page}
  totalPages={10}
  onPageChange={setPage}
/>

// Simple prev/next only
<SimplePagination
  currentPage={page}
  totalPages={10}
  onPageChange={setPage}
/>
```

**Mobile Features:**
- Larger touch targets (44px)
- Hides "Previous/Next" text on small screens
- Icon-only navigation on mobile
- Touch-friendly spacing

### Alert/Toast
```jsx
import { Alert } from '@/app/components/@system/Alert/Alert'

<Alert variant="success">
  <AlertTitle>Success!</AlertTitle>
  <AlertDescription>
    Your changes have been saved.
  </AlertDescription>
</Alert>
```

## 🎨 Utility Class Examples

### Mobile-First Spacing
```jsx
// Padding that grows with screen size
<div className="p-4 sm:p-6 lg:p-8">
  Content
</div>

// Using mobile utility
<section className="section-padding-mobile">
  Content
</section>
```

### Responsive Text
```jsx
// Manual scaling
<h1 className="text-2xl sm:text-3xl lg:text-4xl">
  Heading
</h1>

// Fluid typography (automatic scaling)
<h1 className="text-fluid-3xl">
  Heading
</h1>
```

### Conditional Visibility
```jsx
// Desktop only
<div className="mobile-hide">
  Desktop navigation
</div>

// Mobile only
<div className="mobile-only">
  Mobile menu button
</div>

// Both with custom breakpoint
<div className="hidden lg:block">
  Large screen only
</div>
```

### Horizontal Scrolling
```jsx
<div className="mobile-scroll-x">
  <div className="flex gap-4">
    <Card className="min-w-[280px]">Card 1</Card>
    <Card className="min-w-[280px]">Card 2</Card>
    <Card className="min-w-[280px]">Card 3</Card>
  </div>
</div>
```

## 🛡️ Safe Area Support (iOS Notch)

```jsx
// Header with safe area
<header className="safe-padding-top border-b">
  {/* header content */}
</header>

// Bottom navigation
<nav className="safe-padding-bottom fixed bottom-0 inset-x-0">
  {/* nav items */}
</nav>

// Full safe area padding
<main className="safe-padding-all">
  {/* content */}
</main>
```

## 📱 Complete Page Example

```jsx
import { DashboardLayout } from '@/app/components/@system/Dashboard/DashboardLayout'
import { MetricGroup, MetricCard } from '@/app/components/@system/MetricCard/MetricCard'
import { MobileTable } from '@/app/components/@system/Dashboard/MobileTable'
import { Button } from '@/app/components/@system/ui/button'
import { Plus } from 'lucide-react'

function DashboardPage() {
  return (
    <DashboardLayout>
      <DashboardLayout.Header
        title="Dashboard"
        description="Overview of your account"
        actions={
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Project</span>
          </Button>
        }
      />

      <DashboardLayout.Content>
        {/* Metrics Section */}
        <DashboardLayout.Section title="Key Metrics">
          <MetricGroup columns={3}>
            <MetricCard
              title="Revenue"
              value="$45,231"
              change={12.5}
              trend="up"
            />
            <MetricCard
              title="Users"
              value="2,543"
              change={-3.2}
              trend="down"
            />
            <MetricCard
              title="Orders"
              value="1,234"
              change={0}
              trend="neutral"
            />
          </MetricGroup>
        </DashboardLayout.Section>

        {/* Data Table Section */}
        <DashboardLayout.Section
          title="Recent Projects"
          actions={<Button variant="outline" size="sm">View All</Button>}
        >
          <MobileTable
            columns={projectColumns}
            data={projects}
            onRowClick={handleProjectClick}
          />
        </DashboardLayout.Section>
      </DashboardLayout.Content>
    </DashboardLayout>
  )
}
```

---

For more details, see [MOBILE-RESPONSIVE-GUIDE.md](./MOBILE-RESPONSIVE-GUIDE.md)
