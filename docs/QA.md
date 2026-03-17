# QA Documentation — Splice

**Product:** Splice  
**Template:** Assimetria Product Template (React + Node.js + PostgreSQL)  
**Last Updated:** 2026-03-06

---

## Testing Strategy

Splice uses a comprehensive multi-layer testing approach:

```
┌─────────────────────────────────────┐
│  E2E Tests (Playwright)             │  ← User journeys, critical flows
├─────────────────────────────────────┤
│  API Tests (Jest + Supertest)       │  ← Endpoint contracts, auth, data
├─────────────────────────────────────┤
│  Unit Tests (Jest)                  │  ← Business logic, utilities
├─────────────────────────────────────┤
│  Client Tests (Vitest + RTL)        │  ← Component behavior, hooks
└─────────────────────────────────────┘
```

### Test Commands

```bash
# Run all tests (unit + API + E2E)
npm test

# Individual test suites
npm run test:unit          # Server unit tests
npm run test:api           # API integration tests
npm run test:e2e           # E2E with Playwright (headless)
npm run test:e2e:ui        # E2E with Playwright UI
npm run test:e2e:headed    # E2E with visible browser
npm run test:client        # Client unit/component tests
npm run test:coverage      # Client tests with coverage report
```

### Coverage Requirements

| Layer | Target | Current |
|-------|--------|---------|
| Server Unit | 80% | TBD |
| Server API | 90% | TBD |
| Client Components | 75% | TBD |
| E2E Critical Paths | 100% | TBD |

---

## 1. Unit Testing (Server)

**Framework:** Jest  
**Location:** `server/src/test/unit/`

### What to Test

**Business Logic:**
- Data transformations and validation
- Utility functions in `lib/@system/`
- Custom business rules in `@custom/`

**Data Repositories:**
- `repos/@system/users-repo.js` — user CRUD operations
- `repos/@system/subscriptions-repo.js` — subscription management
- Custom repos in `@custom/` — product-specific data access

**Example Unit Test:**

```javascript
// server/src/test/unit/lib/crypto.test.js
const { encryptData, decryptData } = require('../../../lib/@system/crypto');

describe('Crypto utilities', () => {
  it('should encrypt and decrypt data symmetrically', () => {
    const plaintext = 'sensitive data';
    const encrypted = encryptData(plaintext);
    const decrypted = decryptData(encrypted);
    
    expect(encrypted).not.toBe(plaintext);
    expect(decrypted).toBe(plaintext);
  });
  
  it('should throw on invalid encrypted data', () => {
    expect(() => decryptData('invalid')).toThrow();
  });
});
```

**Run:**
```bash
npm run test:unit
```

---

## 2. API Testing

**Framework:** Jest + Supertest  
**Location:** `server/src/test/api/`

### What to Test

**Authentication Endpoints:**
- `POST /api/sessions` — login
- `GET /api/sessions/me` — get current user
- `DELETE /api/sessions` — logout

**Stripe Integration:**
- `POST /api/stripe/checkout` — create checkout session
- `POST /api/stripe/webhook` — handle Stripe events
- `POST /api/stripe/portal` — customer portal redirect

**Admin Endpoints:**
- `GET /api/admin/users` — list users (admin only)
- Role-based access control (RBAC)

**Custom Endpoints:**
- Product-specific APIs in `api/@custom/`

**Example API Test:**

```javascript
// server/src/test/api/sessions.test.js
const request = require('supertest');
const app = require('../../app');

describe('POST /api/sessions', () => {
  it('should login with valid credentials', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .send({ email: 'test@example.com', password: 'password123' });
    
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('user');
    expect(res.headers['set-cookie']).toBeDefined();
  });
  
  it('should reject invalid credentials', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .send({ email: 'test@example.com', password: 'wrong' });
    
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });
  
  it('should set secure httpOnly cookie', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .send({ email: 'test@example.com', password: 'password123' });
    
    const cookie = res.headers['set-cookie'][0];
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite');
  });
});
```

**Run:**
```bash
npm run test:api
```

---

## 3. E2E Testing (Playwright)

**Framework:** Playwright  
**Location:** `e2e/`  
**Config:** `playwright.config.ts`

### Critical User Journeys

**Authentication Flow:**
1. User visits login page
2. Enters credentials
3. Redirects to dashboard
4. Session persists across page reloads
5. Logout clears session

