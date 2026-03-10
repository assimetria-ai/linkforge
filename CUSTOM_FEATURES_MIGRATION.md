# Brix Custom Features Migration Plan

Generated: 2026-02-26 23:40  
Status: Analysis complete, ready for implementation

## Overview
This document maps all custom features from legacy Brix to the new product-template-based structure.  
ALL custom code MUST go in `@custom/` directories only. NEVER modify `@system/` files.

**Brix Purpose:** No-code page builder with block-based UI and instant publishing for e-commerce stores.  
**Tagline:** Product in. Store out.  
**Core Functionality:** Users create product pages using drag-and-drop blocks, publish instantly, and track performance.

---

## Backend Custom Features

### Database Repositories (@custom/repos)
Legacy location: `legacy/brix/server/src/db/repos/@custom/`

**Required repos:**
1. **BrandRepo.js** - Brand management (core feature for multi-tenant pages)
2. **UserRepo.js** - Extended user functionality beyond auth
3. **ErrorEventRepo.js** - Error tracking persistence (Sentry-like)
4. **CollaboratorRepo.js** - Team collaboration features
5. **ApiKeyRepo.js** - API key generation and management
6. **PricingPlanRepo.js** - Pricing tiers management

### Database Migrations (@custom/migrations)
Legacy location: `legacy/brix/server/src/db/migrations/@custom/`

**Required migrations (in order):**
1. `001_error_events.js` - Error tracking table
2. `002_brands.js` - Brand management (multi-tenant)
3. `002_collaborators.js` - Team collaboration
4. `002_users_custom.js` - User extensions
5. `003_api_keys.js` - API key storage
6. `003_invitation_tokens.js` - Invite system
7. `003_full_text_search.js` - Search optimization (uses tsvector for Postgres FTS)
8. `004_pricing_plans.js` - Pricing plans storage

**⚠️ CRITICAL:** The `pages` table (core Brix feature) is **missing from migrations**. The API exists (`/api/pages`), but no migration creates the table. This MUST be added as migration `005_pages.js` based on the API structure:
- Columns: id, user_id, name, slug, template_id, blocks (JSONB), status, published_at, created_at, updated_at

### API Endpoints (@custom/api)
Legacy location: `legacy/brix/server/src/api/@custom/`

