# @system/testing — Reusable Test Infrastructure

Test infrastructure module for the product template. Provides Playwright E2E setup, API test helpers, DB seed/teardown utilities, screenshot comparison, and CI configuration.

## Structure

```
testing/@system/
  README.md                  — This file
  playwright.config.js       — Shared Playwright config (E2E)
  jest.config.js             — Shared Jest config (unit + API tests)
  helpers/
    auth.js                  — Auth helpers (login, register, get tokens)
    api-client.js            — API test client (supertest wrapper)
    db-seed.js               — DB seed & teardown utilities
    screenshots.js           — Screenshot comparison utilities
    fixtures.js              — Shared Playwright fixtures
    test-user.js             — Test user constants & factory
    mock-services.js         — Mock PostgreSQL, Redis, Email, Stripe
  ci/
    test.yml                 — GitHub Actions CI template
    docker-compose.test.yml  — Test services (PostgreSQL, Redis)
  scripts/
    setup.sh                 — Install test deps + Playwright browsers
    seed-db.sh               — Seed test database
    run-all.sh               — Run full test suite (unit + API + E2E)
```

## Quick Start

```bash
# 1. Install test dependencies
bash testing/@system/scripts/setup.sh

# 2. Run all tests
bash testing/@system/scripts/run-all.sh

# Or individually:
npm run test:unit        # Jest unit tests
npm run test:api         # Jest API tests
npm run test:e2e         # Playwright E2E tests
npm run test:screenshots # Screenshot comparison
```

## Adding to a New Product

1. The `testing/@system/` directory is included automatically when scaffolding a new product
2. Run `bash testing/@system/scripts/setup.sh` to install dependencies
3. Add product-specific tests in `server/test/@custom/` and `e2e/@custom/`

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `TEST_DATABASE_URL` | `postgresql://test:test@localhost:5433/test` | Test DB connection |
| `TEST_REDIS_URL` | `redis://localhost:6380` | Test Redis connection |
| `BASE_URL` | `http://localhost:5173` | Frontend URL for E2E |
| `API_URL` | `http://localhost:3000` | Backend URL for API tests |
| `TEST_USER_EMAIL` | `test@example.com` | E2E test user email |
| `TEST_USER_PASSWORD` | `TestPassword1!` | E2E test user password |
| `CI` | — | Set to `true` for CI mode |
| `SCREENSHOT_UPDATE` | — | Set to `true` to update baselines |
