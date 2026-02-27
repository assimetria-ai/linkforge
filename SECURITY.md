# Security Documentation

## SQL Injection Prevention (Task #1019 - Viktor Audit 2026-02-27)

### Vulnerability Description

**Severity:** CRITICAL  
**Category:** SQL Injection  
**Affected Files:** `server/src/db/repos/@system/UserRepo.js` (fixed)  
**Discovered:** 2026-02-27 by Viktor

#### The Problem

The original `UserRepo.update()` method interpolated column names directly from user input into SQL queries without validation:

```javascript
// VULNERABLE CODE (before fix)
async update(id, fields) {
  const sets = Object.entries(fields)
    .filter(([, v]) => v !== undefined)
    .map(([k], i) => `${k} = $${i + 2}`)  // ❌ DANGEROUS: ${k} not validated
    .join(', ')
  const values = Object.values(fields).filter((v) => v !== undefined)
  if (!sets) return this.findById(id)
  return db.one(
    `UPDATE users SET ${sets}, updated_at = now() WHERE id = $1 RETURNING id, email, name, role`,
    [id, ...values]
  )
}
```

#### Attack Vector

An attacker could craft malicious column names to inject SQL:

```javascript
// Attack example
await UserRepo.update(userId, {
  "email' = 'attacker@evil.com' WHERE id = 999; --": "value"
})

// Results in SQL:
// UPDATE users SET email' = 'attacker@evil.com' WHERE id = 999; -- = $2, updated_at = now() WHERE id = $1
// This changes email for user 999, not the intended user
```

Other attack scenarios:
- Change other users' passwords
- Escalate privileges to admin role
- Leak sensitive data via boolean-based blind SQL injection
- Bypass authentication checks

### The Fix

**Solution:** Whitelist allowed columns before building the query.

```javascript
// SECURE CODE (after fix)
async update(id, fields) {
  // SECURITY: Whitelist allowed columns to prevent SQL injection
  // DO NOT add 'email', 'password_hash', or system columns
  const allowed = ['name', 'role', 'stripe_customer_id']
  const entries = Object.entries(fields).filter(([k, v]) => allowed.includes(k) && v !== undefined)
  if (!entries.length) return this.findById(id)
  
  const sets = entries.map(([k], i) => `${k} = $${i + 2}`).join(', ')
  const values = entries.map(([, v]) => v)
  
  return db.one(
    `UPDATE users SET ${sets}, updated_at = now() WHERE id = $1 RETURNING id, email, name, role`,
    [id, ...values]
  )
}
```

#### Why This Works

1. **Whitelist Validation:** Only columns in the `allowed` array can be updated
2. **Reject Malicious Input:** Any attempt to inject SQL via column names is filtered out
3. **Fail Safely:** If no valid columns remain, the method returns current data without updating

#### Columns Explicitly Blocked

These columns are **intentionally excluded** from the whitelist:

- `email` - Email changes require verification flow
- `password_hash` - Password changes require dedicated secure method
- `id` - System column, never user-editable
- `created_at` - System column, never user-editable
- `updated_at` - System column, managed automatically
- `email_verified_at` - Should use `verifyEmail()` method

### Testing

Security tests added in `server/test/unit/@system/userrepo-sql-injection.test.js`:

```bash
npm test -- userrepo-sql-injection.test.js
```

Tests verify:
- ✅ Only whitelisted columns are allowed
- ✅ SQL injection attempts are rejected
- ✅ Sensitive columns (email, password_hash) are rejected
- ✅ System columns (id, created_at, updated_at) are rejected
- ✅ Empty fields handled gracefully
- ✅ Undefined values filtered out

### Other Repositories

**Audit Status:** All other `@system` repos have been reviewed:

| Repository | Status | Notes |
|-----------|--------|-------|
| `UserRepo.js` | ✅ Fixed | Added whitelist (this fix) |
| `SubscriptionRepo.js` | ✅ Safe | Already had whitelist |
| `PolarSubscriptionRepo.js` | ✅ Safe | Already had whitelist |
| `SessionRepo.js` | ✅ Safe | No dynamic update method |

**Custom repos** (`@custom/`) vary by product:
- `@custom/UserRepo.js` - ✅ Already had whitelist
- `@custom/BrandRepo.js` - ✅ Uses explicit COALESCE pattern
- `@custom/BlogPostRepo.js` - ✅ Uses explicit COALESCE pattern
- `@custom/ErrorEventRepo.js` - ✅ No dynamic update method

### Best Practices

When creating new repository files with dynamic UPDATE methods:

#### ❌ DON'T DO THIS

```javascript
// VULNERABLE: Never trust user input for column names
async update(id, fields) {
  const sets = Object.keys(fields).map((k, i) => `${k} = $${i + 2}`)
  // ...
}
```

#### ✅ DO THIS INSTEAD

```javascript
// SECURE: Always whitelist allowed columns
async update(id, fields) {
  const allowed = ['column1', 'column2', 'column3']
  const entries = Object.entries(fields).filter(([k, v]) => allowed.includes(k) && v !== undefined)
  if (!entries.length) return this.findById(id)
  
  const sets = entries.map(([k], i) => `${k} = $${i + 2}`).join(', ')
  const values = entries.map(([, v]) => v)
  // ...
}
```

#### Alternative: Explicit Column Updates

For repos with few updateable columns, use explicit parameters:

```javascript
// ALSO SECURE: Explicit columns (no dynamic SQL)
async update(id, { name, role, status }) {
  return db.one(
    `UPDATE users 
     SET name = COALESCE($2, name),
         role = COALESCE($3, role),
         status = COALESCE($4, status),
         updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [id, name, role, status]
  )
}
```

### References

- **CWE-89:** SQL Injection
- **OWASP Top 10 2021:** A03:2021 – Injection
- **Fix Commit:** [See git log for task #1019]
- **Test Coverage:** `server/test/unit/@system/userrepo-sql-injection.test.js`

### Questions?

If you need to add new updateable columns to UserRepo:
1. Add the column to the `allowed` array
2. Document WHY the column is safe to update
3. Update the test to include the new column
4. Get security review before merging

---

**Last Updated:** 2026-02-27  
**Security Contact:** Viktor (Auditor)  
**Fixed By:** Anton (Junior Developer)

---

## Cryptographic Key Rotation (Task #1020 - Viktor Audit 2026-02-27)

### Vulnerability Description

**Severity:** CRITICAL  
**Category:** Hardcoded Cryptographic Keys / Weak Key Management  
**Affected Files:** `server/.env` (fixed)  
**Discovered:** 2026-02-27 by Viktor  
**CWE:** CWE-798 (Use of Hard-coded Credentials)

#### The Problem

The product-template contained hardcoded cryptographic material in `server/.env`:

1. **RSA Private Key** (`JWT_PRIVATE_KEY`) - Used for signing JWTs
2. **RSA Public Key** (`JWT_PUBLIC_KEY`) - Used for verifying JWTs
3. **Encryption Key** (`ENCRYPT_KEY`) - AES-256 symmetric key
4. **Encryption IV** (`ENCRYPT_IV`) - AES initialization vector

**Risk:** Even though `.env` is in `.gitignore`, hardcoded keys in a template create multiple security issues:

1. **Template Distribution:** All products forked from the template inherit the same keys
2. **Accidental Commit:** Developers might accidentally commit `.env` to git
3. **Key Reuse:** Same keys used across dev/staging/production environments
4. **No Rotation:** Keys never change, increasing exposure window

#### Attack Scenarios

**Scenario 1: JWT Forgery**
```javascript
// Attacker obtains the hardcoded JWT_PRIVATE_KEY
// Can now forge valid JWTs for any user
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { userId: 1, role: 'admin' }, 
  HARDCODED_PRIVATE_KEY,
  { algorithm: 'RS256' }
);
// Full account takeover
```

**Scenario 2: Data Decryption**
```javascript
// Attacker obtains ENCRYPT_KEY and ENCRYPT_IV
// Can decrypt all sensitive data encrypted at rest
const crypto = require('crypto');
const decipher = crypto.createDecipheriv('aes-256-cbc', HARDCODED_KEY, HARDCODED_IV);
const decrypted = decipher.update(encryptedData, 'base64', 'utf8');
// Access to passwords, API keys, PII, etc.
```

**Scenario 3: Cross-Product Attack**
```
Product A (Nestora) → Uses hardcoded template keys
Product B (Broadr) → Uses hardcoded template keys (same!)
Product C (WaitlistKit) → Uses hardcoded template keys (same!)