**Subscription Flow:**
1. User clicks "Upgrade to Pro"
2. Stripe checkout opens
3. Completes payment (test mode)
4. Redirects back with success
5. Dashboard shows Pro features

**Example E2E Test:**

```javascript
// e2e/auth.spec.js
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should login and logout successfully', async ({ page }) => {
    // Navigate to login
    await page.goto('/login');
    
    // Fill credentials
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/app/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
    
    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');
    
    // Should redirect to home
    await expect(page).toHaveURL('/');
  });
  
  test('should persist session across page reloads', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/app/dashboard');
    
    // Reload
    await page.reload();
    
    // Should still be logged in
    await expect(page).toHaveURL('/app/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });
});
```

**Run:**
```bash
npm run test:e2e              # Headless
npm run test:e2e:ui           # Playwright UI (interactive)
npm run test:e2e:headed       # Visible browser
npm run test:e2e:report       # View test report
```

### E2E Test Organization

```
e2e/
├── auth.spec.js           # Login, logout, session persistence
├── subscription.spec.js   # Stripe checkout, upgrades, cancellations
├── admin.spec.js          # Admin dashboard, user management
└── custom/                # Product-specific E2E tests
```

---

## 4. Client Testing (Vitest + React Testing Library)

**Framework:** Vitest + React Testing Library  
**Location:** `client/src/test/`

### What to Test

**Components:**
- `@system/ui/` — shadcn/ui primitives (Button, Input, Dialog)
- `@system/layout/` — Header, Footer, Layout
- `@custom/` — Product-specific components

**Hooks:**
- `hooks/use-auth.js` — authentication state
- `hooks/use-api.js` — API call wrapper
- Custom hooks in `@custom/`

**Example Component Test:**

```javascript
// client/src/test/components/Header.test.jsx
import { render, screen } from '@testing-library/react';
import { Header } from '../../app/components/@system/Header';

describe('Header', () => {
  it('should render logo and navigation', () => {
    render(<Header user={null} />);
    
    expect(screen.getByTestId('logo')).toBeInTheDocument();
    expect(screen.getByText('Sign In')).toBeInTheDocument();
  });
  
  it('should show user menu when logged in', () => {
    const user = { email: 'test@example.com', role: 'user' };
    render(<Header user={user} />);
    
    expect(screen.getByTestId('user-menu')).toBeInTheDocument();
    expect(screen.queryByText('Sign In')).not.toBeInTheDocument();
  });
});
```

**Run:**
```bash
npm run test:client         # Run tests
npm run test:coverage       # With coverage
```

---

## Security Testing

### 1. Authentication Security

**JWT RS256 Signing:**
- Private key stored in `server/.env` (`JWT_PRIVATE_KEY`)
- Public key used for verification (`JWT_PUBLIC_KEY`)
- 2048-bit RSA keypair (generated by `npm run generate-keys`)

**Cookie Security:**
```javascript
res.cookie('token', jwt, {
  httpOnly: true,     // Prevents XSS
  secure: true,       // HTTPS only (production)
  sameSite: 'strict', // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
});
```

**Test Coverage:**
- [ ] JWT expiration handling
- [ ] Invalid JWT rejection
- [ ] Cookie flags (httpOnly, secure, sameSite)
- [ ] Session fixation prevention
- [ ] CSRF token validation (if applicable)

### 2. Data Encryption

**Encryption at Rest:**
- AES-256-CBC encryption (`ENCRYPT_KEY`, `ENCRYPT_IV`)
- Sensitive user data encrypted before PostgreSQL storage

**Test Coverage:**
- [ ] Encryption/decryption symmetry
- [ ] Key rotation support
- [ ] Encrypted data format validation

### 3. SQL Injection Prevention

**Parameterized Queries:**
```javascript
// ✅ Safe (pg-promise parameterized)
db.one('SELECT * FROM users WHERE email = $1', [email]);

// ❌ Unsafe (never do this)
db.one(`SELECT * FROM users WHERE email = '${email}'`);
```

**Test Coverage:**
- [ ] All database queries use parameterization
- [ ] No string concatenation in SQL queries
- [ ] Input sanitization for user-provided data

### 4. Stripe Webhook Verification

**Signature Validation:**
```javascript
const signature = req.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(
  req.rawBody,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET
);
```

