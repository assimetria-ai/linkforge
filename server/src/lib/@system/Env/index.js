// @system — environment variable validation
// Called once at server startup. Fails fast with a clear error if required vars are missing.
//
// Usage:
//   require('./lib/@system/Env')          // validate and exit on error
//   const { get } = require('./lib/@system/Env')
//   get('DATABASE_URL')                   // returns validated value

const SCHEMA = [
  // ── Core ──────────────────────────────────────────────────────────────────
  {
    key: 'NODE_ENV',
    required: false,
    default: 'development',
    allowed: ['development', 'test', 'production'],
    description: 'Runtime environment',
  },
  {
    key: 'PORT',
    required: false,
    default: '4000',
    type: 'number',
    description: 'HTTP port the server listens on',
  },

  // ── Database ──────────────────────────────────────────────────────────────
  {
    key: 'DATABASE_URL',
    required: true,
    description: 'PostgreSQL connection string  e.g. postgresql://user:pass@host:5432/dbname',
  },
  {
    key: 'DB_POOL_MAX',
    required: false,
    default: '10',
    type: 'number',
    description: 'Maximum number of clients in the PostgreSQL connection pool',
  },
  {
    key: 'DB_POOL_IDLE_TIMEOUT',
    required: false,
    default: '30000',
    type: 'number',
    description: 'Milliseconds before an idle pool client is closed',
  },
  {
    key: 'DB_POOL_CONNECTION_TIMEOUT',
    required: false,
    default: '2000',
    type: 'number',
    description: 'Milliseconds to wait for an available pool client before throwing',
  },
  {
    key: 'DB_POOL_SSL',
    required: false,
    description: 'Set to "false" to disable SSL even in production (default: SSL on in production)',
  },

  // ── Redis ─────────────────────────────────────────────────────────────────
  {
    key: 'REDIS_ENABLED',
    required: false,
    default: 'true',
    allowed: ['true', 'false'],
    description: 'Set to "false" to disable Redis entirely (rate limiting falls back to in-memory)',
  },
  {
    key: 'REDIS_URL',
    required: false,
    default: 'redis://localhost:6379',
    description: 'Redis connection URL  e.g. redis://localhost:6379',
  },

  // ── Static Assets ─────────────────────────────────────────────────────────
  {
    key: 'STATIC_DIR',
    required: false,
    description: 'Path to client build output (e.g. ../client/dist). When set, validated at startup.',
  },

  // ── Auth (RS256 asymmetric key pair) ─────────────────────────────────────
  {
    key: 'JWT_PRIVATE_KEY',
    required: true,
    description: 'RSA private key PEM (with \\n line endings) — used to sign JWT tokens',
  },
  {
    key: 'JWT_PUBLIC_KEY',
    required: true,
    description: 'RSA public key PEM (with \\n line endings) — used to verify JWT tokens',
  },

  // ── App ───────────────────────────────────────────────────────────────────
  {
    key: 'APP_URL',
    required: false,
    default: 'http://localhost:5173',
    description: 'Public frontend URL (used for CORS)',
  },

  // ── OAuth ─────────────────────────────────────────────────────────────────
  {
    key: 'GOOGLE_CLIENT_ID',
    required: false,
    description: 'Google OAuth2 client ID (console.cloud.google.com)',
  },
  {
    key: 'GOOGLE_CLIENT_SECRET',
    required: false,
    description: 'Google OAuth2 client secret',
  },
  {
    key: 'GITHUB_CLIENT_ID',
    required: false,
    description: 'GitHub OAuth App client ID (github.com/settings/developers)',
  },
  {
    key: 'GITHUB_CLIENT_SECRET',
    required: false,
    description: 'GitHub OAuth App client secret',
  },
  {
    key: 'SERVER_URL',
    required: false,
    description: 'Public server URL — used to build OAuth callback URIs  e.g. https://api.example.com',
  },

  // ── CSRF ───────────────────────────────────────────────────────────────────
  // A missing or weak secret makes CSRF protection trivially bypassable in
  // production: each process restart generates a different fallback, breaking
  // token validation across replicas and redeploys.
  {
    key: 'CSRF_SECRET',
    required: false,
    requiredInProd: true,
    minLength: 32,
    minEntropy: 3.0,
    description: 'HMAC secret for CSRF token signing (≥32 hex chars, high entropy; required in production)',
  },

  // ── Stripe ────────────────────────────────────────────────────────────────
  {
    key: 'STRIPE_SECRET_KEY',
    required: false,
    description: 'Stripe secret key (sk_live_... or sk_test_...)',
  },
  {
    key: 'STRIPE_WEBHOOK_SECRET',
    required: false,
    description: 'Stripe webhook signing secret (whsec_...)',
  },

  // ── AWS / SES ─────────────────────────────────────────────────────────────
  {
    key: 'AWS_REGION',
    required: false,
    default: 'eu-west-1',
    description: 'AWS region for SES, S3 and other services',
  },
  {
    key: 'AWS_ACCESS_KEY_ID',
    required: false,
    description: 'AWS access key ID',
  },
  {
    key: 'AWS_SECRET_ACCESS_KEY',
    required: false,
    description: 'AWS secret access key',
  },
  {
    key: 'SES_FROM_EMAIL',
    required: false,
    description: 'Verified SES sender address  e.g. noreply@example.com',
  },

  // ── Email service ─────────────────────────────────────────────────────────
  {
    key: 'EMAIL_PROVIDER',
    required: false,
    allowed: ['ses', 'smtp', 'console'],
    description: 'Email transport: ses | smtp | console (auto-detected when absent)',
  },
  {
    key: 'EMAIL_FROM',
    required: false,
    description: 'Sender address used in From header  e.g. "App <noreply@example.com>"',
  },
  {
    key: 'APP_NAME',
    required: false,
    default: 'App',
    description: 'Product display name injected into email copy',
  },
  {
    key: 'SMTP_HOST',
    required: false,
    description: 'SMTP hostname  e.g. smtp.resend.com | smtp.sendgrid.net',
  },
  {
    key: 'SMTP_PORT',
    required: false,
    default: '587',
    type: 'number',
    description: 'SMTP port (587 = STARTTLS, 465 = SSL)',
  },
  {
    key: 'SMTP_USER',
    required: false,
    description: 'SMTP username / login',
  },
  {
    key: 'SMTP_PASS',
    required: false,
    description: 'SMTP password or API key',
  },
  // A weak or missing secret allows forging email tracking events and bypassing
  // /api/email-logs ingest auth. Required in production; must be 32+ chars with
  // sufficient entropy (no trivially guessable values).
  {
    key: 'EMAIL_TRACKING_SECRET',
    required: false,
    requiredInProd: true,
    minLength: 32,
    minEntropy: 3.0,
    description: 'Shared secret for the internal /api/email-logs ingest endpoint (≥32 chars, high entropy; required in production)',
  },

  // ── AWS / S3 ──────────────────────────────────────────────────────────────
  {
    key: 'S3_BUCKET',
    required: false,
    description: 'Default S3 bucket name for file storage',
  },
  {
    key: 'S3_ENDPOINT',
    required: false,
    description: 'Custom S3 endpoint URL — for MinIO / LocalStack  e.g. http://localhost:9000',
  },

  // ── AI / LLM ──────────────────────────────────────────────────────────────
  {
    key: 'OPENAI_API_KEY',
    required: false,
    description: 'OpenAI API key (sk-...) — enables /api/ai/openai/* routes',
  },
  {
    key: 'ANTHROPIC_API_KEY',
    required: false,
    description: 'Anthropic API key (sk-ant-...) — enables /api/ai/anthropic/* routes',
  },

  // ── Observability ─────────────────────────────────────────────────────────
  {
    key: 'LOG_LEVEL',
    required: false,
    default: 'info',
    allowed: ['trace', 'debug', 'info', 'warn', 'error', 'fatal'],
    description: 'Pino log level',
  },
  {
    key: 'SERVICE_NAME',
    required: false,
    default: 'server',
    description: 'Service name injected into every log line',
  },
  {
    key: 'ERROR_TRACKING_DSN',
    required: false,
    description: 'Sentry / error-tracker DSN (optional)',
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

// Compute Shannon entropy (bits per character) for a string.
// A truly random 64-char hex string scores ~4.0; a repeated char scores 0.
function computeShannonEntropy(str) {
  const freq = {}
  for (const ch of str) freq[ch] = (freq[ch] || 0) + 1
  const len = str.length
  return Object.values(freq).reduce((h, count) => {
    const p = count / len
    return h - p * Math.log2(p)
  }, 0)
}

// ── Validation ───────────────────────────────────────────────────────────────

function validate() {
  const errors = []
  const warnings = []
  const env = process.env.NODE_ENV ?? 'development'
  const isProd = env === 'production'

  for (const spec of SCHEMA) {
    const raw = process.env[spec.key]

    // Apply default when missing
    if (raw === undefined && spec.default !== undefined) {
      process.env[spec.key] = spec.default
    }

    const value = process.env[spec.key]

    // Required check
    if (spec.required && (value === undefined || value === '')) {
      errors.push(`  ✗  ${spec.key} — required but not set  (${spec.description})`)
      continue
    }

    // Production-required check
    if (spec.requiredInProd && isProd && (value === undefined || value === '')) {
      errors.push(`  ✗  ${spec.key} — required in production but not set  (${spec.description})`)
      continue
    }

    // Skip further checks when not set and not required
    if (value === undefined || value === '') continue

    // Type check
    if (spec.type === 'number' && isNaN(Number(value))) {
      errors.push(`  ✗  ${spec.key} — must be a number, got: "${value}"`)
    }

    // Allowed values check
    if (spec.allowed && !spec.allowed.includes(value)) {
      errors.push(`  ✗  ${spec.key} — must be one of [${spec.allowed.join(', ')}], got: "${value}"`)
    }

    // Min-length check
    if (spec.minLength && value.length < spec.minLength) {
      errors.push(`  ✗  ${spec.key} — must be at least ${spec.minLength} characters (got ${value.length})`)
    }

    // Entropy check — rejects trivially guessable secrets (e.g. repeated chars, sequential runs)
    if (spec.minEntropy != null) {
      const entropy = computeShannonEntropy(value)
      if (entropy < spec.minEntropy) {
        errors.push(
          `  ✗  ${spec.key} — entropy too low (${entropy.toFixed(2)} bits/char, minimum ${spec.minEntropy}) — use a randomly generated secret`,
        )
      }
    }

    // Prod-safety warning (e.g. still using placeholder values)
    if (isProd && spec.warnInProd && value.includes(spec.warnInProd)) {
      warnings.push(`  ⚠  ${spec.key} — looks like a placeholder value in production`)
    }
  }

  return { errors, warnings }
}

// ── Bootstrap (called at startup) ────────────────────────────────────────────

function bootstrap() {
  const { errors, warnings } = validate()

  if (warnings.length) {
    console.warn('\n[Env] Warnings:\n' + warnings.join('\n') + '\n')
  }

  if (errors.length) {
    console.error('\n[Env] Startup aborted — environment is misconfigured:\n')
    console.error(errors.join('\n'))
    console.error('\nCopy .env.example → .env and fill in the required values.\n')
    process.exit(1)
  }
}

// ── Accessor ─────────────────────────────────────────────────────────────────

function get(key) {
  const value = process.env[key]
  if (value === undefined) {
    throw new Error(`[Env] process.env.${key} is not set. Add it to .env and .env.example.`)
  }
  return value
}

// Run validation immediately on require()
bootstrap()

module.exports = { get, SCHEMA }