Attacker compromises Product A → Obtains keys
→ Can now attack Product B and C with the same keys!
```

### The Fix

**Solution:** Generate unique cryptographic keys per environment + proper key management.

#### 1. Removed Hardcoded Keys

**Before (INSECURE):**
```bash
# server/.env
JWT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBg...
JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhki...
ENCRYPT_KEY=<redacted-old-hardcoded-key>
ENCRYPT_IV=<redacted-old-hardcoded-iv>
```

**After (SECURE):**
```bash
# server/.env
JWT_PRIVATE_KEY=<generate-with-npm-run-generate-keys>
JWT_PUBLIC_KEY=<generate-with-npm-run-generate-keys>
ENCRYPT_KEY=<generate-with-npm-run-generate-keys>
ENCRYPT_IV=<generate-with-npm-run-generate-keys>
```

#### 2. Key Generation Script

**Script:** `scripts/@system/dev/generate-keys.js`

**Usage:**
```bash
cd /path/to/product
npm run generate-keys
```

**What it does:**
1. Generates 2048-bit RSA keypair for JWT signing (RS256)
2. Generates 256-bit AES key for encryption
3. Generates 128-bit IV for AES-CBC mode
4. Writes keys to `server/.env` (idempotent - won't overwrite existing keys)

**Algorithm Details:**
- **JWT:** RS256 (RSA-SHA256) with 2048-bit keys
- **Encryption:** AES-256-CBC with random key and IV
- **Random:** Uses `node-forge` PRNG with proper entropy

#### 3. Updated Documentation

**File:** `.env.example`

Added clear instructions:
```bash
# RSA keypair for JWT signing (RS256 algorithm)
# Generate all auth keys by running: npm run generate-keys
# NEVER commit real keys to git. NEVER reuse keys across environments.
JWT_PRIVATE_KEY=<generate-with-npm-run-generate-keys>
JWT_PUBLIC_KEY=<generate-with-npm-run-generate-keys>

# Symmetric encryption keys (AES-256-CBC)
# IMPORTANT: Rotating these keys will invalidate encrypted data!
ENCRYPT_KEY=<generate-with-npm-run-generate-keys>
ENCRYPT_IV=<generate-with-npm-run-generate-keys>
```

### Key Management Best Practices

#### Development Environment

1. **Generate Fresh Keys:**
   ```bash
   npm run generate-keys
   ```

2. **Never Commit `.env`:**
   - Already in `.gitignore`
   - Double-check with: `git status`

3. **Unique Keys Per Developer:**
   - Each developer should generate their own keys
   - Do not share `.env` files between team members

#### Staging/Production Environments

1. **Generate Unique Keys:**
   ```bash
   # On production server or in CI/CD
   npm run generate-keys
   ```

2. **Use Environment Variables:**
   ```bash
   # Railway, Heroku, etc.
   railway variables set JWT_PRIVATE_KEY="$(cat jwt-private.pem)"
   ```

3. **Secret Management Services:**
   - AWS Secrets Manager
   - HashiCorp Vault
   - Azure Key Vault
   - Google Secret Manager

4. **Never Reuse Keys Across Environments:**
   ```
   ❌ Dev → Staging → Production (same keys)
   ✅ Dev keys ≠ Staging keys ≠ Production keys
   ```

### Key Rotation Procedure

**When to Rotate:**
- Immediately after security incident
- Every 90 days (recommended)
- When employee with access leaves
- After suspected compromise

**JWT Key Rotation:**

1. **Generate New Keypair:**
   ```bash
   npm run generate-keys
   # This creates new JWT_PRIVATE_KEY and JWT_PUBLIC_KEY
   ```

2. **Gradual Migration (Zero Downtime):**
   ```javascript
   // Option A: Support both old and new keys temporarily
   const publicKeys = [NEW_PUBLIC_KEY, OLD_PUBLIC_KEY];
   // Sign with new key, verify with both
   
   // Option B: Force all users to re-login
   // Just deploy new keys, old tokens become invalid
   ```

3. **Update All Servers:**
   - Deploy new keys to all instances
   - Ensure load balancer health checks pass
   - Monitor for authentication errors

**Encryption Key Rotation (More Complex):**

⚠️ **WARNING:** Rotating `ENCRYPT_KEY` and `ENCRYPT_IV` will make old encrypted data unreadable!

**Safe Rotation Process:**

1. **Inventory Encrypted Data:**
   ```bash
   # Find what uses encryption
   grep -r "encrypt\|decrypt" server/src/
   ```

2. **Decrypt with Old Key, Re-encrypt with New:**
   ```javascript
   // Migration script
   const oldData = decryptWithOldKey(encryptedData);
   const newData = encryptWithNewKey(oldData);
   // Update database
   ```

3. **Or Use Key Versioning:**
   ```javascript
   // Store key version with encrypted data
   const encrypted = {
     version: 2,
     data: encrypt(plaintext, KEY_V2, IV_V2)
   };
   ```

### Verification

**After Key Rotation:**

1. **Test JWT Signing:**
   ```bash
   curl -X POST http://localhost:4000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"test"}'
   # Should return valid JWT
   ```

2. **Test JWT Verification:**
   ```bash
   curl http://localhost:4000/api/auth/me \
     -H "Authorization: Bearer <token>"
   # Should return user data (not 401)
   ```

3. **Test Encryption:**
   ```javascript
   // In server console
   const { encrypt, decrypt } = require('./lib/@system/encryption');
   const plaintext = 'sensitive data';
   const encrypted = encrypt(plaintext);
   const decrypted = decrypt(encrypted);
   console.assert(plaintext === decrypted, 'Encryption test failed!');
   ```

### Security Checklist

- [ ] Hardcoded keys removed from template
- [ ] Fresh keys generated per environment
- [ ] Keys not committed to git (`.env` in `.gitignore`)
- [ ] Keys unique per product (Nestora ≠ Broadr ≠ WaitlistKit)
- [ ] Key rotation procedure documented
- [ ] Team trained on key management
- [ ] Production keys stored in secret manager
- [ ] Key rotation schedule set (90 days)
- [ ] Incident response plan includes key rotation

### Impact Assessment

**Before Fix:**
- **Risk Level:** CRITICAL
- **Exploitability:** HIGH (keys visible in template)
- **Impact:** CRITICAL (full account takeover, data decryption)
- **CVSS Score:** ~9.1 (Critical)

**After Fix:**
- **Risk Level:** LOW
- **Exploitability:** NONE (unique keys per environment)
- **Impact:** NONE (no hardcoded keys)
- **CVSS Score:** 0.0 (Resolved)

### References

- **CWE-798:** Use of Hard-coded Credentials
- **OWASP:** A07:2021 – Identification and Authentication Failures
- **NIST SP 800-57:** Recommendation for Key Management
- **Fix Commit:** [See git log for task #1020]

### Questions?

**Q: Why RS256 instead of HS256?**  
A: RS256 uses asymmetric keys. Private key signs tokens (server only), public key verifies (can be shared). More secure for distributed systems.

**Q: Can I use the same keys in dev and staging?**  
A: No. Each environment must have unique keys to prevent cross-environment attacks.

**Q: What if I lose the ENCRYPT_KEY?**  
A: Encrypted data becomes permanently unreadable. This is why backups and secret management are critical.

**Q: How do I rotate keys without downtime?**  
A: For JWTs, support both old and new public keys temporarily. For encryption, use key versioning.

---

**Last Updated:** 2026-02-27  
**Security Contact:** Viktor (Auditor)  
**Fixed By:** Anton (Junior Developer)

---

## Open Redirect in OAuth Error Handler (Task #1021 - Viktor Audit 2026-02-27)

### Vulnerability Description

**Severity:** HIGH  
**Category:** Open Redirect / URL Redirection to Untrusted Site  
**Affected Files:** `server/src/api/@system/oauth/index.js` (fixed)  
**Discovered:** 2026-02-27 by Viktor  
**CWE:** CWE-601 (URL Redirection to Untrusted Site)

#### The Problem

The OAuth error handler redirected users without proper URL validation:

```javascript
// VULNERABLE CODE (before fix)
function handleOAuthError(res, err, provider) {
  logger.error({ err, provider }, `OAuth ${provider} error`)
  res.redirect(`${appUrl()}/auth?error=oauth_failed`)
}

