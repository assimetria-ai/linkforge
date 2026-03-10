# Mobile Responsiveness Guide

This template has been enhanced with comprehensive mobile-first responsive design. All components and pages adapt seamlessly across devices.

## 🎯 Key Features

### 1. **Mobile-First Breakpoints**

Tailwind CSS breakpoints (defined in `client/tailwind.config.js`):
- `xs`: 480px - Extra small devices
- `sm`: 640px - Small tablets
- `md`: 768px - Tablets
- `lg`: 1024px - Desktop (sidebar switches from drawer to fixed)
- `xl`: 1280px - Large desktop
- `2xl`: 1536px - Extra large desktop

### 2. **Responsive Navigation**

#### Sidebar
- **Desktop** (`lg+`): Fixed sidebar always visible
- **Mobile** (`< lg`): Drawer that slides in from left
- Floating hamburger button (bottom-right) on mobile
- Auto-closes on navigation
- Prevents body scroll when open

#### Header
- Collapsible mobile menu with hamburger icon
- User menu adapts to drawer on mobile
- Full-width authentication buttons on mobile

### 3. **Touch-Optimized Components**

All interactive elements meet **WCAG 2.1 minimum touch target size (44x44px)**:

```jsx
// Button sizes with mobile-first approach
<Button size="default" /> // h-11 (44px)
<Button size="sm" />      // h-10 (40px) 
<Button size="lg" />      // h-12 mobile, h-14 desktop
<Button size="icon" />    // 44x44px touch target
```

#### Card Component
- Responsive padding: `p-4` mobile → `p-6` desktop
- Responsive typography
- Mobile-stacked card footers

#### Table Component
New `ResponsiveTableWrapper` for horizontal scrolling:

```jsx
import { ResponsiveTableWrapper } from '@/components/@system/Table/ResponsiveTable'

<ResponsiveTableWrapper>
  <Table>
    {/* Your table content */}
  </Table>
</ResponsiveTableWrapper>
```

Features:
- Horizontal scroll on mobile
- Full-width on desktop
- Proper borders and rounded corners
- Negative margin for edge-to-edge on mobile

### 4. **Responsive Typography**

```css
/* Mobile-optimized text utilities in index.css */
.text-mobile-sm   // text-sm with relaxed leading
.text-mobile-base // text-base with relaxed leading
.text-mobile-lg   // text-lg → text-xl (sm+)
```

Component-level responsive text:
```jsx
<h1 className="text-xl sm:text-2xl lg:text-3xl">Heading</h1>
<p className="text-sm sm:text-base">Body text</p>
```

### 5. **Modal/Dialog Responsiveness**

Modal improvements:
- Mobile: `width: calc(100% - 2rem)` (1rem margin on each side)
- Desktop: `max-w-lg`
- Max-height: `85vh` with overflow scroll
- Responsive padding: `p-4` mobile → `p-6` desktop

### 6. **Forms**

Mobile-optimized form inputs:
- Larger touch targets (min-height: 44px)
- Full-width on mobile
- Proper keyboard navigation
- Auto-focus management

### 7. **Tabs**

Horizontal scroll on mobile:
```jsx
<TabsList>
  <TabsTrigger value="members">Members</TabsTrigger>
  <TabsTrigger value="settings">Settings</TabsTrigger>
</TabsList>
```

Features:
- Scrollable on mobile (no wrap)
- Centered on desktop
- Hide scrollbar for clean look

## 📱 Mobile-Specific Utilities

### Safe Area Padding
For notched devices (iPhone X+):

```css
.safe-padding-top     // max(1rem, env(safe-area-inset-top))
.safe-padding-bottom  // max(1rem, env(safe-area-inset-bottom))
.safe-padding-x       // horizontal safe areas
```

### Stack Layout
```css
.mobile-stack // flex-col mobile → flex-row desktop
```

### Touch Targets
```css
.touch-target // min-h-touch min-w-touch (44px)
```

## 🔧 Usage Examples

### Page Layout with Mobile Sidebar

