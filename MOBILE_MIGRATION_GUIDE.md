# Mobile Responsiveness Migration Guide

> Quick reference for updating existing components to be mobile-responsive

## When to Use This Guide

Use this guide when:
- Adding new custom components to `@custom/` directories
- Updating legacy components that lack mobile breakpoints
- Converting desktop-only designs to mobile-first

## Before You Start

✅ **Check if it's already done!** Most system components (`@system/`) are already fully responsive. Review:
- `MOBILE_RESPONSIVENESS_AUDIT.md` - List of responsive components
- `MOBILE_PATTERNS.md` - Reusable responsive patterns
- Existing `@system` components for examples

## Quick Wins Checklist

### 1. Update Container Padding
```diff
- <div className="p-8">
+ <div className="p-4 sm:p-6 lg:p-8">
```

### 2. Make Buttons Stack on Mobile
```diff
- <div className="flex gap-4">
+ <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
    <Button>Primary</Button>
    <Button>Secondary</Button>
  </div>
```

### 3. Responsive Grid Layouts
```diff
- <div className="grid grid-cols-3 gap-6">
+ <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
```

### 4. Responsive Typography
```diff
- <h1 className="text-4xl font-bold">
+ <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">

- <p className="text-base">
+ <p className="text-sm sm:text-base">
```

### 5. Touch-Friendly Targets
```diff
- <button className="h-8 w-8">
+ <button className="h-11 w-11 sm:h-9 sm:w-9">
```

## Component Migration Examples

### Example 1: Card Component

**Before (Desktop-Only)**
```jsx
export function MyCard({ title, description, action }) {
  return (
    <div className="p-6 border rounded-lg">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Button>{action}</Button>
      </div>
    </div>
  )
}
```

**After (Mobile-First)**
```jsx
export function MyCard({ title, description, action }) {
  return (
    <div className="p-4 sm:p-6 border rounded-lg">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg sm:text-xl font-semibold truncate">{title}</h3>
          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
            {description}
          </p>
        </div>
        <Button className="w-full sm:w-auto">{action}</Button>
      </div>
    </div>
  )
}
```

**Changes Made:**
- ✅ Responsive padding: `p-4 sm:p-6`
- ✅ Stacks on mobile: `flex-col sm:flex-row`
- ✅ Responsive text: `text-lg sm:text-xl`
- ✅ Full-width button on mobile: `w-full sm:w-auto`
- ✅ Text truncation: `truncate` and `line-clamp-2`

### Example 2: Form Layout

**Before (Desktop-Only)**
```jsx
export function MyForm() {
  return (
    <form className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <Input label="First Name" />
        <Input label="Last Name" />
      </div>
      <Input label="Email" />
      <div className="flex justify-end gap-2">
        <Button variant="outline">Cancel</Button>
        <Button>Submit</Button>
      </div>
    </form>
  )
}
```

**After (Mobile-First)**
```jsx
export function MyForm() {
  return (
    <form className="space-y-4 sm:space-y-5 max-w-2xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <Input label="First Name" />
        <Input label="Last Name" />
      </div>
      <Input label="Email" />
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 sm:gap-2">
        <Button variant="outline" className="w-full sm:w-auto">
          Cancel
        </Button>
        <Button className="w-full sm:w-auto">
          Submit
        </Button>
      </div>
    </form>
  )
}
```

**Changes Made:**
- ✅ Responsive spacing: `space-y-4 sm:space-y-5`
- ✅ Single column on mobile: `grid-cols-1 sm:grid-cols-2`
- ✅ Stacked buttons: `flex-col-reverse sm:flex-row`
- ✅ Full-width buttons on mobile: `w-full sm:w-auto`

### Example 3: Navigation Menu

**Before (Desktop-Only)**
```jsx
export function MyNav() {
  return (
    <nav className="flex items-center gap-6">
      <Link to="/">Home</Link>
      <Link to="/about">About</Link>
      <Link to="/contact">Contact</Link>
      <Button>Get Started</Button>
    </nav>
  )
}
```