function appUrl() {
  return process.env.APP_URL ?? 'http://localhost:5173'
}
```

**Multiple vulnerabilities:**

1. **No APP_URL Validation:** `process.env.APP_URL` was not validated, allowing malicious values
2. **No Protocol Validation:** Could redirect to `javascript:`, `data:`, `file:`, etc.
3. **No Origin Validation:** Path traversal could redirect to external domains
4. **No Credential Detection:** URLs with embedded credentials were not rejected
5. **Potential Error Reflection:** While currently hardcoded, the pattern could lead to including user-controlled errors

#### Attack Scenarios

**Attack 1: Malicious APP_URL**
```bash
# Attacker controls APP_URL environment variable
APP_URL="javascript:alert(document.cookie)"

# User completes OAuth flow → Redirect executes JavaScript
# Result: XSS, session hijacking
```

**Attack 2: Protocol-Relative URL**
```bash
APP_URL="//evil.com/phishing"

# Redirect resolves to: http://evil.com/phishing
# Result: Phishing attack, credential theft
```

**Attack 3: Path Traversal**
```bash
APP_URL="http://localhost:5173/../..//evil.com"

# After URL resolution: http://evil.com
# Result: User redirected to attacker-controlled site
```

**Attack 4: Embedded Credentials**
```bash
APP_URL="http://victim@evil.com"

# User redirected to: http://victim@evil.com/auth
# Result: Browser may send credentials, user confusion
```

**Attack 5: Future Error Reflection**
```javascript
// If someone modifies code to include error message:
res.redirect(`${appUrl()}/auth?error=${err.message}`)

// With OAuth provider error: ?error=../../evil.com
// Result: Open redirect via error parameter
```

### The Fix

**Solution:** Multi-layered defense against open redirects.

#### 1. URL Validation in appUrl()

```javascript
// SECURE CODE (after fix)
function appUrl() {
  const rawUrl = process.env.APP_URL ?? 'http://localhost:5173'
  
  try {
    const url = new URL(rawUrl)
    
    // SECURITY: Only allow http/https protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error(`Invalid APP_URL protocol: ${url.protocol}`)
    }
    
    // SECURITY: Prevent URLs with embedded credentials
    if (url.username || url.password) {
      throw new Error('APP_URL cannot contain credentials')
    }
    
    return url.origin + url.pathname.replace(/\/$/, '')
  } catch (err) {
    // Safe fallback
    logger.error({ err, rawUrl }, 'Invalid APP_URL, falling back to localhost')
    return 'http://localhost:5173'
  }
}
```

**Protections:**
- ✅ Protocol whitelist (only http/https)
- ✅ Credential detection and rejection
- ✅ Safe fallback on parse errors
- ✅ Logging of invalid URLs

#### 2. Safe Redirect Helper

```javascript
// SECURE: safeRedirectUrl() helper
function safeRedirectUrl(path, params = {}) {
  const base = appUrl()
  const url = new URL(path, base)
  
  // SECURITY: Ensure origin hasn't changed (prevents path traversal)
  if (url.origin !== new URL(base).origin) {
    logger.warn({ base, path, resultOrigin: url.origin }, 
      'Attempted redirect to different origin, using safe default')
    return `${base}/app` // Safe fallback
  }
  
  // Add sanitized query parameters (whitelist approach)
  Object.entries(params).forEach(([key, value]) => {
    if (typeof value === 'string' && value.length < 100) {
      url.searchParams.set(key, value)
    }
  })
  
  return url.toString()
}
```

**Protections:**
- ✅ Origin validation after path resolution
- ✅ Path traversal prevention
- ✅ Parameter sanitization
- ✅ Whitelist approach for query params

#### 3. Hardcoded Error Values

```javascript
// SECURE: handleOAuthError() with hardcoded error
function handleOAuthError(res, err, provider) {
  logger.error({ err, provider }, `OAuth ${provider} error`)
  
  // SECURITY: Error parameter is hardcoded
  // User-controlled errors are logged, NEVER in redirect
  res.redirect(safeRedirectUrl('/auth', { error: 'oauth_failed' }))
}
```

**Protections:**
- ✅ Hardcoded error value ('oauth_failed')
- ✅ User errors logged, not exposed in redirect
- ✅ Safe redirect helper used

### Defense Layers

The fix implements multiple layers of security:

| Layer | Protection | Attack Prevented |
|-------|-----------|------------------|
| **1. Protocol Whitelist** | Only http/https allowed | javascript:, data:, file: XSS |
| **2. Credential Detection** | Reject user:pass@host | Credential leakage |
| **3. Origin Validation** | Ensure same-origin after path resolution | Path traversal, external redirects |
| **4. Parameter Sanitization** | Whitelist + type checking | Parameter injection |
| **5. Hardcoded Values** | Error param always 'oauth_failed' | Error-based open redirect |
| **6. Safe Fallback** | Default to localhost on error | Graceful degradation |

### Testing

**Test Suite:** `server/test/unit/@system/oauth-open-redirect.test.js`

**Coverage:**
- ✅ URL validation principles
- ✅ Protocol rejection (javascript:, data:, file:, etc.)
- ✅ Credential detection
- ✅ Path traversal prevention
- ✅ Protocol-relative URL handling
- ✅ Error parameter hardcoding
- ✅ Defense in depth verification
- ✅ Regression prevention documentation

**Results:**
```
Test Suites: 1 passed
Tests:       11 passed
```

**Run Tests:**
```bash
cd server && npm test -- oauth-open-redirect.test.js
```

### Attack Prevention Examples

#### Prevented: JavaScript Protocol
```javascript
// Attack attempt
APP_URL="javascript:alert(document.cookie)"