**Test Coverage:**
- [ ] Valid signature accepted
- [ ] Invalid signature rejected
- [ ] Replay attack prevention
- [ ] Event idempotency

### 5. Role-Based Access Control (RBAC)

**Admin Endpoints:**
```javascript
// Middleware: requireRole(['admin'])
router.get('/api/admin/users', requireRole(['admin']), async (req, res) => {
  // Only admin can access
});
```

**Test Coverage:**
- [ ] Admin endpoints require `role: 'admin'`
- [ ] Regular users denied access to admin routes
- [ ] Role escalation prevention

---

## Performance Benchmarks

### Server Response Times

| Endpoint | Target | P50 | P95 | P99 |
|----------|--------|-----|-----|-----|
| `GET /api/sessions/me` | <50ms | TBD | TBD | TBD |
| `POST /api/sessions` | <200ms | TBD | TBD | TBD |
| `GET /api/admin/users` | <100ms | TBD | TBD | TBD |
| `POST /api/stripe/checkout` | <500ms | TBD | TBD | TBD |

### Database Query Performance

| Query Type | Target | Current |
|------------|--------|---------|
| User lookup by email | <10ms | TBD |
| Subscription check | <20ms | TBD |
| Admin user list (paginated) | <50ms | TBD |

### Client Bundle Size

| Bundle | Target | Current |
|--------|--------|---------|
| Main JS (gzipped) | <200KB | TBD |
| Main CSS (gzipped) | <50KB | TBD |
| Total initial load | <250KB | TBD |

**Monitoring:**
```bash
cd client && npm run build
du -sh dist/assets/*.js dist/assets/*.css
```

---

## Quality Metrics

### Code Quality

**Linting:**
```bash
cd server && npm run lint       # ESLint (server)
cd client && npm run lint       # ESLint (client)
```

**Type Safety:**
- JSDoc annotations for critical functions
- TypeScript migration path (optional)

**Code Review Checklist:**
- [ ] All new code in `@custom/` (never modify `@system/`)
- [ ] Tests written for new features
- [ ] No hardcoded secrets (use `.env`)
- [ ] Database queries parameterized
- [ ] Error handling implemented

### Documentation

**Required Docs:**
- [x] README.md — Quick start guide
- [x] docs/ARCHITECTURE.md — System design
- [x] docs/QA.md — Testing strategy (this file)
- [x] docs/RUNBOOK.md — Operations guide
- [x] docs/railway-deploy.md — Deployment guide
- [x] docs/webpack-setup.md — Build configuration

### Git Hygiene

**Commit Message Format:**
```
feat(auth): add password reset flow
fix(stripe): handle webhook timeout
docs(qa): update E2E test examples
```

**Branch Strategy:**
- `main` — production-ready code
- `develop` — integration branch
- `feature/*` — new features
- `fix/*` — bug fixes

---

## CI/CD Pipeline

### Pre-Commit Checks

```bash
# Install husky (optional)
npm install --save-dev husky lint-staged

# .husky/pre-commit
npm run test:unit
npm run lint
```

### GitHub Actions (Example)

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: testpass
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          npm install
          cd server && npm install
          cd ../client && npm install
      
      - name: Run tests
        run: npm test
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### Deployment Checks (Railway)

```bash
# Build production bundle
npm run build:railway

# Verify build output
ls -lh server/public/

# Start production server (smoke test)
NODE_ENV=production npm run start:railway
```

---

## Test Data Management

### Fixtures

**Location:** `server/src/test/fixtures/`

**Example:**
```javascript
// fixtures/users.js
module.exports = {
  testUser: {
    email: 'test@example.com',
    password: 'password123', // Hashed in actual DB
    role: 'user'
  },
  adminUser: {
    email: 'admin@example.com',
    password: 'adminpass',
    role: 'admin'
  }
};
```

### Database Seeding (Test Environment)

```bash
# Seed test database
cd server && npm run db:seed:test

# Reset test database
cd server && npm run db:reset:test
```

---

## Regression Testing

### Critical Regression Tests

**Auth:**
- [ ] Login with valid credentials
- [ ] Login with invalid credentials
- [ ] Logout clears session
- [ ] Session persists across page reloads
- [ ] Expired JWT rejected

**Subscription:**
- [ ] Stripe checkout creates session
- [ ] Webhook updates subscription status
- [ ] Pro features visible after upgrade
- [ ] Free features visible after downgrade

