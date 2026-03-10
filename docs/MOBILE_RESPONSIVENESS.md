# Mobile Responsiveness Guide

## Overview

This template is built with a **mobile-first approach**, meaning all components are designed to work perfectly on mobile devices first, then enhanced for larger screens. Every component includes responsive breakpoints and mobile-optimized interactions.

## Table of Contents

- [Breakpoints](#breakpoints)
- [Mobile Meta Tags](#mobile-meta-tags)
- [Touch Targets](#touch-targets)
- [Safe Areas](#safe-areas)
- [Mobile Utilities](#mobile-utilities)
- [Component Patterns](#component-patterns)
- [Testing](#testing)
- [Best Practices](#best-practices)

---

## Breakpoints

The template uses Tailwind's default responsive breakpoints plus a custom `xs` breakpoint:

| Breakpoint | Min Width | Usage |
|------------|-----------|-------|
| `xs:` | 480px | Small phones in landscape |
| `sm:` | 640px | Large phones, small tablets |
| `md:` | 768px | Tablets |
| `lg:` | 1024px | Small laptops, landscape tablets |
| `xl:` | 1280px | Desktops |
| `2xl:` | 1536px | Large desktops |

### Usage Example

```jsx
// Mobile-first: starts with mobile styles, then adds desktop
<div className="text-sm sm:text-base md:text-lg">
  Responsive Text
</div>

// Stack on mobile, row on desktop
<div className="flex flex-col sm:flex-row gap-4">
  <div>Column 1</div>
  <div>Column 2</div>
</div>
```

---

## Mobile Meta Tags

Enhanced viewport and PWA-ready meta tags are configured in `client/index.html`:

```html
<!-- Responsive viewport with zoom controls -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover" />

<!-- iOS PWA support -->
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />

<!-- Android/Chrome -->
<meta name="mobile-web-app-capable" content="yes" />
<meta name="theme-color" content="#ffffff" />
<meta name="color-scheme" content="light dark" />

<!-- Disable phone number auto-detection -->
<meta name="format-detection" content="telephone=no" />
```

### Key Features

- **viewport-fit=cover**: Supports iPhone notch and safe areas
- **maximum-scale=5.0**: Allows zoom for accessibility
- **theme-color**: Matches browser chrome to your brand
- **format-detection=no**: Prevents unwanted phone number links

---

## Touch Targets

All interactive elements meet WCAG 2.1 Level AAA standards with **minimum 44×44px touch targets**.

### Built-in Touch-Friendly Components

**Buttons**
```jsx
// All button sizes are touch-optimized
<Button size="default">  // 44px height (mobile-first)
<Button size="sm">       // 40px height
<Button size="lg">       // 48-56px height (responsive)
<Button size="icon">     // 44×44px square
```

**Form Inputs**
```jsx
// Mobile-first input height (44px min)
<Input className="h-11 sm:h-10" />
```

**Custom Touch Target Utility**
```jsx
<button className="touch-target">
  {/* Ensures min 44×44px */}
</button>
```

---

## Safe Areas

Support for iPhone notch and rounded corners using CSS environment variables.

### Utility Classes

```jsx
// Individual sides
<header className="safe-padding-top">     // Top notch/status bar
<footer className="safe-padding-bottom">  // Bottom home indicator
<div className="safe-padding-x">          // Left/right margins

// All sides
<div className="safe-padding-all">
```

### Manual Implementation

```css
.custom-element {
  padding-top: max(1rem, env(safe-area-inset-top));
  padding-bottom: max(1rem, env(safe-area-inset-bottom));
  padding-left: max(1rem, env(safe-area-inset-left));
  padding-right: max(1rem, env(safe-area-inset-right));
}
```

---

## Mobile Utilities

Comprehensive mobile-first utility classes in `src/index.css`.

### Layout Utilities

| Class | Description |
|-------|-------------|
| `mobile-stack` | Column on mobile, row on desktop |
| `mobile-stack-reverse` | Reverse column on mobile, row on desktop |
| `mobile-full-bleed` | Full-width on mobile, contained on desktop |
| `mobile-container` | Responsive container with mobile-first padding |
| `mobile-grid-stack` | 1-col → 2-col → 3-col responsive grid |

### Visibility Utilities

| Class | Description |
|-------|-------------|
| `mobile-only` | Show on mobile, hide on desktop |
| `mobile-hide` | Hide on mobile, show on desktop |

### Scroll & Overflow

| Class | Description |
|-------|-------------|
| `mobile-scroll-x` | Horizontal scroll on mobile, normal on desktop |
| `no-scrollbar` | Hide scrollbar (maintains scroll functionality) |

### Spacing & Padding

| Class | Description |
|-------|-------------|
| `mobile-spacing` | 1rem → 1.5rem → 2rem responsive spacing |
| `mobile-card-padding` | 1rem → 1.5rem → 2rem card padding |
| `mobile-form-layout` | Optimized form spacing |
| `mobile-form-row` | Stack form fields on mobile |

### Text & Typography

| Class | Description |
|-------|-------------|
| `text-mobile-sm` | Small text with relaxed line-height |
| `text-mobile-base` | Base text with relaxed line-height |
| `text-mobile-lg` | Large text (responsive: lg → xl) |
| `text-mobile-xl` | Extra-large text (responsive: xl → 2xl) |

### Positioning

| Class | Description |
|-------|-------------|
| `mobile-sticky-top` | Sticky header with backdrop blur |
| `mobile-sticky-bottom` | Sticky footer with backdrop blur |
| `mobile-drawer` | Fullscreen on mobile, modal on desktop |

---

## Component Patterns

### Responsive Navigation

**Desktop**: Horizontal nav with dropdowns  
**Mobile**: Hamburger menu with drawer

```jsx
import { Header } from '@/app/components/@system/Header/Header'

// Automatically responsive
<Header />
```

### Responsive Tables

**Desktop**: Standard table  
**Mobile**: Card-based layout or horizontal scroll

```jsx
// Option 1: Horizontal scroll
<div className="mobile-table-wrapper">
  <Table>...</Table>
</div>

// Option 2: Mobile-optimized card layout (recommended for complex data)
import { ResponsiveTable } from '@/app/components/@system/Table/ResponsiveTable'

<ResponsiveTable
  columns={columns}
  data={data}
  mobileCardRenderer={(row) => <CustomMobileCard {...row} />}
/>
```

### Responsive Forms

```jsx
// Stack fields on mobile, row on desktop
<div className="mobile-form-row">
  <FormField label="First Name" className="flex-1">
    <Input />
  </FormField>
  <FormField label="Last Name" className="flex-1">
    <Input />
  </FormField>
</div>
```

### Responsive Modals

```jsx
import { Modal } from '@/app/components/@system/Modal/Modal'

// Automatically adapts:
// - Mobile: Full-screen with slide-up animation
// - Desktop: Centered modal with backdrop
<Modal open={open} onClose={handleClose} title="Title">
  Content
</Modal>
```

### Responsive Dashboard

```jsx
import { DashboardLayout } from '@/app/components/@system/Dashboard/DashboardLayout'

<DashboardLayout>
  <DashboardLayout.Header
    title="Dashboard"
    description="Welcome back"
    actions={<Button>Action</Button>}
  />
  <DashboardLayout.Content>
    <DashboardLayout.Section title="Section">
      {content}
    </DashboardLayout.Section>
  </DashboardLayout.Content>
</DashboardLayout>
```

**Mobile**: Floating hamburger button + drawer sidebar  
**Desktop**: Persistent sidebar + header

---

## Testing

### Browser Testing

Test on real devices and browser DevTools:

#### Chrome DevTools
1. Press `F12` or `Cmd+Option+I`
2. Click device toggle icon (or `Cmd+Shift+M`)
3. Test responsive breakpoints and touch interactions

#### Recommended Test Devices
- **Mobile**: iPhone SE (375px), iPhone 14 Pro (393px), Pixel 5 (393px)
- **Tablet**: iPad Mini (744px), iPad Pro (1024px)
- **Desktop**: 1280px, 1920px

### Real Device Testing

```bash
# Run dev server accessible on local network
npm run dev -- --host

# Find your local IP
# macOS/Linux: ifconfig | grep "inet "
# Windows: ipconfig

# Access from phone: http://YOUR_IP:5173
```

### Mobile-Specific Checks

- [ ] Touch targets are at least 44×44px
- [ ] Safe areas respected on notched devices
- [ ] No horizontal scroll on mobile viewports
- [ ] Text is readable without zooming (16px+ base)
- [ ] Forms are easy to fill on mobile keyboards
- [ ] Navigation works with one thumb
- [ ] Loading states are clear
- [ ] Error messages are visible
- [ ] Images load efficiently
- [ ] Animations are performant (no jank)

### Accessibility Testing

```bash
# Install axe DevTools extension
# Test with screen reader (VoiceOver on iOS, TalkBack on Android)
```

---

## Best Practices

### 1. Mobile-First CSS

Always write mobile styles first, then add larger breakpoints:

```jsx
// ✅ Good: Mobile-first
<div className="text-sm sm:text-base lg:text-lg">

// ❌ Bad: Desktop-first
<div className="lg:text-lg md:text-base text-sm">
```

### 2. Touch-Friendly Spacing

```jsx
// ✅ Good: Adequate spacing for fat fingers
<div className="flex gap-3">
  <Button>Cancel</Button>
  <Button>Confirm</Button>
</div>

// ❌ Bad: Buttons too close
<div className="flex gap-1">
  <Button>Cancel</Button>
  <Button>Confirm</Button>
</div>
```

### 3. Readable Typography

```jsx
// ✅ Good: Readable text size with relaxed line-height
<p className="text-base leading-relaxed">

// ❌ Bad: Too small or cramped
<p className="text-xs leading-tight">
```

### 4. Optimize Images

```jsx
// ✅ Good: Responsive images
<img
  src="/image.jpg"
  srcSet="/image-small.jpg 640w, /image-large.jpg 1280w"
  sizes="(max-width: 640px) 100vw, 640px"
  alt="Description"
  className="w-full h-auto"
  loading="lazy"
/>
```

### 5. Avoid Fixed Widths

```jsx
// ✅ Good: Fluid width
<div className="w-full max-w-md">

// ❌ Bad: Fixed pixel width
<div style={{ width: 400 }}>
```

### 6. Test Real Interactions

- Test tap/click, not just hover states
- Ensure forms work with mobile keyboards
- Test swipe gestures on carousels
- Verify modals don't trap scroll

### 7. Performance Matters More on Mobile

```jsx
// ✅ Use lazy loading
import { lazy, Suspense } from 'react'
const HeavyComponent = lazy(() => import('./HeavyComponent'))

<Suspense fallback={<Spinner />}>
  <HeavyComponent />
</Suspense>

// ✅ Optimize bundle size
import { Button } from '@/components/ui/button' // Not: import * as UI from '@/components/ui'
```

### 8. Consider Network Conditions

```jsx
// Show lightweight UI on slow connections
const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
const slowConnection = connection?.effectiveType === '2g' || connection?.effectiveType === 'slow-2g'

{slowConnection ? <LightweightView /> : <FullView />}
```

---

## Advanced: Progressive Web App (PWA)

The template is PWA-ready. To enable:

1. Add `manifest.json`:
```json
{
  "name": "Your Product",
  "short_name": "Product",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

2. Add service worker (use Vite PWA plugin):
```bash
npm install vite-plugin-pwa -D
```

3. Configure in `vite.config.ts`:
```ts
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: { /* ... */ }
    })
  ]
})
```

---

## Resources

- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [Web.dev Mobile-First](https://web.dev/mobile-first/)
- [WCAG 2.1 Touch Target Size](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
- [iOS Safe Area Insets](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)
- [Chrome Mobile Emulation](https://developer.chrome.com/docs/devtools/device-mode/)

---

## Troubleshooting

### Issue: Horizontal scroll on mobile

**Solution**: Add `overflow-x-hidden` to body or container
```css
body {
  @apply overflow-x-hidden;
}
```

### Issue: Viewport too wide on iOS

**Solution**: Check for `width` values in CSS that exceed `100vw`
```css
/* ❌ Bad */
.element { width: 120vw; }

/* ✅ Good */
.element { width: 100%; max-width: 100vw; }
```

### Issue: Touch events not working

**Solution**: Add touch-action CSS
```jsx
<div className="touch-action-manipulation">
```

### Issue: Inputs zoom on iOS

**Solution**: Ensure base font-size is at least 16px
```jsx
<Input className="text-base" /> // Not text-sm
```

### Issue: Fixed elements overlap notch

**Solution**: Use safe area utilities
```jsx
<header className="fixed top-0 safe-padding-top">
```

---

## Quick Reference Card

```jsx
// Common Mobile Patterns

// 1. Stack on mobile, row on desktop
<div className="mobile-stack">...</div>

// 2. Hide on mobile
<div className="mobile-hide">...</div>

// 3. Show only on mobile
<div className="mobile-only">...</div>

// 4. Full bleed on mobile
<div className="mobile-full-bleed">...</div>

// 5. Horizontal scroll on mobile
<div className="mobile-scroll-x">...</div>

// 6. Safe area padding
<div className="safe-padding-all">...</div>

// 7. Touch-friendly button
<Button className="touch-target">...</Button>

// 8. Mobile-optimized text
<p className="text-mobile-base">...</p>

// 9. Responsive grid
<div className="mobile-grid-stack">...</div>

// 10. Sticky header
<header className="mobile-sticky-top">...</header>
```

---

**Need help?** Check the example components in `client/src/app/pages/app/@system/MobileResponsiveDemo.jsx`