```jsx
import { useMobileSidebar } from '@/hooks/@system/useMobileSidebar'

export function MyPage() {
  const { mobileOpen, toggleMobile, closeMobile } = useMobileSidebar()
  
  return (
    <div className="flex h-screen flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        {/* Floating menu button */}
        <button
          onClick={toggleMobile}
          className="lg:hidden fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
        >
          <Menu className="h-6 w-6" />
        </button>
        
        {/* Sidebar with drawer support */}
        <Sidebar mobileOpen={mobileOpen} onMobileClose={closeMobile}>
          {/* Sidebar content */}
        </Sidebar>
        
        {/* Main content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          {/* Page content */}
        </main>
      </div>
    </div>
  )
}
```

### Responsive Grid

```jsx
<div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
  {items.map(item => (
    <Card key={item.id}>
      {/* Card content */}
    </Card>
  ))}
</div>
```

### Responsive Flex Layout

```jsx
<div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
  <div className="flex-1">Content 1</div>
  <div className="flex-1">Content 2</div>
</div>
```

## 📊 Testing

### Breakpoint Testing Checklist

Test on these viewports:
- [ ] Mobile: 375px (iPhone SE)
- [ ] Mobile: 390px (iPhone 12/13/14)
- [ ] Mobile: 414px (iPhone Plus)
- [ ] Tablet: 768px (iPad)
- [ ] Tablet: 820px (iPad Air)
- [ ] Desktop: 1024px
- [ ] Desktop: 1280px
- [ ] Wide: 1920px

### Touch Target Testing

Use Chrome DevTools mobile emulation:
1. Open DevTools (F12)
2. Toggle device toolbar (Cmd+Shift+M / Ctrl+Shift+M)
3. Enable "Show rulers" and "Show device frame"
4. Verify all buttons/links are ≥44px

### iOS Safari Specific

Check these iOS Safari quirks:
- [ ] Safe area insets (notch/home indicator)
- [ ] Fixed positioning behavior
- [ ] Viewport height with address bar
- [ ] Touch scrolling momentum

## 🚀 Performance

Mobile optimizations:
- **Lazy loading**: Offscreen images lazy-load
- **Code splitting**: React.lazy for routes
- **Responsive images**: Use `srcset` for different densities
- **Touch scrolling**: `-webkit-overflow-scrolling: touch`

## 📝 Best Practices

1. **Always use mobile-first approach**:
   ```jsx
   // ✅ Good
   className="text-sm sm:text-base"
   
   // ❌ Bad
   className="text-base sm:text-sm"
   ```

2. **Stack on mobile, row on desktop**:
   ```jsx
   className="flex flex-col sm:flex-row"
   ```

3. **Test with real devices**:
   - Emulators are not enough
   - Test on actual phones and tablets
   - Check touch interactions

4. **Consider thumb zones**:
   - Place primary actions in bottom-right (right-handed users)
   - Or center-bottom (both hands)
   - Avoid top corners on large screens

5. **Use responsive padding consistently**:
   ```jsx
   className="p-4 sm:p-6 lg:p-8"
   ```

## 🐛 Troubleshooting

### Sidebar not showing on mobile
- Verify `useMobileSidebar()` hook is imported
- Check `mobileOpen` and `onMobileClose` props are passed to `<Sidebar>`
- Ensure floating menu button is present

### Table overflowing on mobile
- Wrap table in `<ResponsiveTableWrapper>`
- Check parent containers don't have `overflow: hidden`

### Touch targets too small
- Verify minimum `h-11` (44px) on all interactive elements
- Use Button component (already optimized)
- Add `min-h-touch` class if needed

### Modal too wide on mobile
- Modal component updated to `w-[calc(100%-2rem)]`
- Check you're using the system Modal component

## 📚 Resources

- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [WCAG 2.1 Touch Target Size](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
- [iOS Safe Area](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)
- [Chrome DevTools Device Mode](https://developer.chrome.com/docs/devtools/device-mode/)
