# Middleware

System middleware for Express request handling.

## CORS (cors.js)

Task #8278: Secure CORS configuration with environment-aware origin whitelisting.

### Key Security Features

1. **No hardcoded localhost in production** — localhost origins only allowed in development
2. **Explicit origin whitelist** — never use wildcards or pattern matching
3. **Origin header required** — blocks requests without Origin header (prevents CORS bypass)
4. **Production origin validation** — APP_URL must be pre-approved in production

### Usage

```javascript
const { get } = require('./lib/@system/Env');
const { buildAllowedOrigins, createCorsMiddleware } = require('./lib/@system/Middleware/cors');

const isProd = process.env.NODE_ENV === 'production';

// Define your approved production origins
const APPROVED_ORIGINS = new Set([
  'https://app.example.com',
  'https://www.example.com',
]);

// Build allowed origins based on environment
const allowedOrigins = buildAllowedOrigins({
  isProd,
  appUrl: get('APP_URL'),
  productionOrigins: APPROVED_ORIGINS,
});

// Create and apply CORS middleware
app.use(createCorsMiddleware({ 
  allowedOrigins,
  credentials: true, // Allow cookies/auth headers
}));
```

### Environment Variables

- `APP_URL` — Frontend URL for CORS (defined in Env/index.js)
- `NODE_ENV` — Must be 'production' to enforce production-only restrictions

### Development vs Production

**Development** (`NODE_ENV !== 'production'`):
- Localhost origins (`http://localhost:*`, `http://127.0.0.1:*`) are allowed
- `APP_URL` is accepted regardless of approval status

**Production** (`NODE_ENV === 'production'`):
- Localhost origins are **blocked** (security risk)
- `APP_URL` must be in the `productionOrigins` set or it's rejected with a warning
- Only explicitly approved origins are trusted

### Adding Production Origins

Edit your app's origin whitelist:

```javascript
const APPROVED_ORIGINS = new Set([
  'https://app.example.com',
  'https://www.example.com',
  'https://api.example.com',  // ← Add new origins here
]);
```

**Never** use pattern matching, wildcards, or `endsWith()` checks — they enable credential theft.