**Required API modules:**
1. **errors/** - Error tracking ingestion & dashboard
   - `POST /api/errors` - Ingest error events (DSN-protected)
   - `GET /api/errors` - List errors (admin)
   - `GET /api/errors/:id` - Get error details
   - `GET /api/errors/stats` - Error statistics
   - `PATCH /api/errors/:id/status` - Update error status

2. **pages/** - Page CRUD (CORE BRIX FEATURE)
   - `GET /api/pages` - List user's pages
   - `POST /api/pages` - Create new page
   - `PATCH /api/pages/:id` - Update page
   - `POST /api/pages/:id/publish` - Publish page
   - `DELETE /api/pages/:id` - Delete page
   - `GET /api/pages/stats` - Dashboard stats

3. **pricing/** - Pricing plans management
   - `GET /api/pricing/plans` - Public: list active plans
   - `GET /api/admin/pricing/plans` - Admin: list all plans
   - `POST /api/admin/pricing/plans` - Admin: create plan
   - `PATCH /api/admin/pricing/plans/:id` - Admin: update plan
   - `DELETE /api/admin/pricing/plans/:id` - Admin: delete plan

4. **search/** - Full-text search
   - `GET /api/search?q=term[&types=users,brands,collaborators,errors][&limit=20]` - Admin global search

### Configuration
- `server/src/config/@custom/index.js` - Product-specific config
- `server/src/scheduler/tasks/@custom/index.js` - Scheduled jobs (empty in legacy)
- `server/src/lib/@custom/index.js` - Custom utilities (empty in legacy)
- `server/src/workers/@custom/index.js` - Background workers (empty in legacy)

---

## Frontend Custom Features

### Pages (@custom/pages/app)
Legacy location: `legacy/brix/client/src/app/pages/app/@custom/`

**Required pages:**
1. **BrixDashboardPage.tsx** - Main dashboard with stats, pages list, and template picker (CORE FEATURE)
2. **ErrorTrackingPage.tsx** - Error tracking dashboard
3. **PricingPlansPage.tsx** - Admin pricing plans management

### Pages (@custom/pages/static)
Legacy location: `legacy/brix/client/src/app/pages/static/@custom/`

**Required pages:**
1. **PricingPage.tsx** - Public pricing page

### Integrations
- **Sentry** (`app/lib/@custom/sentry.ts`) - Error monitoring integration

### Routes
- `app/routes/@custom/index.tsx` - Custom route definitions

### Components & APIs
- `app/components/@custom/index.tsx` - Custom UI components (empty in legacy)
- `app/api/@custom/index.ts` - Frontend API helpers (empty in legacy)

### Configuration
- `config/@custom/info.ts` - Product metadata and branding
  - Name: "Brix"
  - Tagline: "Product in. Store out."
  - URL: getbrix.com
  - Support email: support@getbrix.com

---

## Unique Brix Features (What Makes Brix Different)

### 1. **Page Builder (Core Value Proposition)**
- Drag-and-drop block-based UI for building e-commerce product pages
- Template system (Product Landing, Coming Soon, Collection Page, Flash Sale, Brand Story, Bundle Builder)
- JSONB storage for flexible block structures
- Instant publishing workflow (draft → publish)

### 2. **Multi-Tenant Brand System**
- Brands table with slug, logo, colors, settings
- Allows multiple brands per user or team
- Brand-scoped customization

### 3. **Collaboration Features**
- Team collaboration via Collaborators table
- Invitation system with tokens

### 4. **Built-in Error Tracking**
- Custom Sentry-like error tracking system
- DSN-protected ingestion endpoint
- Error fingerprinting and grouping
- Status management (unresolved, resolved, ignored)

### 5. **Full-Text Search**
- PostgreSQL tsvector-based search across multiple entities
- Search users, brands, collaborators, and error events

### 6. **Pricing Tiers Management**
- Admin-managed pricing plans with monthly/yearly pricing
- Stripe integration readiness (price IDs, currency, limits, features)

---

## Implementation Priority

### Phase 1: Core Data Model (P0 - Critical)
- [ ] **Add missing pages migration** (`005_pages.js`) - BLOCKER!
- [ ] Migrate all existing database migrations to new structure
- [ ] Implement all @custom repos
- [ ] Test database initialization end-to-end

### Phase 2: Backend Logic (P1 - High)
- [ ] Pages API (CORE FEATURE)
- [ ] Pricing API
- [ ] Error tracking API
- [ ] Search API
- [ ] Custom config and utilities

### Phase 3: Frontend (P1 - High)
- [ ] BrixDashboardPage (MAIN INTERFACE)
- [ ] ErrorTrackingPage
- [ ] PricingPlansPage & PricingPage
- [ ] Custom routes
- [ ] Sentry integration

### Phase 4: Testing (P2 - Medium)
- [ ] Unit tests for repos
- [ ] API integration tests
- [ ] E2E tests for page builder workflow
- [ ] Test template functionality

---

## Acceptance Criteria
1. All custom features work exactly as in legacy version
2. Zero modifications to @system files
3. Pages table migration added and tested
4. Page builder workflow functional (create, edit, publish, delete)
5. Template system working
6. All tests pass
7. Dev server runs without errors
8. Database migrations execute cleanly

---

## Missing/Incomplete Features

### ⚠️ CRITICAL ISSUES:
1. **Pages table migration missing** - The `/api/pages` endpoints exist but no migration creates the table
2. **Page editor UI missing** - Only dashboard exists; no block-based editor component in codebase
3. **Template data incomplete** - Templates listed in UI but no backend storage/management

### 🔍 TO INVESTIGATE:
- Where is the page editor/builder UI? Not found in @custom directories
- How are blocks structured? API uses JSON but no schema documented
- Are templates stored in DB or hardcoded?

---

## Notes
- Legacy code location: `/Users/ruipedro/.openclaw/workspace-assimetria/legacy/brix/`
- New structure: `/Users/ruipedro/.openclaw/workspace-assimetria/brix/`
- Reference legacy files directly when implementing
- DO NOT copy-paste blindly - adapt to new template structure
- Brix is a page builder SaaS, NOT a generic product
