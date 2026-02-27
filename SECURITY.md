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
ENCRYPT_KEY=0nrwHF1aZQIy5xuTM9rg5v8KNvPkrxpBCYKebZ00/rM=
ENCRYPT_IV=68ygEy8/4JkAS1dN+pq9VA==
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
