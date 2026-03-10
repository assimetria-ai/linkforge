# Mobile-First Responsive Design Guide

## Breakpoint Strategy

The product template follows a mobile-first approach with the following breakpoints:

```css
/* Mobile First Breakpoints */
--breakpoint-xs: 320px;   /* Small phones */
--breakpoint-sm: 640px;   /* Large phones */
--breakpoint-md: 768px;   /* Tablets */
--breakpoint-lg: 1024px;  /* Small desktops */
--breakpoint-xl: 1280px;  /* Large desktops */
--breakpoint-2xl: 1536px; /* Extra large screens */
```

## Responsive Patterns

### 1. Touch-Friendly Targets
All interactive elements should have minimum 44x44px touch targets:

```jsx
<button className="min-h-[44px] min-w-[44px] p-3">
  Tap Me
</button>
```

### 2. Responsive Typography
Use responsive text sizing:

```jsx
<h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl">
  Responsive Heading
</h1>
```

### 3. Flexible Layouts
Stack on mobile, grid on larger screens:

```jsx
<div className="flex flex-col sm:flex-row gap-4">
  <div>Column 1</div>
  <div>Column 2</div>
</div>
```

### 4. Mobile Navigation
Use hamburger menus and collapsible sections:

```jsx
{/* Mobile menu toggle */}
<button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden">
  <Menu />
</button>
```

## Component Guidelines

### Buttons
- **Mobile**: Full-width stacked buttons
- **Desktop**: Inline buttons with auto width

```jsx
<div className="flex flex-col sm:flex-row gap-3">
  <Button className="w-full sm:w-auto">Primary</Button>
  <Button className="w-full sm:w-auto" variant="outline">Secondary</Button>
</div>
```

### Forms
- **Mobile**: Single column, full-width inputs
- **Desktop**: Multi-column, optimized width

```jsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <input className="w-full" placeholder="First Name" />
  <input className="w-full" placeholder="Last Name" />
</div>
```

### Cards
- **Mobile**: Single column, full width
- **Tablet**: 2 columns
- **Desktop**: 3-4 columns

```jsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  <Card>Content 1</Card>
  <Card>Content 2</Card>
  <Card>Content 3</Card>
</div>
```

## Accessibility

### Screen Readers
Ensure all interactive elements have proper labels:

```jsx
<button aria-label="Close menu" onClick={handleClose}>
  <X className="h-5 w-5" />
</button>
```

### Keyboard Navigation
Maintain logical tab order and focus states:

```jsx
<button className="focus:ring-2 focus:ring-primary focus:outline-none">
  Keyboard Accessible
</button>
```

## Performance

### Image Optimization
Use responsive images with srcset:

```jsx
<img
  src="/images/hero-mobile.jpg"
  srcSet="/images/hero-mobile.jpg 640w, /images/hero-desktop.jpg 1280w"
  sizes="(max-width: 640px) 640px, 1280px"
  alt="Hero"
/>
```

### Lazy Loading
Defer non-critical content:

```jsx
<img loading="lazy" src="/images/feature.jpg" alt="Feature" />
```

## Testing Checklist

- [ ] Test on iPhone SE (375x667)
- [ ] Test on iPhone 12/13 (390x844)
- [ ] Test on iPad (768x1024)
- [ ] Test on Android phones (various sizes)
- [ ] Verify landscape orientation
- [ ] Test touch interactions
- [ ] Validate form inputs on mobile keyboards
- [ ] Check fixed/sticky elements don't overlap
- [ ] Ensure text is readable without zooming
- [ ] Verify all tap targets are 44x44px minimum

## Common Patterns

### Responsive Padding
```jsx
<section className="px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
  Content with responsive padding
</section>
```

### Responsive Width Constraints
```jsx
<div className="container mx-auto max-w-7xl px-4">
  Centered content with responsive padding
</div>
```

### Responsive Text Alignment
```jsx
<h2 className="text-center sm:text-left">
  Centered on mobile, left-aligned on desktop
</h2>
```

## Best Practices

1. **Start Mobile-First**: Design for mobile screens first, then enhance for larger screens
2. **Test Early**: Test on real devices throughout development
3. **Touch-Friendly**: Make all interactive elements easy to tap
4. **Readable Text**: Use minimum 16px font size on mobile
5. **Avoid Horizontal Scroll**: Ensure content fits within viewport
6. **Use Relative Units**: Prefer rem/em over px for better scaling
7. **Optimize Images**: Serve appropriately sized images for device
8. **Minimize Bundle Size**: Code-split and lazy-load for mobile performance

## Resources

- [MDN Responsive Design](https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design)
- [Web.dev Mobile Guidelines](https://web.dev/responsive-web-design-basics/)
- [Tailwind Responsive Design](https://tailwindcss.com/docs/responsive-design)