**Admin:**
- [ ] Admin can access `/api/admin/users`
- [ ] Regular user denied access to admin routes

**Custom Features:**
- (Add product-specific regression tests here)

---

## Accessibility Testing

### WCAG 2.1 Level AA Compliance

**Tools:**
- Playwright accessibility audits
- Axe DevTools (browser extension)
- Lighthouse CI

**Example:**
```javascript
// e2e/a11y.spec.js
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('should not have accessibility violations', async ({ page }) => {
  await page.goto('/');
  
  const results = await new AxeBuilder({ page }).analyze();
  
  expect(results.violations).toEqual([]);
});
```

**Run:**
```bash
npm run test:e2e -- a11y.spec.js
```

---

## Performance Testing

### Load Testing (k6)

**Example:**
```javascript
// load-tests/auth.js
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  vus: 10,        // 10 virtual users
  duration: '30s' // 30 seconds
};

export default function() {
  let res = http.post('http://localhost:3000/api/sessions', {
    email: 'test@example.com',
    password: 'password123'
  });
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200
  });
}
```

**Run:**
```bash
k6 run load-tests/auth.js
```

---

## Monitoring & Alerts

### Production Monitoring

**Application Performance Monitoring (APM):**
- Response time tracking
- Error rate monitoring
- Database query performance

**Infrastructure:**
- Server uptime (Railway metrics)
- Database health (PostgreSQL stats)
- Stripe webhook delivery success rate

**Alerts:**
- Error rate > 1%
- Response time P95 > 500ms
- Database connection pool exhausted
- Stripe webhook failure

---

## Known Issues & Technical Debt

### Current Issues

1. **Test Coverage:**
   - [ ] Client component tests incomplete (<50% coverage)
   - [ ] E2E tests missing for subscription cancellation flow

2. **Performance:**
   - [ ] Admin user list not paginated (could timeout with >10k users)
   - [ ] No caching for repeated `/api/sessions/me` calls

3. **Security:**
   - [ ] Rate limiting not implemented on login endpoint
   - [ ] No password complexity requirements

### Planned Improvements

1. **Testing:**
   - Add snapshot tests for UI components
   - Implement visual regression testing (Percy / Chromatic)
   - Add contract tests for Stripe webhook payloads

2. **Performance:**
   - Implement Redis caching for session data
   - Add database query result caching
   - Optimize client bundle with code splitting

3. **Security:**
   - Implement rate limiting (express-rate-limit)
   - Add password strength meter
   - Implement 2FA (optional)

---

## QA Checklist (Pre-Release)

### Testing

- [ ] All unit tests passing (`npm run test:unit`)
- [ ] All API tests passing (`npm run test:api`)
- [ ] All E2E tests passing (`npm run test:e2e`)
- [ ] Client tests passing with >75% coverage (`npm run test:client`)
- [ ] Manual smoke testing completed
- [ ] Security audit passed (no critical vulnerabilities)

### Code Quality

- [ ] No linting errors (`npm run lint`)
- [ ] No console.log statements in production code
- [ ] Error handling implemented for all critical paths
- [ ] All environment variables documented in `.env.example`

### Documentation

- [ ] README.md updated with new features
- [ ] ARCHITECTURE.md reflects current system design
- [ ] QA.md updated with new test cases
- [ ] RUNBOOK.md includes new operational procedures

### Deployment

- [ ] Database migrations tested in staging
- [ ] Railway build successful (`npm run build:railway`)
- [ ] Production environment variables set
- [ ] Stripe webhook endpoint configured
- [ ] Rollback plan documented

### Post-Deployment

- [ ] Health check endpoint responding (`GET /api/health`)
- [ ] Error monitoring active (Sentry / Rollbar)
- [ ] Performance monitoring active (New Relic / DataDog)
- [ ] No critical errors in logs (first 24h)

---

## Contact & Support

**Product Owner:** (TBD)  
**Tech Lead:** (TBD)  
**QA Lead:** (TBD)

**Slack Channels:**
- `#splice-dev` — Development discussion
- `#splice-qa` — QA and testing
- `#splice-incidents` — Production issues

**Documentation:**
- README: `../README.md`
- Architecture: `./ARCHITECTURE.md`
- Runbook: `./RUNBOOK.md`
- Deployment: `./railway-deploy.md`

---

**Last Updated:** 2026-03-06  
**Version:** 1.0  
**Status:** ✅ Complete

