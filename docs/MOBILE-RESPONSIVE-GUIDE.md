# Mobile Responsive Design Guide

This product template is built with a **mobile-first** responsive design approach using Tailwind CSS. All components are optimized for touch devices and small screens while providing enhanced experiences on larger displays.

## 📱 Mobile-First Principles

### 1. Touch-Friendly Targets
All interactive elements meet WCAG 2.5.5 guidelines (minimum 44x44px):
- Buttons: `h-11` (44px) on mobile, `sm:h-10` on desktop
- Icons: `h-5 w-5` (20px minimum)
- Form inputs: `h-11` (44px) for better touch accuracy

### 2. Responsive Breakpoints
```javascript
// Tailwind breakpoints (mobile-first)
xs:  480px   // Extra small phones
sm:  640px   // Small tablets / landscape phones
md:  768px   // Tablets
lg:  1024px  // Small laptops
xl:  1280px  // Desktops
2xl: 1536px  // Large screens
```

### 3. Typography Scaling
Use responsive text classes:
```jsx
// Static sizes (manual scaling)
<h1 className="text-2xl sm:text-3xl lg:text-4xl">Headline</h1>

// Fluid typography (automatic scaling)
<h1 className="text-fluid-3xl">Headline</h1>
```

## 🎨 Component Patterns

### Responsive Cards
```jsx
<Card className="p-4 sm:p-6">
  <CardHeader>
    <CardTitle className="text-xl sm:text-2xl">Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>
```

### Mobile Menu Pattern
```jsx
{/* Desktop navigation */}
<nav className="hidden md:flex gap-4">
  {/* nav items */}
</nav>

{/* Mobile hamburger */}
<button className="md:hidden" onClick={toggleMenu}>
  <Menu className="h-5 w-5" />
</button>
```

### Responsive Grid Layouts
```jsx
{/* 1 column mobile, 2 columns tablet, 3 columns desktop */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* items */}
</div>

{/* Auto-fit responsive grid */}
<div className="grid-auto-fit-cards">
  {/* items */}
</div>
```

### Stack on Mobile, Row on Desktop
```jsx
{/* Vertical stacking on mobile, horizontal on desktop */}
<div className="mobile-stack">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

{/* Same as: */}
<div className="flex flex-col gap-4 sm:flex-row sm:items-center">
  <div>Item 1</div>
  <div>Item 2</div>
</div>
```

## 🚀 Mobile Utility Classes

### Spacing
```jsx
// Responsive padding
<div className="p-4 sm:p-6 lg:p-8">Content</div>

// Mobile-optimized section padding
<section className="section-padding-mobile">Content</section>
```

### Visibility
```jsx
// Hide on mobile, show on desktop
<div className="mobile-hide">Desktop only</div>

// Show on mobile, hide on desktop
<div className="mobile-only">Mobile only</div>
```

### Horizontal Scrolling
```jsx
// Scrollable container on mobile, normal on desktop
<div className="mobile-scroll-x">
  <div className="flex gap-4">
    {items.map(item => <Card key={item.id} />)}
  </div>
</div>
```

### Touch Targets
```jsx
// Ensure minimum 44x44px touch area
<button className="touch-target">
  <Icon className="h-4 w-4" />
</button>
```

## 📊 Data Display Patterns

### Tables
For complex tables, use horizontal scroll on mobile:
```jsx
<div className="mobile-table-wrapper">
  <div className="overflow-x-auto">
    <div className="min-w-[600px]">
      <Table>{/* content */}</Table>
    </div>
  </div>
</div>
```

Or use the mobile-optimized `MobileTable` component that switches to card view:
```jsx
<MobileTable
  columns={columns}
  data={data}
  onRowClick={handleClick}
/>
```

### Metrics/Stats
```jsx
<MetricGroup columns={3}>
  <MetricCard
    title="Revenue"
    value="$45,231"
    change={12.5}
    trend="up"
  />
  {/* more metrics */}
</MetricGroup>
```

## 🎯 Form Best Practices

