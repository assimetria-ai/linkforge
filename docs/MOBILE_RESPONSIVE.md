# Mobile Responsiveness Guide

This template is built mobile-first with comprehensive responsive design patterns. This guide covers best practices, utilities, and components for creating excellent mobile experiences.

## Table of Contents

- [Core Principles](#core-principles)
- [Breakpoints](#breakpoints)
- [Mobile-First Utilities](#mobile-first-utilities)
- [Touch Targets](#touch-targets)
- [Typography](#typography)
- [Layout Patterns](#layout-patterns)
- [Component Guide](#component-guide)
- [Testing](#testing)
- [Performance](#performance)

## Core Principles

### 1. Mobile-First Approach

Always start with mobile layout and progressively enhance for larger screens:

```jsx
// ✅ Good: Mobile-first
<div className="flex flex-col gap-4 sm:flex-row sm:gap-6">

// ❌ Bad: Desktop-first
<div className="flex-row gap-6 sm:flex-col sm:gap-4">
```

### 2. Touch-Friendly Targets

All interactive elements must meet WCAG 2.5.5 minimum size (44x44px):

```jsx
// ✅ Good: Touch-friendly button
<Button size="default" /> // 44px min height

// ❌ Bad: Too small for touch
<button className="h-8 px-2" /> // Only 32px
```

### 3. Content Priority

Show the most important content first on mobile:

```jsx
<MobileTable
  columns={[
    { key: 'name', label: 'Name', primary: true }, // Highlighted
    { key: 'email', label: 'Email' },
    { key: 'metadata', label: 'Metadata', hideOnMobile: true } // Hidden
  ]}
/>
```

## Breakpoints

The template uses these breakpoints (from Tailwind):

| Breakpoint | Min Width | Devices |
|------------|-----------|---------|
| `xs` | 480px | Large phones |
| `sm` | 640px | Tablets (portrait) |
| `md` | 768px | Tablets (landscape) |
| `lg` | 1024px | Laptops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Large desktops |

### Custom Breakpoints

```js
// Landscape orientation
'landscape': { 'raw': '(orientation: landscape)' }

// High-DPI displays
'retina': { 'raw': '(-webkit-min-device-pixel-ratio: 2)' }
```

## Mobile-First Utilities

### Safe Area Insets

Support for notched devices (iPhone X+):

```jsx
<div className="safe-padding-top">
  {/* Content respects notch */}
</div>

<div className="safe-padding-all">
  {/* All sides respect safe areas */}
</div>
```

### Touch Targets

```jsx
// Minimum 44x44px touch target
<button className="touch-target">
  <Icon />
</button>

// Prevent zoom on double-tap
<button className="touch-action-manipulation">
  Click me
</button>
```

### Responsive Spacing

```jsx
// Mobile: 1rem, Desktop: 2rem
<div className="px-4 sm:px-6 lg:px-8">

// Use fluid spacing utilities
<div className="mobile-spacing">
  {/* Responsive gap: 1rem → 1.5rem → 2rem */}
</div>
```

### Responsive Grids

```jsx
// Auto-fit grid (mobile-friendly)
<div className="grid-auto-fit-cards">
  {/* Cards automatically wrap */}
</div>

// Explicit columns
<div className="mobile-card-grid-3">
  {/* 1 col → 2 cols → 3 cols */}
</div>
```

### Horizontal Scroll

```jsx
// Snap-scrolling horizontal list
<div className="mobile-scroll-x">
  <div className="flex gap-4">
    {items.map(item => (
      <Card className="w-[280px] shrink-0" key={item.id}>
        {/* Fixed-width cards in scroll container */}
      </Card>
    ))}
  </div>
</div>
```

### Show/Hide on Mobile

```jsx
// Hide on mobile, show on desktop
<div className="mobile-hide">
  {/* Desktop-only content */}
</div>

// Show only on mobile
<div className="mobile-only">
  {/* Mobile-only content */}
</div>
```

## Typography

### Fluid Typography

Auto-scales between mobile and desktop:

```jsx
<h1 className="text-3xl sm:text-5xl lg:text-7xl">
  {/* 48px → 80px → 112px */}
</h1>

// Or use fluid utilities
<h1 className="text-fluid-4xl">
  {/* Smoothly scales using clamp() */}
</h1>
```

### Responsive Line Height

```jsx
<p className="text-base-fluid leading-relaxed">
  {/* Better readability on mobile */}
</p>
```

### Prevent iOS Zoom

Input font-size is automatically set to 16px to prevent iOS from zooming on focus.

## Touch Targets

All interactive elements should be at least **44x44px** for comfortable touch interaction:

```jsx
// Button component automatically enforces minimum size
<Button size="default" /> // 44px height

// Custom interactive elements
<div className="min-h-touch min-w-touch flex items-center justify-center">
  <Icon />
</div>
```

### Touch Feedback

```jsx
// Visual feedback on tap
<button className="tap-highlight active:scale-[0.98]">
  Tap me
</button>
```

## Layout Patterns

### Responsive Container

```jsx
// Auto-responsive padding
<div className="mobile-container">
  {/* 1rem → 1.5rem → 2rem padding */}
</div>
```

### Stack/Row Pattern

```jsx
// Stack on mobile, row on desktop
<div className="mobile-stack">
  <div>Item 1</div>
  <div>Item 2</div>
</div>
```

### Full-Bleed on Mobile

```jsx
// Full width on mobile, contained on desktop
<div className="mobile-full-bleed">
  {/* Extends to screen edges on mobile */}
</div>
```

### Modal/Drawer Pattern

```jsx
// Full-screen on mobile, centered on desktop
<div className="mobile-modal">
  <div className="mobile-modal-content">
    {/* Modal content */}
  </div>
</div>
```

## Component Guide

### DataTable → MobileTable

For better mobile UX, use `MobileTable` which displays rows as cards on mobile:

```jsx
import { MobileTable } from '@/app/components/@system/Dashboard/MobileTable'

<MobileTable
  columns={[
    { key: 'name', label: 'Name', primary: true },
    { key: 'email', label: 'Email', mobileLabel: 'Email' },
    { key: 'role', label: 'Role' },
    { key: 'metadata', label: 'Metadata', hideOnMobile: true }
  ]}
  data={users}
  onRowClick={(user) => navigate(`/users/${user.id}`)}
  showRowNumber
/>
```

### DashboardLayout

Built-in mobile navigation with hamburger menu:

```jsx
<DashboardLayout>
  <DashboardLayout.Header
    title="Dashboard"
    description="Overview of your account"
    actions={<Button>New Item</Button>}
  />
  <DashboardLayout.Content>
    {/* Your content */}
  </DashboardLayout.Content>
</DashboardLayout>
```

### Button Groups

Buttons stack on mobile, row on desktop:

```jsx
<div className="mobile-button-group">
  <Button>Primary</Button>
  <Button variant="outline">Secondary</Button>
</div>
```

### Forms

```jsx
<FormField label="Email" required>
  <Input
    type="email"
    placeholder="you@example.com"
    // Auto-sized for mobile (44px height)
  />
</FormField>
```

### Cards

```jsx
<Card>
  <CardHeader>
    {/* Responsive padding: p-4 sm:p-6 */}
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
  <CardFooter>
    {/* Actions (stacks on mobile) */}
  </CardFooter>
</Card>
```

## Testing

### Device Testing Checklist

Test on these viewports:

- [ ] **320px** - iPhone SE (smallest modern device)
- [ ] **375px** - iPhone 12/13 Mini
- [ ] **390px** - iPhone 12/13/14 Pro
- [ ] **414px** - iPhone 12/13/14 Pro Max
- [ ] **768px** - iPad (portrait)
- [ ] **1024px** - iPad (landscape) / Laptop

### Touch Testing

- [ ] All interactive elements are at least 44x44px
- [ ] Buttons have visible press states
- [ ] Links are easy to tap (not too close together)
- [ ] Form inputs are easy to fill out
- [ ] Scrolling is smooth (no janky animations)

### Orientation Testing

- [ ] Works in portrait mode
- [ ] Works in landscape mode
- [ ] Adapts correctly on orientation change

### Performance Testing

- [ ] First Contentful Paint < 1.8s on 3G
- [ ] Time to Interactive < 3.8s on 3G
- [ ] No layout shifts (CLS < 0.1)
- [ ] Smooth 60fps scrolling

## Performance

### Image Optimization

```jsx
// Use modern formats and lazy loading
<img
  src="/image.webp"
  alt="Description"
  loading="lazy"
  className="mobile-img-optimize"
/>
```

### Code Splitting

```jsx
// Lazy load heavy components
const HeavyComponent = lazy(() => import('./HeavyComponent'))

<Suspense fallback={<Spinner />}>
  <HeavyComponent />
</Suspense>
```

### Reduce Motion

Automatically respects user's motion preferences:

```css
/* Defined in index.css */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Best Practices

### ✅ Do's

- Start with mobile layout first
- Use semantic HTML
- Test on real devices
- Provide touch feedback
- Use system fonts for performance
- Respect safe areas on notched devices
- Support landscape orientation
- Minimize network requests
- Use progressive enhancement

### ❌ Don'ts

- Don't use hover-only interactions
- Don't make touch targets too small
- Don't hide critical content on mobile
- Don't use fixed positioning without safe areas
- Don't assume fast networks
- Don't forget to test on real devices
- Don't ignore accessibility
- Don't use auto-zoom on inputs (keep font-size ≥ 16px)

## Troubleshooting

### Horizontal Scroll Issues

```jsx
// Ensure parent containers don't overflow
<div className="max-w-full overflow-x-hidden">
  {/* Content */}
</div>
```

### Viewport Issues on iOS

```html
<!-- Already included in index.html -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

### Touch Delay on iOS

```css
/* Already applied globally in index.css */
* {
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}
```

## Resources

- [WCAG 2.5.5 - Target Size](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
- [Safe Area Insets](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)
- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/ios)
- [Material Design Mobile Guidelines](https://material.io/design/layout/responsive-layout-grid.html)

## Examples

Check out these pages for reference implementations:

- `/` - Landing page with responsive hero
- `/app` - Dashboard with mobile drawer
- `/auth` - Responsive auth forms
- Components in `/client/src/app/components/@system/`