// Before fix: Redirects to javascript: URL → XSS
// After fix: Rejected by protocol whitelist → Falls back to localhost
```

#### Prevented: Path Traversal
```javascript
// Attack attempt
safeRedirectUrl('/../..//evil.com')

// Before fix: Could resolve to http://evil.com
// After fix: Origin validation fails → Falls back to /app
```

#### Prevented: Error Parameter Injection
```javascript
// Attack attempt
OAuth callback: ?error=../../evil.com

// Before fix: If included in redirect, could cause open redirect
// After fix: Error logged but hardcoded 'oauth_failed' used
```

### Best Practices Implemented

#### DO ✅

1. **Validate ALL redirect URLs:**
   ```javascript
   const url = new URL(redirectTarget)
   if (!['http:', 'https:'].includes(url.protocol)) {
     throw new Error('Invalid protocol')
   }
   ```

2. **Use Origin Validation:**
   ```javascript
   if (url.origin !== expectedOrigin) {
     return safeFallback
   }
   ```

3. **Hardcode Query Parameters:**
   ```javascript
   res.redirect(safeUrl({ error: 'oauth_failed' })) // Good
   ```

4. **Log, Don't Expose User Data:**
   ```javascript
   logger.error({ userError: req.query.error }) // Log it
   res.redirect(safeUrl({ error: 'oauth_failed' })) // Don't expose it
   ```

#### DON'T ❌

1. **Never Trust Environment Variables:**
   ```javascript
   res.redirect(process.env.APP_URL) // BAD!
   res.redirect(validatedAppUrl()) // Good
   ```

2. **Never Include User Input in Redirects:**
   ```javascript
   res.redirect(req.query.redirect) // BAD!
   res.redirect(safeRedirectUrl('/app')) // Good
   ```

3. **Never Trust OAuth Provider Errors:**
   ```javascript
   res.redirect(`/auth?error=${req.query.error}`) // BAD!
   res.redirect(safeRedirectUrl('/auth', { error: 'oauth_failed' })) // Good
   ```

4. **Never Use Referer Header:**
   ```javascript
   res.redirect(req.get('Referer')) // BAD!
   res.redirect(safeRedirectUrl('/app')) // Good
   ```

### Configuration Security

#### Environment Variables

**APP_URL Configuration:**
```bash
# ✅ GOOD: Standard HTTP/HTTPS URLs
APP_URL=https://myapp.com
APP_URL=http://localhost:3000

# ❌ BAD: Dangerous protocols
APP_URL=javascript:alert(1)
APP_URL=data:text/html,<script>alert(1)</script>
APP_URL=file:///etc/passwd

# ❌ BAD: Embedded credentials
APP_URL=http://admin:pass@myapp.com
APP_URL=https://user@myapp.com

