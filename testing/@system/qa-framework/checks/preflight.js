'use strict';

/**
 * Preflight checks — verifies that a deployed product is structurally sound
 * before running deeper QA checks.
 *
 * Checks:
 *  1. DB schema validation (required tables present, if --db-url provided)
 *  2. API reachability (GET /health or /api/health → 200)
 *  3. Auth login endpoint exists (/api/sessions → non-404)
 *  4. Auth register endpoint exists (/api/users → non-404)
 *  5. CSRF token endpoint (/api/csrf-token → 200)
 *  6. Required env vars documented
 *
 * Each check returns: { name, status, details, duration }
 * status: 'pass' | 'fail' | 'warn' | 'skip' | 'error'
 */

const { httpGet, result, tryCheck } = require('../utils');
const { createDbClient, checkTables } = require('../db');

const REQUIRED_TABLES = [
  'users',
  'email_verification_tokens',
  'teams',
  'team_members',
  'team_invites',
  'items',
];

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'CSRF_SECRET',
  'NODE_ENV',
  'PORT',
];

// ── Sub-checks ──────────────────────────────────────────────────────────────

async function checkDbSchema(context) {
  const { productDbUrl } = context;
  const name = 'DB Schema Validation';

  if (!productDbUrl) {
    return result(name, 'skip', 'No product DB URL provided — pass --db-url to validate schema', 0, {
      skipped: true,
    });
  }

  const start = Date.now();
  let db;
  try {
    db = await createDbClient(productDbUrl);
    if (!db) {
      return result(name, 'warn', 'Could not connect to product database — schema check skipped', Date.now() - start);
    }

    const { found, missing } = await checkTables(db, REQUIRED_TABLES);
    const duration = Date.now() - start;

    if (missing.length > 0) {
      return result(name, 'fail', `Missing tables: ${missing.join(', ')}`, duration, {
        found,
        missing,
        required: REQUIRED_TABLES,
      });
    }

    return result(name, 'pass', `All ${found.length} required tables exist`, duration, {
      tables: found,
    });
  } catch (err) {
    return result(name, 'error', err.message, Date.now() - start);
  } finally {
    if (db) await db.end();
  }
}

async function checkHealthEndpoint(context) {
  const { apiUrl } = context;
  const candidates = [`${apiUrl}/health`, `${apiUrl}/api/health`];

  return tryCheck(
    'API Health Endpoint',
    async () => {
      let lastErr;
      for (const url of candidates) {
        try {
          const res = await httpGet(url, { timeout: 8000 });
          if (res.statusCode === 200) {
            return result('API Health Endpoint', 'pass', `${url} → 200 in ${res.duration}ms`, res.duration, {
              endpoint: url,
              statusCode: 200,
            });
          }
          return result(
            'API Health Endpoint',
            'fail',
            `${url} → HTTP ${res.statusCode} (expected 200)`,
            res.duration,
            { endpoint: url, statusCode: res.statusCode }
          );
        } catch (e) {
          lastErr = e;
        }
      }
      throw lastErr || new Error('Health endpoint unreachable at /health and /api/health');
    },
    12000
  );
}

async function checkAuthEndpoints(context) {
  const { apiUrl } = context;

  const specs = [
    { path: '/api/sessions', label: 'Auth: Login Endpoint (/api/sessions)', critical: true },
    { path: '/api/users', label: 'Auth: Register Endpoint (/api/users)', critical: false },
    { path: '/api/csrf-token', label: 'Auth: CSRF Token (/api/csrf-token)', expect200: true, critical: false },
  ];

  return Promise.all(
    specs.map((spec) =>
      tryCheck(
        spec.label,
        async () => {
          const res = await httpGet(`${apiUrl}${spec.path}`, { timeout: 8000 });

          if (res.statusCode === 404) {
            // Non-critical endpoints missing = warn, critical = fail
            const severity = spec.critical ? 'fail' : 'warn';
            return result(spec.label, severity, `Endpoint missing — returned 404`, res.duration, {
              endpoint: spec.path,
              statusCode: 404,
            });
          }

          if (spec.expect200 && res.statusCode !== 200) {
            const severity = spec.critical ? 'fail' : 'warn';
            return result(
              spec.label,
              severity,
              `Expected 200, got ${res.statusCode}`,
              res.duration,
              { endpoint: spec.path, statusCode: res.statusCode }
            );
          }

          return result(spec.label, 'pass', `Endpoint exists (HTTP ${res.statusCode})`, res.duration, {
            endpoint: spec.path,
            statusCode: res.statusCode,
          });
        },
        10000
      )
    )
  );
}

function checkEnvVars(context) {
  const { envVars = {} } = context;
  const name = 'Required Env Vars';

  // When running against a remote deployment, we can't check its env vars.
  // Only validate if envVars were explicitly provided.
  if (Object.keys(envVars).length === 0) {
    return result(name, 'skip', 'Skipped — env vars not available for remote deployments', 0, {
      skipped: true,
    });
  }

  const missing = REQUIRED_ENV_VARS.filter((v) => !envVars[v]);
  if (missing.length > 0) {
    return result(name, 'warn', `Undocumented or missing: ${missing.join(', ')}`, 0, {
      missing,
      required: REQUIRED_ENV_VARS,
    });
  }
  return result(name, 'pass', `All ${REQUIRED_ENV_VARS.length} required env vars present`, 0);
}

// ── Main entry point ────────────────────────────────────────────────────────

/**
 * Run all preflight checks.
 *
 * Accepts either { apiUrl } or { url } (qa-runner passes { url, productSlug }).
 * Returns the unified format: { status, details, errors, warnings }.
 *
 * @param {object} context
 * @param {string} [context.url] - Deployed product base URL (from qa-runner)
 * @param {string} [context.apiUrl] - Deployed product API base URL (legacy)
 * @param {string} [context.productDbUrl] - Optional product database URL for schema checks
 * @param {object} [context.envVars] - Optional env var map to validate
 * @returns {Promise<{status: string, details: object, errors: string[], warnings: string[]}>}
 */
async function run(context) {
  // Normalize: qa-runner passes { url }, older callers may pass { apiUrl }
  const normalizedCtx = {
    ...context,
    apiUrl: context.apiUrl || context.url,
  };

  const [dbResult, healthResult, authResults] = await Promise.all([
    checkDbSchema(normalizedCtx),
    checkHealthEndpoint(normalizedCtx),
    checkAuthEndpoints(normalizedCtx),
  ]);

  const envResult = checkEnvVars(normalizedCtx);
  const subChecks = [dbResult, healthResult, ...authResults, envResult];

  // Aggregate into the unified format expected by qa-runner
  const errors = [];
  const warnings = [];
  const details = {};

  for (const check of subChecks) {
    details[check.name] = { status: check.status, details: check.details, duration: check.duration };
    if (check.status === 'fail' || check.status === 'error') {
      errors.push(`[${check.name}] ${check.details || 'Failed'}`);
    } else if (check.status === 'warn') {
      warnings.push(`[${check.name}] ${check.details || 'Warning'}`);
    }
  }

  const status = errors.length > 0 ? 'fail' : warnings.length > 0 ? 'warning' : 'pass';
  return { status, details, errors, warnings };
}

module.exports = { run };
