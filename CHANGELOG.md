# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added - API Scaffolding System (Task #9430)

#### 🔧 Complete API Development Toolkit
Production-ready utilities for building REST APIs with minimal boilerplate:

**Core Components:**
- **Pagination middleware** - Parse and validate `?page`, `?limit`, `?offset` parameters
- **Search helpers** - PostgreSQL full-text search with ILIKE/LIKE pattern matching
- **CRUD helpers** - High-level handlers for list, get, create, update, delete operations
- **Query builder** - Safe SQL query construction with parameterized queries
- **Sorting middleware** - Single and multi-field sorting with field whitelisting
- **Filtering middleware** - Type-aware filtering with advanced operators (eq, ne, gt, gte, lt, lte, in, like)
- **Response formatters** - Standardized HTTP responses (200, 201, 404, 401, 422, etc.)
- **API utilities** - Async handlers, field validation, type converters

**Files:**
- `server/src/lib/@system/Middleware/pagination.js` (91 lines)
- `server/src/lib/@system/Middleware/sorting.js` (142 lines)
- `server/src/lib/@system/Middleware/filtering.js` (245 lines)
- `server/src/lib/@system/Helpers/crud.js` (343 lines)
- `server/src/lib/@system/Helpers/search.js` (191 lines)
- `server/src/lib/@system/Helpers/query-builder.js` (259 lines)
- `server/src/lib/@system/Helpers/api-utils.js` (413 lines)
- `server/src/lib/@system/Helpers/response.js` (107 lines)
- `server/src/lib/@system/Helpers/examples.js` (462 lines)

**Features:**
- **Zero-config CRUD router** - `createCrudRouter()` generates complete REST API with one function
- **Enterprise-grade security** - SQL injection protection, field whitelisting, input sanitization
- **PostgreSQL optimized** - Native support for parameterized queries ($1, $2, etc.)
- **Type-safe** - Automatic type conversion for boolean, number, date, array fields
- **Flexible** - Works with auto-router or manual implementation
- **Well-documented** - Comprehensive guides, examples, and reference implementations

**Documentation:**
- `docs/API_PATTERNS.md` - Complete patterns guide
- `server/API_SCAFFOLDING_GUIDE.md` - Usage guide
- `server/src/lib/@system/Helpers/QUICK-START.md` - Quick start
- `server/src/lib/@system/Helpers/CHEATSHEET.md` - Reference card
- `server/src/api/@custom/todos-example.js` - Working example

**Example Usage:**
```javascript
const { createCrudRouter } = require('../../lib/@system/Helpers')

// Generates 5 endpoints with pagination, search, filtering
module.exports = createCrudRouter({
  repo: ProductRepo,
  validation: { create: CreateSchema, update: UpdateSchema },
  middleware: { create: [authenticate], delete: [requireAdmin] },
  config: { basePath: '/api/products' }
})
```

**Query Parameter Support:**
- Pagination: `?page=2&limit=20` or `?offset=40&limit=20`
- Sorting: `?sort=price&order=desc` or `?sort=name:asc,price:desc`
- Filtering: `?category=electronics&in_stock=true`
- Advanced: `?price[gte]=100&price[lte]=500&name[like]=laptop`
- Search: `?q=search+term&fields=title,content`

**Performance & Security:**
- Parameterized queries prevent SQL injection
- Field whitelisting prevents mass assignment
- Configurable limits (maxLimit: 100)
- Database indexes recommended for sort/filter fields

### Added - Core SaaS Features (Task #9431)

#### 📧 Email System
Production-ready transactional email with multi-provider support:

**Providers:**
- **Resend** (native API) - Modern transactional email service
- **SMTP** - Generic SMTP (SendGrid, Mailgun, etc.)
- **Amazon SES** - AWS email service
- **Console** - Development fallback (logs to console)

**Files:**
- `server/src/lib/@system/Email/index.js` (369 lines) - Email sender with multi-provider
- `server/src/lib/@system/Email/templates.js` (329 lines) - HTML email templates
- `server/src/lib/@system/Email/adapters/resend.js` - Resend API adapter
- `server/src/lib/@system/Email/adapters/smtp.js` - Generic SMTP adapter

**Features:**
- 6 pre-built email templates (verification, password reset, welcome, invitation, magic link, notification)
- HTML + plain text support
- Email tracking and logging
- Template variables and customization
- Webhook support for delivery status
- Automatic provider selection and fallback