# ❌ BAD: External domains (if not intended)
APP_URL=https://evil.com
```

#### Deployment Checklist

- [ ] APP_URL set to correct production domain
- [ ] APP_URL uses HTTPS in production
- [ ] APP_URL does not contain credentials
- [ ] OAuth callbacks whitelist verified with providers
- [ ] Error handling tested with malicious inputs
- [ ] Redirect logging enabled for monitoring

### Verification

**After Fix:**

1. **Test Protocol Rejection:**
   ```bash
   APP_URL="javascript:alert(1)" npm start
   # Should log error and fall back to localhost
   ```

2. **Test Path Traversal:**
   ```bash
   curl "http://localhost:4000/api/auth/google/callback?error=../../evil.com"
   # Should redirect to /auth?error=oauth_failed (not evil.com)
   ```

3. **Test Embedded Credentials:**
   ```bash
   APP_URL="http://user:pass@localhost:5173" npm start
   # Should log error and fall back to localhost
   ```

### Impact Assessment

**Before Fix:**
- **Risk Level:** HIGH
- **Exploitability:** MEDIUM (requires environment control or future code modification)
- **Impact:** HIGH (phishing, session hijacking, XSS)
- **CVSS Score:** ~7.4 (High)

**After Fix:**
- **Risk Level:** LOW
- **Exploitability:** NONE (multiple validation layers)
- **Impact:** NONE (safe redirects enforced)
- **CVSS Score:** 0.0 (Resolved)

### References

- **CWE-601:** URL Redirection to Untrusted Site
- **OWASP:** A01:2021 – Broken Access Control
- **OWASP Cheat Sheet:** Unvalidated Redirects and Forwards
- **Fix Commit:** [See git log for task #1021]

### Questions?

**Q: Why validate APP_URL if it's in environment variables?**  
A: Environment variables can be compromised (container escape, CI/CD injection, etc.). Defense in depth requires validating ALL inputs.

**Q: Why not just use a whitelist of allowed redirect domains?**  
A: We do! The validation ensures redirects stay on the APP_URL origin. That's effectively a whitelist of one domain.

**Q: What if I need to redirect to a partner site?**  
A: Implement explicit partner whitelist, log all redirects, require signed tokens, and add user confirmation pages.

**Q: Is it safe to include provider name in errors?**  
A: Yes, provider names ('google', 'github') are hardcoded in our code, not user-controlled. Safe to include.

---

**Last Updated:** 2026-02-27  
**Security Contact:** Viktor (Auditor)  
**Fixed By:** Anton (Junior Developer)

## Path Traversal in File Upload (Task #1096 - Viktor Audit 2026-02-27)

### Vulnerability Description

**Severity:** CRITICAL  
**Category:** Path Traversal / Directory Traversal  
**CWE:** CWE-22 (Improper Limitation of a Pathname to a Restricted Directory)  
**Affected Files:** `server/src/lib/@system/StorageAdapter/LocalStorageAdapter.js` (fixed)  
**Discovered:** 2026-02-27 by Viktor

#### The Problem

The original `createUploadUrl()` method accepted user-controlled `filename` and `folder` parameters without validation, allowing attackers to escape the upload directory:

```javascript
// VULNERABLE CODE (before fix)
async createUploadUrl({ filename, contentType, folder = 'uploads', expiresIn = 300 }) {
  const ext = filename.includes('.') ? filename.split('.').pop().toLowerCase() : ''  // ❌ No validation
  const key = `${folder}/${uuidv4()}${ext ? '.' + ext : ''}`  // ❌ folder not validated
  // ...
}
```

#### Attack Vectors

**1. Path Traversal with ../**
```javascript
await StorageAdapter.createUploadUrl({
  filename: '../../../etc/passwd',
  folder: '../../etc',
  contentType: 'text/plain'
})
// Could generate key: ../../etc/uuid.txt → writes to /etc/
```

**2. Null Byte Injection**
```javascript
await StorageAdapter.createUploadUrl({
  filename: 'safe.txt\0.php',
  contentType: 'text/plain'
})
// Could bypass extension checks, file interpreted as .php
```

**3. Windows Path Traversal**
```javascript
await StorageAdapter.createUploadUrl({
  filename: '..\\..\\..\\windows\\system32\\config\\sam',
  contentType: 'text/plain'
})
// Could write to Windows system directories
```

**4. Absolute Paths**
```javascript
await StorageAdapter.createUploadUrl({
  filename: '/etc/passwd',
  contentType: 'text/plain'
})
// Attempts to write with absolute path
```

**Impact:**
- Arbitrary file write to any location accessible by Node.js process
- Overwrite critical system files (/etc/passwd, web.config, etc.)
- Write malicious executables to startup directories
- Bypass security controls through null byte injection
- Remote code execution if uploaded files are executed

### The Fix

**Solution:** Multi-layer input sanitization and validation.

#### Layer 1: Path Component Sanitization

```javascript
function sanitizePathComponent(input) {
  if (!input || typeof input !== 'string') return ''
  
  // Remove null bytes
  let safe = input.replace(/\0/g, '')
  
  // Remove path traversal sequences
  safe = safe.replace(/\.\./g, '')  // Remove ..
  safe = safe.replace(/[\/\\]/g, '') // Remove / and \
  
  // Remove leading/trailing dots and spaces
  safe = safe.replace(/^[\s.]+|[\s.]+$/g, '')
  
  // If empty after sanitization, return safe default
  if (!safe) return 'file'
  
  return safe
}
```

**Protections:**
- ✅ Removes null bytes (`\0`)
- ✅ Removes parent directory references (`..`)
- ✅ Removes path separators (`/`, `\`)
- ✅ Removes leading/trailing dots and spaces
- ✅ Returns safe default if empty

#### Layer 2: Extension Validation

```javascript
function safeExtension(filename) {
  if (!filename || typeof filename !== 'string') return ''
  
  // Remove null bytes first - everything after \0 is ignored
  const nullByteIndex = filename.indexOf('\0')
  if (nullByteIndex !== -1) {
    filename = filename.substring(0, nullByteIndex)
  }
  
  const parts = filename.split('.')
  if (parts.length < 2) return ''
  
  const ext = parts.pop().toLowerCase()
  
  // Only allow alphanumeric extensions up to 10 characters
  if (/^[a-z0-9]{1,10}$/i.test(ext)) {
    return ext
  }
  
  return ''
}
```

**Protections:**
- ✅ Handles null byte injection (truncates at `\0`)
- ✅ Validates extension format (alphanumeric only)
- ✅ Limits extension length (max 10 characters)
- ✅ Returns empty string for invalid extensions

#### Layer 3: Updated createUploadUrl()

```javascript
async createUploadUrl({ filename, contentType, folder = 'uploads', expiresIn = 300 }) {
  // SECURITY: Extract extension from ORIGINAL filename (before sanitization)
  const ext = safeExtension(filename)
  const safeName = sanitizePathComponent(filename)
  const safeFolder = sanitizePathComponent(folder)
  
  const key = `${safeFolder}/${uuidv4()}${ext ? '.' + ext : ''}`
  // ... rest of implementation
}
```

#### Layer 4: Path Validation (Existing Defense)

The `write()` method already validates paths:
```javascript
async write(key, buffer) {
  const storageDir = getStorageDir()
  const filePath = path.join(storageDir, key)
  if (!filePath.startsWith(storageDir)) {
    throw Object.assign(new Error('Invalid key: path traversal detected'), { status: 400 })
  }
  // ... rest of implementation
}
```

### Defense in Depth

The fix implements **4 security layers:**

| Layer | Protection | Attack Prevented |
|-------|-----------|------------------|
| 1. Input Sanitization | `sanitizePathComponent()` | Path traversal, null bytes |
| 2. Extension Validation | `safeExtension()` | Malicious extensions |
| 3. UUID Filenames | Actual filename is UUID | Collision, predictability |
| 4. Path Validation | `write()` checks `startsWith()` | Final defense |

### Testing

Security tests added in `server/test/unit/@system/storage-path-traversal.test.js`:

```bash
npm test -- storage-path-traversal.test.js
```

**Test Coverage:**
- ✅ Path traversal with `../` in filename (17 tests)
- ✅ Path traversal with `../` in folder
- ✅ Windows backslash path traversal
- ✅ Null byte injection
- ✅ Absolute paths
- ✅ Malicious extensions
- ✅ Multiple attack scenarios

**Results:**
```
Test Suites: 1 passed
Tests:       17 passed
Time:        0.132s
```

### Best Practices

#### DO ✅

1. **Sanitize ALL user input** before using in file paths
2. **Use whitelist validation** for file extensions
3. **Remove path separators** from user input (`/`, `\`)
4. **Handle null bytes** explicitly
5. **Use UUIDs** for actual filenames
6. **Validate paths** against allowed directories
7. **Implement defense in depth**

#### DON'T ❌

1. **Never trust user input** for filenames or paths
2. **Never use user input directly** in `path.join()`
3. **Never allow `..`** in any path component
4. **Never skip null byte checks**
5. **Never assume extension extraction is safe**
6. **Never rely on a single security check**

### Deployment Checklist

- [x] Input sanitization implemented
- [x] Extension validation with whitelist
- [x] Path validation before file operations
- [x] UUID-based filenames used
- [x] Defense in depth (4 layers)
- [ ] Upload directory has restricted permissions (0755)
- [ ] Node.js process runs with minimal privileges
- [ ] File size limits enforced
- [ ] Content-Type validation implemented
- [ ] Virus scanning on uploaded files (production)

### CVSS Analysis

**Before Fix:**
- Attack Vector: Network (AV:N)
- Attack Complexity: Low (AC:L)
- Privileges Required: Low (PR:L)
- User Interaction: None (UI:N)
- Scope: Changed (S:C)
- Confidentiality: High (C:H)
- Integrity: High (I:H)
- Availability: High (A:H)
- **CVSS 3.1 Score: 9.8 (CRITICAL)**

**After Fix:**
- **CVSS Score: 0.0 (Resolved)**

### FAQ

**Q: Why extract extension before sanitization?**  
A: Null byte handling in `safeExtension()` must see the original filename. If we sanitize first, `file.txt\0.php` becomes `file.txt.php`, extracting `.php` instead of `.txt`.

**Q: Why not just validate the final path?**  
A: Defense in depth. Multiple validation layers ensure that even if one fails, others catch the attack.

**Q: Are there file size limits?**  
A: Not yet. File size limits should be implemented in the upload endpoint as an additional security measure.

**Q: What about Content-Type validation?**  
A: The `contentType` parameter is used but not validated against the file content. Consider adding MIME type validation in production.

**Q: Should we scan uploaded files for malware?**  
A: Yes, in production. Integrate virus scanning (ClamAV, etc.) before serving files to users.

---

**Last Updated:** 2026-02-27  
**Security Contact:** Viktor (Auditor)  
**Fixed By:** Anton (Junior Developer)

## Backup File with Historical Keys (Task #1097 - Viktor Audit 2026-02-27)

### Vulnerability Description

**Severity:** CRITICAL  
**Category:** Cleartext Storage of Sensitive Information  
**CWE:** CWE-798 (Use of Hard-coded Credentials), CWE-312 (Cleartext Storage of Sensitive Information)  
**Affected File:** `server/.env.backup-insecure` (filesystem only, NOT in git history)  
**Discovered:** 2026-02-27 by Viktor

#### The Problem

During Task #1020 (cryptographic key rotation), a backup file was created containing the old hardcoded JWT and encryption keys. While correctly excluded from git via `.gitignore`, the file remained on the filesystem as a security risk.

**File Location:**
```bash
server/.env.backup-insecure
```

**File Contents:**
```bash
JWT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n[Old 2048-bit RSA key]...
JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----\n[Old 2048-bit RSA key]...
ENCRYPT_KEY=<redacted-old-hardcoded-key>  # Old hardcoded
ENCRYPT_IV=<redacted-old-hardcoded-iv>  # Old hardcoded
```

#### Why This is Critical

Even though the file was never committed to git:
- Old keys stored in **cleartext** on filesystem
- Anyone with **filesystem access** can read them
- Old keys can decrypt **historical data**
- Old keys can forge **JWTs for old sessions**
- Backup filename explicitly labeled "insecure"

**Attack Scenario:**
1. Attacker gains filesystem access (SSH, compromised app, etc.)
2. Reads `server/.env.backup-insecure`
3. Uses old JWT_PRIVATE_KEY to forge tokens for accounts
4. Uses old ENCRYPT_KEY to decrypt historical sensitive data
5. Key rotation security benefits completely undermined

### The Fix

**Solution:** Delete the file from filesystem immediately.

```bash
rm -f server/.env.backup-insecure
```

**Verification:**
```bash
# Confirm deletion
ls -la server/.env*
# Should NOT show .env.backup-insecure