### Input Sizing
```jsx
<Input
  className="h-11 sm:h-10"  // 44px mobile, 40px desktop
  type="email"
/>
```

### Button Groups
```jsx
<div className="mobile-button-group">
  <Button>Primary</Button>
  <Button variant="outline">Secondary</Button>
</div>
```

### Form Layout
```jsx
<form className="mobile-form-layout">
  {/* Vertical stacking on mobile */}
  <div className="mobile-form-row">
    <FormField label="First Name">
      <Input />
    </FormField>
    <FormField label="Last Name">
      <Input />
    </FormField>
  </div>
</form>
```

## 📲 Mobile-Specific Features

### Safe Area Support (iOS Notch)
```jsx
// Respect device safe areas
<div className="safe-padding-top">Content</div>
<div className="safe-padding-x">Content</div>
<div className="safe-padding-all">Content</div>
```

### Prevent Zoom on Input Focus (iOS)
All inputs automatically have `font-size: 16px` to prevent iOS zoom.

### Better Scrolling
```jsx
// Momentum scrolling on iOS
<div className="overflow-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
  {/* content */}
</div>
```

### Bottom Sheet/Drawer
```jsx
<div
  className="mobile-bottom-sheet"
  data-open={isOpen}
>
  {/* drawer content */}
</div>
```

## ✅ Mobile Testing Checklist

### Visual Testing
- [ ] Test on physical devices (iOS & Android)
- [ ] Test in Chrome DevTools device emulator
- [ ] Check landscape orientation
- [ ] Verify safe area insets on notched devices
- [ ] Test with different font size settings

### Interaction Testing
- [ ] All buttons/links have 44x44px minimum touch target
- [ ] Forms are easy to fill on mobile
- [ ] Horizontal scrolling works smoothly
- [ ] Dropdowns and modals are accessible
- [ ] Navigation menu opens/closes correctly

### Performance
- [ ] Images are optimized and responsive
- [ ] No horizontal overflow issues
- [ ] Smooth animations (no jank)
- [ ] Fast load times on 3G/4G

### Accessibility
- [ ] Text is readable (minimum 16px body text)
- [ ] Sufficient color contrast
- [ ] Focus states are visible
- [ ] Screen reader friendly
- [ ] Keyboard navigation works

## 🛠️ Common Mobile Issues & Solutions

### Issue: Text too small on mobile
```jsx
// ❌ Bad
<p className="text-xs">Too small</p>

// ✅ Good
<p className="text-sm sm:text-base">Readable</p>
```

### Issue: Buttons too close together
```jsx
// ❌ Bad
<div className="flex gap-1">
  <Button>A</Button><Button>B</Button>
</div>

// ✅ Good
<div className="mobile-button-group">
  <Button>A</Button><Button>B</Button>
</div>
```

### Issue: Horizontal overflow
```jsx
// ❌ Bad
<div className="flex">
  {/* many wide items */}
</div>

// ✅ Good
<div className="mobile-scroll-x">
  <div className="flex gap-4">
    {/* items */}
  </div>
</div>
```

### Issue: Modal takes full screen on mobile
```jsx
// ❌ Bad
<Dialog className="max-w-lg">
  {/* content */}
</Dialog>

// ✅ Good
<Dialog className="mobile-modal-content">
  {/* content */}
</Dialog>
```

## 📚 Resources

- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [WCAG Touch Target Size Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
- [Mobile First Design Best Practices](https://www.nngroup.com/articles/mobile-first-design/)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Material Design Touch Targets](https://material.io/design/usability/accessibility.html#layout-and-typography)

## 🔧 Development Tips

1. **Start Mobile**: Always design/build mobile view first, then enhance for larger screens
2. **Use DevTools**: Chrome DevTools device toolbar is your friend
3. **Test Early**: Don't wait until the end to test mobile
4. **Real Devices**: Emulators are good, but test on real devices when possible
5. **Performance**: Mobile users often have slower connections - optimize accordingly

---

**Need help?** Check the component documentation or refer to existing mobile-optimized components like `MobileTable`, `DashboardLayout`, or `Sidebar` for examples.