**Templates:**
- Email verification with token
- Password reset with secure link
- Welcome email for new users
- Team invitation with accept link
- Magic link (passwordless login)
- Generic notification emails

**Usage:**
```javascript
const Email = require('./lib/@system/Email')

await Email.sendVerificationEmail({ to, name, token })
await Email.sendPasswordResetEmail({ to, name, token })
await Email.sendWelcomeEmail({ to, name })
await Email.sendInvitationEmail({ to, inviterName, orgName, token })
await Email.sendMagicLinkEmail({ to, name, token })
await Email.sendNotificationEmail({ to, subject, title, body, ctaLabel, ctaUrl })
```

**Configuration:**
```bash
# Resend
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM="Your App <noreply@yourdomain.com>"

# SMTP
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxxxxxx

# Amazon SES
EMAIL_PROVIDER=ses
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=AKIAxxxxxxxxx
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxx
```

#### 📁 File Upload System
Multi-provider storage with direct-to-cloud uploads:

**Providers:**
- **AWS S3** - Amazon S3 storage (120 lines)
- **Cloudflare R2** - R2 storage (127 lines)
- **Local** - Local filesystem (145 lines)
- **Unified Interface** - Provider-agnostic API (118 lines)

**Files:**
- `server/src/lib/@system/StorageAdapter/index.js` (118 lines) - Unified interface
- `server/src/lib/@system/StorageAdapter/S3StorageAdapter.js` (120 lines)
- `server/src/lib/@system/StorageAdapter/R2StorageAdapter.js` (127 lines)
- `server/src/lib/@system/StorageAdapter/LocalStorageAdapter.js` (145 lines)

**Features:**
- Presigned URLs for direct uploads (bypasses server)
- Automatic MIME type detection
- File size validation
- Path sanitization (prevents directory traversal)
- Multipart upload support
- File deletion and management
- Configurable storage limits

**Usage:**
```javascript
const StorageAdapter = require('./lib/@system/StorageAdapter')

// Generate presigned upload URL
const { url, key } = await StorageAdapter.getPresignedUploadUrl({
  filename: 'avatar.jpg',
  contentType: 'image/jpeg',
  maxSizeBytes: 5 * 1024 * 1024, // 5MB
})

// Direct file upload
const result = await StorageAdapter.uploadFile({
  buffer: fileBuffer,
  filename: 'document.pdf',
  contentType: 'application/pdf',
})

// Get public URL
const url = await StorageAdapter.getPublicUrl(key)

// Delete file
await StorageAdapter.deleteFile(key)
```

**Configuration:**
```bash
# AWS S3
STORAGE_PROVIDER=s3
AWS_S3_BUCKET=my-bucket
AWS_S3_REGION=eu-west-1
AWS_ACCESS_KEY_ID=AKIAxxxxxxxxx
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxx

# Cloudflare R2
STORAGE_PROVIDER=r2
R2_BUCKET=my-bucket
R2_ACCOUNT_ID=xxxxxxxxxxxxxxx
R2_ACCESS_KEY_ID=xxxxxxxxxxxxxxx
R2_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxx

# Local (development)
STORAGE_PROVIDER=local
LOCAL_STORAGE_PATH=./uploads
```

#### 📊 Logging System
Structured logging with Pino (industry standard):

**Files:**
- `server/src/lib/@system/Logger/index.js` (28 lines)

**Features:**
- Structured JSON logging
- Async, high-performance
- Development mode with pretty printing
- Production mode with JSON output
- Configurable log levels (trace, debug, info, warn, error, fatal)
- Request ID tracking
- Error context preservation

**Usage:**
```javascript
const logger = require('./lib/@system/Logger')

logger.info('User logged in', { userId: 42 })
logger.error({ err }, 'Request failed')
logger.debug({ query }, 'Database query')
logger.warn('Rate limit approaching', { ip: req.ip })
```

**Configuration:**
```bash
LOG_LEVEL=info              # trace|debug|info|warn|error|fatal
NODE_ENV=production         # Enables JSON logging
SERVICE_NAME=api            # Service identifier in logs
```

**Production Output:**
```json
{"level":30,"time":1234567890,"service":"api","env":"production","msg":"User logged in","userId":42}
```

**Development Output:**
```
[14:32:45] INFO: User logged in
    userId: 42
```