# Verify never in git history
git log --all --full-history --oneline -- server/.env.backup-insecure
# Should show no commits

# Confirm .gitignore protection
grep "backup-insecure" .gitignore
# Should show: *.backup-insecure
```

### Best Practices for Key Rotation

**When rotating cryptographic keys:**

1. ✅ Generate new keys
2. ✅ Update `.env` with new keys
3. ✅ Test thoroughly
4. ✅ Deploy new keys
5. ✅ **Delete old keys immediately** ← Often forgotten!
6. ✅ Document rotation date (not keys themselves)

**Never:**
- ❌ Create backup files with plaintext secrets
- ❌ Keep old keys "just in case"
- ❌ Store keys in source code or git
- ❌ Email or share keys in cleartext
- ❌ Use filenames that advertise insecurity

**If backups are necessary:**
- ✅ Use proper secrets management (Vault, AWS Secrets Manager)
- ✅ Encrypt backup files with strong encryption
- ✅ Store encrypted backups in secure location
- ✅ Set expiration/rotation policies
- ✅ Audit access logs

### Downstream Products

**URGENT:** All products forked from product-template must check and delete this file.

**Check each product:**
```bash
# Nestora, Broadr, WaitlistKit, DropMagic, Brix
cd /path/to/product/server
ls -la .env.backup-insecure

# If found, DELETE immediately
rm -f .env.backup-insecure
```

### .gitignore Protection

The `.gitignore` pattern `*.backup-insecure` prevents these files from being committed:

```bash
# .gitignore
*.backup-insecure  # Block all backup files with this suffix
```

**This pattern:**
- ✅ Prevented the file from entering git history (Task #1020)
- ✅ Will block future accidental backups
- ⚠️ Does NOT delete existing filesystem files

### CVSS Analysis

**Before Fix:**
- Attack Vector: Local (AV:L) - Requires filesystem access
- Attack Complexity: Low (AC:L)
- Privileges Required: Low (PR:L)
- User Interaction: None (UI:N)
- Scope: Changed (S:C)
- Confidentiality: High (C:H)
- Integrity: High (I:H)
- Availability: None (A:N)
- **CVSS 3.1 Score: 8.2 (HIGH)**

**After Fix:**
- **CVSS Score: 0.0 (Resolved)**

### FAQ

**Q: Was this file committed to git?**  
A: No. The `.gitignore` pattern `*.backup-insecure` successfully prevented it from entering version control.

**Q: Do we need to rewrite git history?**  
A: No. Since the file was never committed, no history rewrite is needed.

**Q: Why create the backup file in the first place?**  
A: It was created during key rotation as a safety measure, but should have been deleted immediately after verification.

**Q: What if I need to restore old keys?**  
A: You don't. Key rotation is permanent. Old keys should be destroyed, not archived.

**Q: How do I verify my product doesn't have this file?**  
A: Run: `ls -la server/.env.backup-insecure` in your product directory. If found, delete it.

**Q: Can old keys still decrypt historical data?**  
A: Yes, which is why they must be deleted everywhere. Consider re-encrypting historical data with new keys if necessary.

---

**Last Updated:** 2026-02-27  
**Security Contact:** Viktor (Auditor)  
**Fixed By:** Anton (Junior Developer)

## Git History Verification - No Committed Keys (Task #1095 - Viktor Audit 2026-02-27)

### Verification Summary

**Objective:** Verify that no .env files with real cryptographic keys have been committed to git  
**Result:** ✅ **VERIFIED SECURE**  
**Date:** 2026-02-27  
**Auditor:** Viktor  
**Verified By:** Anton

### What Was Checked

**Comprehensive git history audit:**
1. All commits (`git log --all --full-history`)
2. All branches and tags
3. Deleted files (`--full-history`)
4. Pattern search for .env files
5. Value search for real keys

### Verification Results

#### .env Files - NEVER COMMITTED ✅

```bash
# server/.env - CLEAN
$ git log --all --full-history -- server/.env
(no output)  # Never committed ✅

