# @system/qa-framework

Automated QA suite for deployed Assimetria OS product instances.
Runs in ~60–120 seconds. Zero external dependencies beyond Playwright (already in `package.json`).

---

## Quick Start

```bash
# Run the full suite against a deployed product
node testing/@system/qa-framework/qa-runner.js <product-slug> <url>

# Examples
node testing/@system/qa-framework/qa-runner.js unosend https://unosend.up.railway.app
node testing/@system/qa-framework/qa-runner.js planora https://planora.up.railway.app

# Skip browser tests (no Chromium needed)
node testing/@system/qa-framework/qa-runner.js unosend https://... --skip-ui --skip-visual

# Write JSON report to file
node testing/@system/qa-framework/qa-runner.js unosend https://... --output ./reports/

# Use the shell wrapper (sets sensible defaults)
bash testing/@system/scripts/run-qa.sh unosend https://unosend.up.railway.app
```

---

## Architecture

```
qa-runner.js          Main orchestrator — Phase 1 (preflight gate) then Phase 2 (parallel)
reporter.js           Builds + prints + writes structured JSON reports
checks/
  preflight.js        Health, auth, DB, static assets, CORS, security headers
  api-endpoints.js    CRUD endpoint validation, auth protection, error responses
  ui-smoke.js         Playwright browser tests — login, dashboard, navigation
  performance.js      Page load time, TTFB, API latency, concurrent p95
  visual-regression.js Screenshot comparison against stored baselines
baselines/            Per-product baseline screenshots (committed to source control)
  <slug>/
    login.png
    dashboard.png
    settings.png
screenshots/          Failure screenshots (gitignored, written at runtime)
```

### Execution flow

1. **Phase 1 — Preflight (serial gate):** `preflight.js` runs first. If it fails, all further checks are skipped and the report is emitted immediately with `aborted: true`.
2. **Phase 2 — Parallel checks:** `api-endpoints`, `performance`, `ui-smoke`, and `visual-regression` run concurrently. `--skip-ui` and `--skip-visual` omit those checks.

---

## Check modules

### `checks/preflight.js`
Gate check — must pass for other checks to run.
- GET /api/health returns 200 + healthy body
- Register + login flow produces a valid JWT
- DB health (/api/health/db or health body)
- Static assets (index.html + JS/CSS bundles return 200)
- CORS headers present on /api/health
- Security headers (X-Content-Type-Options, X-Frame-Options, etc.)

### `checks/api-endpoints.js`
- Health endpoint response
- Unauthenticated access is rejected (401/403) on protected routes
- Register + Login endpoints work and return a token
- Authenticated GETs succeed with valid token
- GET/PUT /api/users/me shape validation
- GET /api/settings with auth
- Unknown routes return 404 (not 200 or 500)
- Empty login body returns 400/422 (not 200 or 500)
- Tampered JWT is rejected on protected routes

### `checks/ui-smoke.js`
Requires Playwright + Chromium. Falls back to `warning` if unavailable.
- Root page loads with non-empty body
- Login form renders (email + password inputs)
- Login flow: valid credentials redirect away from auth page
- Dashboard renders structural elements (nav, sidebar, main)
- Navigation: at least one nav link triggers a URL change

### `checks/performance.js`
All measurements use native `fetch` with `performance.now()`.
- **Page load time** — full HTML document download (threshold: `PAGE_LOAD_THRESHOLD_MS`, default 5000ms)
- **TTFB** — time to first byte via raw HTTP socket (threshold: `TTFB_THRESHOLD_MS`, default 1000ms)
- **API health latency** — GET /api/health round-trip (threshold: `API_THRESHOLD_MS`, default 2000ms)
- **Auth latency** — POST /api/sessions/login (same threshold)
- **Dashboard latency** — authenticated GET /api/users/me or /api/settings (same threshold)
- **Concurrent p95** — 10 parallel GETs to /api/health (threshold: `P95_THRESHOLD_MS`, default 3000ms)

Threshold env vars: `PAGE_LOAD_THRESHOLD_MS`, `API_THRESHOLD_MS`, `TTFB_THRESHOLD_MS`, `P95_THRESHOLD_MS`

### `checks/visual-regression.js`
Requires Playwright + Chromium. Falls back to `warning` if unavailable.
- Captures screenshots of login, dashboard, and settings pages
- Compares against baselines in `qa-framework/baselines/<slug>/`
- **First run:** saves current screenshots as baselines and warns (no comparison yet)
- **Subsequent runs:** pixel diff (via `sharp` or `jimp` if available, else SHA-256 hash)
- Diff threshold: `VISUAL_DIFF_THRESHOLD` env var (default `0.02` = 2% of pixels)
- Failing screenshots saved to `baselines/<slug>/<page>.fail.png` for review

---

## Adding a new check module

1. Create `checks/my-check.js` following this template:

```js
'use strict'

/**
 * @param {{ url: string, productSlug: string }} ctx
 * @returns {Promise<{ status: 'pass'|'fail'|'warning', details: object, errors: string[], warnings: string[] }>}
 */
async function run(ctx) {
  const { url } = ctx
  const errors = []
  const warnings = []
  const details = {}

  try {
    // ... your check logic ...
    details.result = { whatever: true }
  } catch (err) {
    errors.push(err.message)
  }

  const status = errors.length > 0 ? 'fail' : warnings.length > 0 ? 'warning' : 'pass'
  return { status, details, errors, warnings }
}

module.exports = { run }
```

2. Register it in `qa-runner.js`:

```js
const myCheck = require('./checks/my-check')
// ...
parallelTasks.push(runCheck('my-check', () => myCheck.run(ctx), checkTimeout))
```

That's it. The runner handles timeouts, error capture, and reporting automatically.

---

## Managing baselines

**Update baselines** after an intentional UI change:

```bash
# Delete existing baselines for a product
rm testing/@system/qa-framework/baselines/unosend/*.png

# Re-run — will save new baselines and warn
node testing/@system/qa-framework/qa-runner.js unosend https://...
```

**Commit baselines** to source control so CI/CD can compare consistently:

```bash
git add testing/@system/qa-framework/baselines/
git commit -m "chore: update visual regression baselines for unosend"
```

---

## CI/CD integration

```yaml
# .github/workflows/qa.yml example
- name: Run QA
  run: |
    bash testing/@system/scripts/run-qa.sh ${{ env.PRODUCT_SLUG }} ${{ env.DEPLOY_URL }}
  env:
    PAGE_LOAD_THRESHOLD_MS: 5000
    API_THRESHOLD_MS: 2000
```

The runner exits `0` on pass, `1` on any failures, `2` on fatal error.

---

## Output format

Reports are emitted as JSON to stdout and optionally written to disk via `--output`.

```json
{
  "product_slug": "unosend",
  "url": "https://unosend.up.railway.app",
  "timestamp": "2026-03-14T12:00:00.000Z",
  "duration_ms": 45210,
  "checks": [
    {
      "name": "preflight",
      "status": "pass",
      "duration_ms": 3200,
      "details": { ... },
      "errors": [],
      "warnings": []
    }
  ],
  "summary": {
    "total_checks": 5,
    "passed": 4,
    "failed": 0,
    "warnings": 1,
    "overall_status": "warning"
  }
}
```