**After (Mobile-First)**
```jsx
export function MyNav() {
  const [mobileOpen, setMobileOpen] = useState(false)
  
  return (
    <>
      {/* Desktop nav */}
      <nav className="hidden md:flex items-center gap-6">
        <Link to="/">Home</Link>
        <Link to="/about">About</Link>
        <Link to="/contact">Contact</Link>
        <Button>Get Started</Button>
      </nav>
      
      {/* Mobile hamburger */}
      <button
        className="md:hidden flex items-center justify-center h-10 w-10"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="h-6 w-6" />
      </button>
      
      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div 
            className="fixed inset-0 bg-black/50" 
            onClick={() => setMobileOpen(false)} 
          />
          <div className="fixed inset-y-0 right-0 w-full max-w-xs bg-background p-6 shadow-xl">
            <div className="flex justify-end mb-6">
              <button 
                onClick={() => setMobileOpen(false)}
                className="h-10 w-10 flex items-center justify-center"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="flex flex-col gap-4">
              <Link to="/" onClick={() => setMobileOpen(false)}>
                Home
              </Link>
              <Link to="/about" onClick={() => setMobileOpen(false)}>
                About
              </Link>
              <Link to="/contact" onClick={() => setMobileOpen(false)}>
                Contact
              </Link>
              <Button className="mt-4">Get Started</Button>
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
```

**Changes Made:**
- ✅ Hidden desktop nav: `hidden md:flex`
- ✅ Mobile hamburger button: `md:hidden`
- ✅ Mobile drawer with backdrop
- ✅ Touch-friendly close button
- ✅ Proper z-index layering

## Testing Checklist

After updating a component, test:

### Visual Testing
- [ ] Resize browser from 320px to 1920px
- [ ] Check all breakpoints (480, 640, 768, 1024, 1280)
- [ ] Verify no horizontal scrolling on any size
- [ ] Test landscape orientation on mobile

### Touch Testing (on real device or DevTools)
- [ ] All buttons are at least 44x44px
- [ ] Links and interactive elements are tap-friendly
- [ ] No accidental taps on nearby elements
- [ ] Hover states don't interfere with touch

### Content Testing
- [ ] Text is readable at all sizes (min 16px)
- [ ] Images scale appropriately
- [ ] Long text truncates or wraps properly
- [ ] No content cut off by safe area notches

### Functionality Testing
- [ ] Forms work on mobile (no zoom on input focus)
- [ ] Modals/dialogs are usable on small screens
- [ ] Tables are readable or use card view
- [ ] Navigation is accessible

## Common Issues & Fixes

### Issue 1: Content Overflow
```diff
- <div className="w-[500px]">
+ <div className="w-full max-w-[500px]">
```

### Issue 2: Tiny Touch Targets
```diff
- <button className="p-1">
+ <button className="p-3 min-h-touch min-w-touch">
```

### Issue 3: Hidden Content on Mobile
```diff
- <div className="overflow-hidden">
+ <div className="overflow-hidden sm:overflow-visible">
```

### Issue 4: Buttons Not Full Width on Mobile
```diff
- <Button>Click Me</Button>
+ <Button className="w-full sm:w-auto">Click Me</Button>
```

### Issue 5: Text Too Small on Mobile
```diff
- <p className="text-xs">
+ <p className="text-sm sm:text-xs">
```

## Mobile Utility Classes Reference

### Layout
- `mobile-stack` - Flex col → row
- `mobile-grid-stack` - 1 → 2 → 3 grid
- `mobile-container` - Responsive container
- `mobile-full-bleed` - Full width on mobile

### Spacing
- `mobile-spacing` - Responsive vertical spacing
- `mobile-card-padding` - Card padding
- `section-padding-mobile` - Section padding

### Touch
- `touch-target` - 44x44px minimum
- `touch-highlight` - Active state feedback
- `no-select` - Prevent text selection

### Display
- `mobile-hide` - Hide on mobile
- `mobile-only` - Show only on mobile
- `hidden sm:block` - Hide on mobile, show on tablet+

## Resources

- **Live Examples**: `/app/mobile-demo` (MobileResponsiveDemo page)
- **Component Library**: Check `@system` components for patterns
- **Audit Report**: `MOBILE_RESPONSIVENESS_AUDIT.md`
- **Pattern Guide**: `MOBILE_PATTERNS.md`
- **Tailwind Docs**: https://tailwindcss.com/docs/responsive-design

## Getting Help

If you're stuck:
1. Check `@system` components for similar patterns
2. Review `MOBILE_PATTERNS.md` for examples
3. Test on real devices or use Chrome DevTools device emulation
4. Follow mobile-first principle: start small, scale up

---

**Remember**: Mobile-first means:
1. Write styles for mobile first (no breakpoint)
2. Add breakpoints to scale up (sm:, md:, lg:)
3. Test on the smallest screen first (320px)
4. Progressively enhance for larger screens