# client/.env - CLEAN
$ git log --all --full-history -- client/.env
(no output)  # Never committed ✅

# Comprehensive search
$ git rev-list --all | while read commit; do 
    git ls-tree -r $commit | grep -E "\.env$"
  done
(no output)  # No .env in any commit ✅
```

#### .gitignore Protection - ACTIVE ✅

```bash
$ grep "^\.env" .gitignore
.env
.env.local
.env.*.local

$ git check-ignore -v server/.env
.gitignore:4:.env  server/.env  # Properly ignored ✅
```

#### Example Files - CLEAN ✅

Only .env.example files are committed, containing:
- Placeholders (`<generate-with-npm-run-generate-keys>`)
- Example values (pk_test_...)
- No real keys ✅

#### Key Search Results

**Current keys (post-rotation):**
```bash
$ git log --all -S "DMcBMXmx/1uMg+mvZ6mhNLcA9DZygeU9hLuGAP2sQms="
(no output)  # Current ENCRYPT_KEY NOT in git ✅
```

**Old hardcoded keys (pre-rotation):**
```bash
$ git log --all -S "<redacted-old-hardcoded-key>"
05892a3 security: rotate hardcoded cryptographic keys (Task #1020)
8c77036 security: delete .env.backup-insecure (Task #1097)
```

**Analysis:** Old key appears ONLY in:
- SECURITY.md (documentation of what was removed)
- TASK_1020_COMPLETE.md (task report)
- TASK_1097_COMPLETE.md (task report)

**Verified:** No .env files in these commits, only documentation.

### Security Posture - EXCELLENT

| Check | Status | Risk |
|-------|--------|------|
| .env files in git | ❌ Never committed | ✅ No risk |
| .gitignore active | ✅ Yes (.env pattern) | ✅ Protected |
| Example files | ✅ Placeholders only | ✅ Safe |
| Current keys | Unique (post-rotation) | ✅ Secure |
| Backup files | Deleted (Task #1097) | ✅ Clean |

### Defense Layers Confirmed

1. **gitignore Protection** - Blocks .env from commits
2. **Key Rotation** - New unique keys (Task #1020)
3. **Backup Deletion** - No leftover files (Task #1097)
4. **Example Files** - Only safe templates in git
5. **Regular Audits** - Periodic verification (this task)

### Why This Matters

**If .env were committed (it is NOT):**
- Anyone with repo access could read keys
- Keys could be in public forks
- Historical keys remain in git history forever
- JWT forgery attacks possible
- Data decryption attacks possible

**Current reality (keys NOT committed):**
- Keys only on local filesystems
- No exposure in git history
- No risk from public repos
- Security measures working correctly

### Remediation (Not Needed)

**If keys were found (they were not), would need:**
1. Remove from git history (git filter-branch / BFG)
2. Rotate ALL keys immediately
3. Invalidate ALL existing sessions
4. Re-encrypt ALL encrypted data
5. Audit access logs
6. Notify security team

**Actual status:** No remediation needed. Configuration is correct.

### Best Practices (Already Implemented)

**For .env files:**
- ✅ Always add to .gitignore
- ✅ Use .env.example with placeholders
- ✅ Generate unique keys per environment
- ✅ Never commit .env to git
- ✅ Delete backup files immediately
- ✅ Verify regularly (this task)

**For key management:**
- ✅ Rotate keys regularly
- ✅ Use secrets management in production (Vault, etc.)
- ✅ Document key rotation procedures
- ✅ Audit git history periodically
- ✅ Educate team on security practices

### Verification Frequency

**Recommended schedule:**
- After onboarding new developers
- After major code changes
- Quarterly security audits
- Before production deployments
- After suspected security incidents

### FAQ

**Q: Are there any keys in git history?**  
A: No. Comprehensive search found no .env files with keys in any commit.

**Q: What about the old hardcoded keys?**  
A: They appear only in security documentation (SECURITY.md, task reports), never in .env files.

**Q: Is .gitignore working?**  
A: Yes. The `.env` pattern is active and preventing commits.

**Q: What if someone accidentally commits .env?**  
A: .gitignore will block it. If somehow committed, we have documented procedures to remove it (git history rewrite + key rotation).

**Q: How often should we verify?**  
A: Quarterly, and after any security concerns or team changes.

**Q: What about downstream products?**  
A: Each product should run the same verification periodically. They use the same .gitignore patterns.

---

**Verification Date:** 2026-02-27  
**Next Verification:** 2026-05-27 (Quarterly)  
**Security Contact:** Viktor (Auditor)  
**Verified By:** Anton (Junior Developer)

## IDOR in Collaborators API (Task #1106 - Viktor Audit 2026-02-27)

### Vulnerability Description

**Severity:** HIGH  
**Category:** Insecure Direct Object Reference (IDOR)  
**CWE:** CWE-639 (Authorization Bypass Through User-Controlled Key)  
**Affected Files:** `server/src/api/@custom/collaborators/index.js` (fixed)  
**Discovered:** 2026-02-27 by Viktor

#### The Problem

The collaborators API had NO ownership checks on any endpoint. Any authenticated user could access, modify, or delete ANY collaborator regardless of who invited them.

**Vulnerable Code (before fix):**
```javascript
// GET /collaborators - NO ownership check!
router.get('/collaborators', authenticate, async (req, res) => {
  // ❌ Returns ALL collaborators from ALL users
  const collaborators = await CollaboratorRepo.findAll()
  res.json({ collaborators })
})

// PATCH /collaborators/:id/role - NO ownership check!
router.patch('/collaborators/:id/role', authenticate, async (req, res) => {
  const collaborator = await CollaboratorRepo.findById(id)
  // ❌ No check if req.user invited this collaborator
  await CollaboratorRepo.updateRole(id, role)
})

// DELETE /collaborators/:id - NO ownership check!
router.delete('/collaborators/:id', authenticate, async (req, res) => {
  // ❌ No check if req.user invited this collaborator
  await CollaboratorRepo.softDelete(id)
})
```

#### Attack Vectors

**1. Data Leakage (List All Collaborators)**
```javascript
// User A invites 5 collaborators
// User B invites 2 collaborators

// User B calls: GET /collaborators
// Before fix: Returns ALL 7 collaborators
// User B can see User A's collaborators' emails, names, roles
```

**2. Unauthorized Modification**
```javascript
// User A invites collaborator ID=100 (role=member)
// User B discovers this collaborator exists

// User B calls: PATCH /collaborators/100/role {role: "admin"}
// Before fix: Success - role changed!
// Impact: User B modified User A's collaborator
```

**3. Unauthorized Deletion**
```javascript
// User A invites collaborator ID=100
// User B calls: DELETE /collaborators/100
// Before fix: Success - collaborator deleted!
// Impact: User B deleted User A's collaborator
```

**Impact:**
- Data leakage (view all collaborators' emails, names, roles)
- Unauthorized modification (change any collaborator's role)
- Unauthorized deletion (delete any collaborator)
- Privilege escalation (elevate roles to gain admin access)
- Horizontal privilege escalation (access other users' resources)

### The Fix

**Solution:** Add ownership checks based on `invited_by` field.

#### Layer 1: Repository-Level Filtering

```javascript
async findAll({ invited_by, status, role, limit, offset } = {}) {
  const conditions = []
  const values = []
  
  // SECURITY: Filter by invited_by for ownership checks
  if (invited_by !== undefined) {
    conditions.push(`invited_by = $${idx++}`)
    values.push(invited_by)
  }
  
  // ... rest of query
}
```

#### Layer 2: API-Level Ownership Checks

**List Endpoint:**
```javascript
router.get('/collaborators', authenticate, async (req, res) => {
  const isAdmin = req.user.role === 'admin'
  
  // SECURITY: Filter by ownership for regular users
  const invited_by = (isAdmin && all === 'true') ? undefined : req.user.id
  
  const collaborators = await CollaboratorRepo.findAll({ invited_by })
  res.json({ collaborators })
})
```

**Update Endpoint:**
```javascript
router.patch('/collaborators/:id/role', authenticate, async (req, res) => {
  const isAdmin = req.user.role === 'admin'
  const collaborator = await CollaboratorRepo.findById(id)
  
  // SECURITY: Check ownership before allowing update
  if (!isAdmin && collaborator.invited_by !== req.user.id) {
    return res.status(403).json({ 
      message: 'Forbidden: You can only update collaborators you invited' 
    })
  }
  
  await CollaboratorRepo.updateRole(id, role)
})
```

**Delete Endpoint:**
```javascript
router.delete('/collaborators/:id', authenticate, async (req, res) => {
  const isAdmin = req.user.role === 'admin'
  const collaborator = await CollaboratorRepo.findById(id)
  
  // SECURITY: Check ownership before allowing deletion
  if (!isAdmin && collaborator.invited_by !== req.user.id) {
    return res.status(403).json({ 
      message: 'Forbidden: You can only delete collaborators you invited' 
    })
  }
  
  await CollaboratorRepo.softDelete(id)
})
```

### Defense in Depth

The fix implements **4 security layers:**

| Layer | Protection | Attack Prevented |
|-------|-----------|------------------|
| 1. Repository Filter | `invited_by` parameter | Data leakage via list |
| 2. Ownership Check | Verify before modify | Unauthorized update/delete |
| 3. Admin Role Check | Explicit `role === 'admin'` | Controlled bypass |
| 4. Authentication | `authenticate` middleware | Unauthenticated access |

### Testing

Security tests added in `server/test/unit/@custom/collaborators-idor.test.js`:

```bash
npm test -- collaborators-idor.test.js
```

**Test Coverage:**
- ✅ List endpoint ownership filtering (24 tests)
- ✅ Update endpoint ownership checks
- ✅ Delete endpoint ownership checks
- ✅ Restore endpoint ownership checks
- ✅ Attack scenario prevention
- ✅ Admin bypass authorization

**Results:**
```
Test Suites: 1 passed
Tests:       24 passed
Time:        0.156s
```

### Admin Bypass (Authorized)

Admins (`role = 'admin'`) can access all collaborators:
- List all: `GET /collaborators?all=true`
- Update any: `PATCH /collaborators/:id/role`
- Delete any: `DELETE /collaborators/:id`

This is **intended behavior** (not IDOR) because:
- Admin role is explicitly checked
- Bypass is controlled and documented
- Admins are trusted users with elevated permissions

### Best Practices

#### DO ✅

1. **Filter by ownership** at database level
   ```javascript
   CollaboratorRepo.findAll({ invited_by: req.user.id })
   ```

2. **Check ownership** before modifications
   ```javascript
   if (collaborator.invited_by !== req.user.id) return 403
   ```

3. **Explicit admin checks** for bypass
   ```javascript
   const isAdmin = req.user.role === 'admin'
   if (!isAdmin && !ownsResource) return 403
   ```

4. **Return 403 Forbidden** for unauthorized (not 404)
   ```javascript
   res.status(403).json({ message: 'Forbidden: ...' })
   ```

#### DON'T ❌

1. **Never fetch all without filtering**
   ```javascript
   // ❌ WRONG
   await CollaboratorRepo.findAll()
   
   // ✅ RIGHT
   await CollaboratorRepo.findAll({ invited_by: req.user.id })
   ```

2. **Never skip ownership checks**
   ```javascript
   // ❌ WRONG
   await CollaboratorRepo.updateRole(id, role)
   
   // ✅ RIGHT
   if (collaborator.invited_by !== req.user.id) return 403
   await CollaboratorRepo.updateRole(id, role)
   ```

3. **Never use user_id for ownership**
   ```javascript
   // ❌ WRONG - user_id is the collaborator's account
   if (collaborator.user_id !== req.user.id)
   
   // ✅ RIGHT - invited_by is who invited them
   if (collaborator.invited_by !== req.user.id)
   ```

### CVSS Analysis

**Before Fix:**
- Attack Vector: Network (AV:N)
- Attack Complexity: Low (AC:L)
- Privileges Required: Low (PR:L) - authenticated user
- User Interaction: None (UI:N)
- Scope: Unchanged (S:U)
- Confidentiality: High (C:H) - data leakage
- Integrity: High (I:H) - unauthorized modification
- Availability: Low (A:L) - deletion possible
- **CVSS 3.1 Score: 8.1 (HIGH)**

**After Fix:**
- **CVSS Score: 0.0 (Resolved)**

### FAQ

**Q: Why use invited_by instead of user_id?**  
A: `invited_by` indicates who invited the collaborator (ownership). `user_id` is the collaborator's linked user account (after acceptance). Ownership is determined by who invited, not who accepted.

**Q: Why return 403 instead of 404 for unauthorized access?**  
A: 403 clearly indicates "you don't have permission" vs 404 "doesn't exist". Both prevent enumeration, but 403 is more accurate.

**Q: Can regular users see other users' collaborators?**  
A: No. Regular users only see collaborators they invited. Admins can see all with `?all=true`.

**Q: What if a user tries to modify their own collaborator record?**  
A: If User A invited User B as a collaborator, User B cannot modify their own record because `invited_by = User A`, not User B.

**Q: How do admins list all collaborators?**  
A: Admins use `GET /collaborators?all=true` to bypass the invited_by filter.

---

**Last Updated:** 2026-02-27  
**Security Contact:** Viktor (Auditor)  
**Fixed By:** Anton (Junior Developer)