#### 📚 Documentation
- **`docs/SAAS_CORE_FEATURES.md`** - Comprehensive guide to email, storage, and logging
- **`docs/SAAS_FEATURES_SETUP.md`** - Quick setup guide with examples
- **`docs/SAAS_FEATURES_RESEARCH.md`** - Competitor analysis and architecture decisions

**Total Implementation:**
- Email system: 698 lines of code
- File upload: 510 lines of code
- Logging: 28 lines of code
- **Total: 1,236 lines of production-ready code**

### Added - UX Components Library (Task #9432)

#### 📊 Dashboard Components
Complete set of reusable dashboard components for building admin interfaces:

**Components:**
- **DashboardLayout** - Consistent page structure with header, sidebar, and content areas
- **StatCard & StatCardGrid** - Display key metrics with trend indicators (↑/↓) and icons
- **QuickActions** - Grid of frequently used actions with icons
- **RecentActivityList** - Chronological activity feed with timestamps and status variants
- **DataTable** - Feature-rich table with sorting, search, pagination, and custom renderers
- **WelcomeCard** - Personalized welcome message with quick actions
- **FiltersBar** - Advanced filtering UI with multiple filter types
- **BulkActions** - Multi-select actions for tables and lists
- **MobileTable** - Mobile-optimized table with horizontal scroll

**Features:**
- Responsive grid layouts (1/2/3/4 columns)
- Loading states with skeleton screens
- Empty states with clear messaging
- Trend indicators for metrics
- Custom icon support (Lucide React)
- Action buttons with callbacks
- Flexible styling via className props

#### 🚀 Onboarding System
Multi-step wizard for new user onboarding:

**Components:**
- **OnboardingWizard** - Complete 4-step onboarding flow
  - Step 1: Welcome (collect name)
  - Step 2: Use Case (understand how they'll use the app)
  - Step 3: Referral Source (track acquisition channels)
  - Step 4: Completion (smooth transition to dashboard)
- **GuidedTour** - Interactive product tour with highlights
- **ProgressChecklist** - Step-by-step setup checklist widget

**Features:**
- Visual progress indicator with step icons
- Back/forward navigation
- Skip options on all steps
- Data collection and API integration
- Completion flag tracking (`onboardingCompleted`)
- Animated transitions (Framer Motion)
- Auto-redirect on completion

**Page:**
- `OnboardingPage.jsx` - Renders wizard in centered layout
- Route: `/onboarding` (protected, skips if already completed)
- Lazy-loaded for performance

#### ⚙️ User Settings
Complete user settings interface with tabbed navigation:

**Components:**
- **UserSettings** - Main container with tab navigation (7 tabs)
- **ProfileSettings** - Name, email, bio, avatar upload, account deletion
- **SecuritySettings** - Password change, 2FA setup, active sessions, security checklist
- **NotificationSettings** - Email, in-app, push notification preferences
- **PreferencesSettings** - Theme (light/dark/system), language, timezone, date format, accessibility
- **ConnectedAccounts** - OAuth provider connections (Google, GitHub, etc.)
- **DataExport** - Export user data, GDPR compliance
- **KeyboardShortcuts** - Customizable keyboard shortcuts list

**Features:**
- Tab state synced with URL query params
- Auto-save indicators
- Form validation
- Success/error feedback
- Danger zones (account deletion)
- Two-factor authentication (QR code setup)
- Active sessions management with device detection
- Responsive design (stacked on mobile)

**Page:**
- `SettingsPage.jsx` - Integrates UserSettings component
- Route: `/app/settings?tab=profile`
- Default tab support

#### 🎨 Showcase & Documentation
- **UXPatternsPage** (`/app/ux-patterns`) - Interactive demo of all components
  - Live examples with demo data
  - Code snippets
  - Usage patterns
  - Component variations
- **UX_COMPONENTS_GUIDE.md** - Comprehensive documentation
  - Component API reference
  - Usage examples
  - Best practices
  - Customization guide
  - Responsive design patterns
  - Accessibility guidelines
  - Troubleshooting

#### 🧪 Design System Integration
All components integrate with:
- **shadcn/ui** - Button, Input, Card, Tabs primitives
- **Tailwind CSS** - Consistent spacing, colors, responsive utilities
- **Lucide React** - Beautiful icons for all components
- **Framer Motion** - Smooth animations (OnboardingWizard)

#### ♿ Accessibility
All components follow WCAG 2.1 AA standards:
- Keyboard navigation support
- ARIA labels and roles
- Focus management
- Screen reader friendly
- Color contrast compliance

#### 📱 Responsive Design
- Mobile-first approach
- Touch-friendly targets (44px minimum)
- Horizontal scroll patterns for tables
- Collapsible sections
- Mobile-optimized layouts

#### 🔧 Developer Experience
- Centralized exports via index.js files
- Consistent prop naming
- TypeScript-friendly (PropTypes where needed)
- Composable component patterns
- Clear documentation
- Interactive showcase page

### Added - Teams & Collaboration System (Task #9429)

#### 🤝 Complete Multi-Tenant Team Management
- **Database schema** for teams, team members, invitations, and activity logs
- **Role-based access control** (Owner, Admin, Member, Viewer)
- **Granular permissions system** with role-based defaults and per-user overrides
- **Team invitations** via email with secure token system (7-day expiry)
- **Activity audit trail** for all team actions with IP and user agent tracking

#### 📡 Backend API Endpoints
- **Teams CRUD**: `GET/POST/PATCH/DELETE /api/teams`
- **Member management**: `GET/PATCH/DELETE /api/teams/:id/members`
- **Invitations**: `POST/GET/DELETE /api/teams/:id/invitations`
- **Accept invitation**: `POST /api/invitations/accept/:token`
- **Activity log**: `GET /api/teams/:id/activity`
- **Permission checking**: `GET /api/teams/:id/permissions/me`

#### 🎨 Frontend Components
- **TeamList** - Display user's teams with create option
- **MemberList** - Manage team members and roles
- **InvitationManager** - Send and manage email invitations
- **CreateTeamModal** - Modal for creating new teams
- **TeamsPage** - Main teams dashboard
- **TeamDetailPage** - Detailed team view with tabs

#### 📚 Documentation
- **TEAMS_COLLABORATION_FEATURES.md** - Feature overview and architecture
- **TEAMS_COLLABORATION_GUIDE.md** - Complete integration guide
- **docs/TEAMS.md** - Full API reference

### Added - Mobile Responsiveness Enhancements (Task #9433)

#### 📱 Enhanced Mobile Meta Tags
- **Improved viewport configuration** with zoom controls and safe area support
- **PWA-ready meta tags** for iOS and Android
  - Apple mobile web app capabilities
  - Android theme color and mobile app settings
  - Color scheme support for light/dark mode
- **Disabled auto-detection** of phone numbers to prevent unwanted links
- **iPhone notch support** with `viewport-fit=cover`

#### 🎨 Comprehensive Mobile Utilities (50+ new utilities)
Added extensive mobile-first utility classes in `src/index.css`:

**Touch & Interaction:**
- `.touch-target` - Ensures minimum 44×44px touch targets (WCAG 2.1)
- `.touch-action-manipulation` - Improved touch responsiveness
- `.no-select` - Prevent text selection on interactive elements

**Safe Area Support (iPhone X+ notch):**
- `.safe-padding-top` / `.safe-padding-bottom` / `.safe-padding-x` / `.safe-padding-all`
- Automatic padding for notched devices using `env(safe-area-inset-*)`

**Layout Patterns:**
- `.mobile-stack` / `.mobile-stack-reverse` - Column on mobile, row on desktop
- `.mobile-full-bleed` - Full-width on mobile, contained on desktop
- `.mobile-grid-stack` - Responsive 1→2→3 column grid
- `.mobile-container` - Responsive container with mobile-first padding

**Scrolling:**
- `.mobile-scroll-x` - Horizontal scroll on mobile with snap points
- `.no-scrollbar` - Hide scrollbar while maintaining scroll functionality

**Visibility:**
- `.mobile-only` - Show on mobile, hide on desktop
- `.mobile-hide` - Hide on mobile, show on desktop

**Typography:**
- `.text-mobile-sm` / `.text-mobile-base` / `.text-mobile-lg` / `.text-mobile-xl`
- Responsive text with relaxed line-height for mobile readability

**Spacing:**
- `.mobile-spacing` - Responsive spacing (1rem→1.5rem→2rem)
- `.mobile-card-padding` - Responsive card padding
- `.mobile-form-layout` / `.mobile-form-row` - Optimized form layouts

**Positioning:**
- `.mobile-sticky-top` / `.mobile-sticky-bottom` - Sticky headers/footers with backdrop blur
- `.mobile-drawer` - Fullscreen on mobile, modal on desktop

**Images:**
- `.mobile-img-optimize` - Optimized image loading with content-visibility

**Aspect Ratios:**
- `.aspect-mobile-banner` - 16:9 on mobile, 21:9 on desktop
- `.aspect-mobile-card` - 4:3 on mobile, 16:9 on desktop

**Forms:**
- Enhanced checkbox/radio button sizes (20px mobile, 16px desktop)
- `.mobile-table-wrapper` - Horizontal scroll for tables on mobile

#### 📖 Documentation
- **Comprehensive Mobile Responsiveness Guide** (`docs/MOBILE_RESPONSIVENESS.md`)
  - Complete breakpoint system documentation
  - Mobile meta tags explanation
  - Touch target guidelines (WCAG 2.1)
  - Safe area support for iPhone X+
  - 50+ mobile utility classes with examples
  - Component pattern examples
  - Testing guide (browser DevTools, real device testing)
  - Best practices and troubleshooting
  - PWA implementation guide
  - Quick reference card

#### 🎯 Interactive Demo Page
- **New Mobile Responsiveness Demo** (`/app/mobile-demo`)
  - Live breakpoint detection
  - Interactive examples of all mobile utilities
  - Touch target demonstrations
  - Layout pattern showcases
  - Typography examples
  - Visibility utility demos
  - Mobile form examples
  - Modal behavior demonstration
  - Safe area support visualization
  - Mobile testing checklist

#### 🔧 Existing Components Enhanced
All existing components already had mobile responsiveness, but documentation now clarifies:
- **Header**: Hamburger menu with drawer on mobile
- **Dashboard**: Floating action button + drawer sidebar on mobile
- **Modals**: Full-screen on mobile, centered on desktop
- **Forms**: Touch-friendly inputs (44px min height)
- **Buttons**: All sizes meet touch target minimums
- **Cards**: Responsive padding (1rem→1.5rem)
- **Tables**: Horizontal scroll wrapper available
- **Navigation**: Mobile-first drawer pattern

#### 📏 Tailwind Configuration
Enhanced `tailwind.config.js` with:
- Custom `xs:` breakpoint (480px)
- Safe area spacing tokens
- Touch-friendly minimum sizes (44px)
- Mobile-optimized container padding

#### ♿ Accessibility Improvements
- All touch targets meet **WCAG 2.1 Level AAA** (44×44px minimum)
- Improved focus states with ring offsets
- Better tap highlight colors
- Enhanced keyboard navigation support
- Screen reader friendly markup

#### 🧪 Testing
- Mobile-first responsive design tested across breakpoints
- Touch target sizes verified (44px minimum)
- Safe area support tested on iPhone X+ simulators
- Horizontal scroll prevention verified
- Form usability tested on mobile devices

### Technical Details

**Files Modified:**
- `client/index.html` - Enhanced mobile meta tags
- `client/src/index.css` - Added 50+ mobile utilities
- `client/src/app/routes/@system/AppRoutes.jsx` - Added demo route

**Files Created:**
- `docs/MOBILE_RESPONSIVENESS.md` - Comprehensive documentation
- `client/src/app/pages/app/@system/MobileResponsiveDemo.jsx` - Interactive demo
- `CHANGELOG.md` - This file

**Dependencies:**
- No new dependencies required
- Leverages existing Tailwind CSS configuration

### Browser Support
- **iOS Safari**: 12+
- **Android Chrome**: 80+
- **Desktop browsers**: Modern versions (last 2 years)
- **Progressive enhancement**: Graceful degradation for older browsers

### Migration Notes
No breaking changes. All new utilities are additive and optional.

Existing components continue to work as before. Developers can now optionally use:
- New mobile utility classes for faster development
- Demo page as reference implementation
- Documentation guide for best practices

### Performance Impact
- **Zero runtime overhead** - All utilities are CSS-only
- **No JavaScript added** - Pure CSS utilities
- **Optimized for mobile** - Mobile-first reduces CSS bloat
- **Tree-shakeable** - Unused utilities are purged by Tailwind

### Developer Experience
- **Faster development** - Pre-built mobile patterns
- **Consistent patterns** - Reusable utility classes
- **Better documentation** - Comprehensive guide + demo
- **Testing tools** - Built-in checklist and examples

---

## [Previous Versions]

_(Add previous version entries here if applicable)_
