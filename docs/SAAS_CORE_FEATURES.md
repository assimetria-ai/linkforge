# SaaS Core Features Guide

This document provides detailed usage instructions for the core SaaS features implemented in the product-template.

## Table of Contents

1. [Email System](#1-email-system)
2. [File Upload System](#2-file-upload-system)
3. [Logging & Audit System](#3-logging--audit-system)
4. [Error Tracking](#4-error-tracking)

---

## 1. Email System

### Overview

The template includes a multi-provider email system with background queue processing, template support, and retry logic.

### Providers Supported

- **Resend** (recommended, modern API)
- **AWS SES** (scalable, low-cost)
- **SMTP** (generic, works with any provider)
- **Console** (development fallback)

### Basic Usage

#### Direct Send (Synchronous)

```javascript
const Email = require('./lib/@system/Email')

// Simple email
await Email.send({
  to: 'user@example.com',
  subject: 'Hello',
  html: '<p>Welcome!</p>',
  text: 'Welcome!',
})

// With CC/BCC
await Email.send({
  to: 'user@example.com',
  cc: ['manager@example.com'],
  bcc: ['audit@example.com'],
  subject: 'Team Update',
  html: '<p>Important update</p>',
})

// With attachments
await Email.send({
  to: 'user@example.com',
  subject: 'Invoice',
  html: '<p>Your invoice is attached</p>',
  attachments: [
    {
      filename: 'invoice.pdf',
      path: '/path/to/invoice.pdf',
    },
  ],
})
```

#### Template-Based Emails

```javascript
// Verification email
await Email.sendVerificationEmail({
  to: 'user@example.com',
  name: 'John Doe',
  token: 'abc123xyz',
})

// Password reset
await Email.sendPasswordResetEmail({
  to: 'user@example.com',
  name: 'John Doe',
  resetToken: 'reset-token-123',
})

// Welcome email
await Email.sendWelcomeEmail({
  to: 'user@example.com',
  name: 'John Doe',
})

// Invitation email
await Email.sendInvitationEmail({
  to: 'new-member@example.com',
  inviterName: 'Jane Smith',
  teamName: 'Acme Corp',
  inviteUrl: 'https://app.example.com/invite/abc123',
})
```

#### Queued Send (Asynchronous)

```javascript
const EmailQueue = require('./lib/@system/EmailQueue')

// Initialize queue (do this once at app startup)
await EmailQueue.init({
  redisUrl: process.env.REDIS_URL,
  startWorker: true,
  concurrency: 5,
})

// Queue a single email
await EmailQueue.queueEmail({
  to: 'user@example.com',
  subject: 'Hello',
  html: '<p>Welcome!</p>',
})

// Queue with delay (send in 1 hour)
await EmailQueue.queueEmail(
  {
    to: 'user@example.com',
    subject: 'Reminder',
    html: '<p>Dont forget!</p>',
  },
  { delay: 60 * 60 * 1000 }
)

// Queue verification email
await EmailQueue.queueVerificationEmail({
  to: 'user@example.com',
  name: 'John Doe',
  token: 'abc123',
})

// Bulk email send (automatically batched)
await EmailQueue.queueBulkEmail({
  recipients: [
    { email: 'user1@example.com' },
    { email: 'user2@example.com' },
    // ... up to thousands
  ],
  subject: 'Newsletter',
  html: '<p>Monthly update</p>',
  text: 'Monthly update',
})
```

#### Queue Monitoring

```javascript
// Get queue status
const status = await EmailQueue.getQueueStatus()
console.log(status)
// {
//   enabled: true,
//   waiting: 10,
//   active: 2,
//   completed: 150,
//   failed: 3,
//   delayed: 5,
//   total: 170
// }

// Clean old jobs (keep last 24 hours)
await EmailQueue.cleanQueue(24 * 60 * 60 * 1000)
```

### Environment Variables

```bash
# Email Provider (choose one)
EMAIL_PROVIDER=resend  # or 'ses', 'smtp', 'console'

# Resend
RESEND_API_KEY=re_xxxxx

# AWS SES
AWS_SES_ACCESS_KEY_ID=AKIA...
AWS_SES_SECRET_ACCESS_KEY=...
AWS_SES_REGION=us-east-1

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Sender
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Your App Name

# Email Queue (optional, enables background processing)
REDIS_URL=redis://localhost:6379
```

---

## 2. File Upload System

### Overview

Multi-provider file storage with direct browser-to-cloud uploads, validation, and security features.

### Providers Supported

- **AWS S3** (production-ready, scalable)
- **Cloudflare R2** (S3-compatible, zero egress fees)
- **Local Filesystem** (development only)

### Basic Usage

#### Generate Upload URL (Presigned)

```javascript
const StorageAdapter = require('./lib/@system/StorageAdapter')

// Get presigned upload URL
const uploadData = await StorageAdapter.getUploadUrl({
  key: `uploads/${userId}/avatar.jpg`,
  contentType: 'image/jpeg',
  expiresIn: 300, // 5 minutes
})

// Return to client for direct upload
res.json({
  uploadUrl: uploadData.url,
  fields: uploadData.fields,
  key: uploadData.key,
})
```

#### Client-Side Direct Upload (Browser)

```javascript
// Client-side JavaScript
async function uploadFile(file) {
  // 1. Request upload URL from backend
  const response = await fetch('/api/storage/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      size: file.size,
    }),
  })

  const { uploadUrl, fields, key } = await response.json()

  // 2. Upload directly to storage (bypasses server)
  const formData = new FormData()
  Object.entries(fields || {}).forEach(([k, v]) => formData.append(k, v))
  formData.append('file', file)

  await fetch(uploadUrl, {
    method: 'POST',
    body: formData,
  })

  // 3. Confirm upload with backend
  await fetch('/api/storage/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key }),
  })

  return key
}
```

#### File Validation

```javascript
const { validateUpload, validateFileMiddleware } = require('./lib/@system/StorageAdapter/validators')

// Validate programmatically
const validation = validateUpload({
  filename: 'document.pdf',
  contentType: 'application/pdf',
  size: 5 * 1024 * 1024, // 5MB
})

if (!validation.valid) {
  console.error('Validation errors:', validation.errors)
}

// As Express middleware
app.post('/api/storage/upload-url',
  authenticate,
  validateFileMiddleware({ allowedTypes: ['image'] }),
  async (req, res) => {
    // File is validated, proceed with upload URL generation
  }
)
```

#### Download URLs

```javascript
// Get presigned download URL (private files)
const downloadUrl = await StorageAdapter.getDownloadUrl('uploads/file.pdf', 300)

// Get public URL (for public files)
const publicUrl = StorageAdapter.getPublicUrl('public/logo.png')
```

#### File Operations

```javascript
// Check if file exists
const exists = await StorageAdapter.fileExists('uploads/file.pdf')

// Delete file
await StorageAdapter.deleteFile('uploads/file.pdf')

// Get file metadata
const metadata = await StorageAdapter.fileExists('uploads/file.pdf')
console.log(metadata) // { exists: true, size: 12345, lastModified: Date }
```

### File Upload API Example

```javascript
// server/src/api/@system/storage/index.js
const express = require('express')
const router = express.Router()
const StorageAdapter = require('../../../lib/@system/StorageAdapter')
const { validateFileMiddleware } = require('../../../lib/@system/StorageAdapter/validators')
const { authenticate } = require('../../../lib/@system/Middleware')

// Request upload URL
router.post('/upload-url',
  authenticate,
  validateFileMiddleware({ allowedTypes: ['image', 'document'] }),
  async (req, res, next) => {
    try {
      const { filename, contentType, size } = req.body
      const userId = req.user.id

      // Generate unique key
      const key = `uploads/${userId}/${Date.now()}-${filename}`

      // Get presigned upload URL
      const uploadData = await StorageAdapter.getUploadUrl({
        key,
        contentType,
        expiresIn: 300, // 5 minutes
      })

      // Log for audit
      await req.auditLog('file.upload_requested', 'file', key, {
        filename,
        contentType,
        size,
      })

      res.json({
        success: true,
        uploadUrl: uploadData.url,
        fields: uploadData.fields,
        key: uploadData.key,
      })
    } catch (err) {
      next(err)
    }
  }
)

module.exports = router
```

### Environment Variables

```bash
# Storage Provider
STORAGE_PROVIDER=s3  # or 'r2', 'local'

# AWS S3
AWS_S3_ACCESS_KEY_ID=AKIA...
AWS_S3_SECRET_ACCESS_KEY=...
AWS_S3_REGION=us-east-1
AWS_S3_BUCKET=my-app-uploads

# Cloudflare R2
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=my-app-uploads

# Local Storage (dev only)
LOCAL_STORAGE_PATH=./uploads

# File Upload Limits
MAX_FILE_SIZE_MB=50
```

---

## 3. Logging & Audit System

### Overview

Structured application logging with Pino and comprehensive audit trails for compliance and security monitoring.

### Application Logging

```javascript
const logger = require('./lib/@system/Logger')

// Info logging
logger.info('User registered successfully')
logger.info({ userId: 123, email: 'user@example.com' }, 'User registered')

// Error logging
logger.error({ err }, 'Failed to process payment')

// Debug logging
logger.debug({ query, params }, 'Database query executed')

// Warning
logger.warn({ userId: 123 }, 'Multiple failed login attempts')
```

### Audit Logging

```javascript
const AuditLog = require('./lib/@system/AuditLog')

// Log user action
await AuditLog.logAction({
  userId: 123,
  action: 'user.update',
  resourceType: 'user',
  resourceId: '123',
  details: { fields: ['email', 'name'] },
  ipAddress: req.ip,
  userAgent: req.get('user-agent'),
})

// Log data change (with before/after)
await AuditLog.logDataChange({
  userId: 123,
  action: 'update',
  resourceType: 'subscription',
  resourceId: 'sub_123',
  before: { plan: 'free' },
  after: { plan: 'pro' },
  ipAddress: req.ip,
  userAgent: req.get('user-agent'),
})

// Log authentication event
await AuditLog.logAuthEvent({
  userId: 123,
  action: 'login',
  success: true,
  ipAddress: req.ip,
  userAgent: req.get('user-agent'),
  metadata: { method: '2fa' },
})

// Log security event
await AuditLog.logSecurityEvent({
  userId: 123,
  event: 'suspicious_activity',
  severity: 'high',
  details: { reason: 'Login from new location' },
  ipAddress: req.ip,
  userAgent: req.get('user-agent'),
})
```

### Audit Middleware

```javascript
const { auditMiddleware } = require('./lib/@system/AuditLog')

// Apply middleware globally
app.use(auditMiddleware)

// Use in routes
app.post('/api/posts', authenticate, async (req, res) => {
  const post = await createPost(req.body)

  // Audit log helper attached to request
  await req.auditLog('post.create', 'post', post.id, {
    title: post.title,
  })

  res.json(post)
})

// Audit data changes
app.put('/api/posts/:id', authenticate, async (req, res) => {
  const before = await getPost(req.params.id)
  const after = await updatePost(req.params.id, req.body)

  await req.auditDataChange('update', 'post', req.params.id, before, after)

  res.json(after)
})
```

### Querying Audit Logs

```javascript
// Get user's audit logs
const userLogs = await AuditLog.getUserLogs(userId, 50, 0)

// Get resource history
const postHistory = await AuditLog.getResourceLogs('post', 'post_123', 20)

// Advanced query
const logs = await AuditLog.queryLogs({
  userId: 123,
  action: 'user.%',  // Wildcard
  resourceType: 'user',
  startDate: new Date('2024-01-01'),
  endDate: new Date(),
  limit: 100,
  offset: 0,
})
```

### Audit Log Cleanup

```javascript
// Clean logs older than 90 days (run as cron job)
const deletedCount = await AuditLog.cleanOldLogs(90)
console.log(`Deleted ${deletedCount} old audit logs`)
```

### Database Schema

The audit logs table is created via migration:

```sql
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id VARCHAR(100),
  details JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  status VARCHAR(20) DEFAULT 'success',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Environment Variables

```bash
# Audit Log Retention
AUDIT_LOG_RETENTION_DAYS=90
```

---

## 4. Error Tracking

### Overview

Sentry integration for error monitoring, performance tracking, and alerting.

### Initialization

```javascript
// server/src/index.js
const ErrorTracking = require('./lib/@system/ErrorTracking')

// Initialize Sentry
ErrorTracking.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% of transactions
})

// Apply middleware
app.use(ErrorTracking.requestHandler())
app.use(ErrorTracking.tracingHandler())

// ... your routes ...

// Error handler (must be LAST middleware)
app.use(ErrorTracking.errorHandler())
```

### Capturing Errors

```javascript
const ErrorTracking = require('./lib/@system/ErrorTracking')

// Capture exception
try {
  await riskyOperation()
} catch (err) {
  ErrorTracking.captureError(err, {
    user: { id: req.user.id, email: req.user.email },
    extra: { operation: 'riskyOperation', input: data },
    tags: { component: 'payment' },
    level: 'error',
  })
}

// Capture message
ErrorTracking.captureMessage('Unusual activity detected', {
  level: 'warning',
  extra: { userId: 123, action: 'bulk_delete' },
  tags: { feature: 'admin' },
})
```

### User Context

```javascript
// Set user context (for all subsequent errors)
ErrorTracking.setUser({
  id: req.user.id,
  email: req.user.email,
  username: req.user.username,
})

// Clear user context (on logout)
ErrorTracking.clearUser()
```

### Breadcrumbs

```javascript
// Add breadcrumb for context trail
ErrorTracking.addBreadcrumb({
  message: 'User clicked checkout button',
  category: 'ui',
  level: 'info',
  data: { cartTotal: 99.99 },
})
```

### Performance Monitoring

```javascript
// Start transaction
const transaction = ErrorTracking.startTransaction('POST /api/orders', 'http.server')

// Create spans for operations
const dbSpan = ErrorTracking.startSpan(transaction, 'db.query', 'SELECT * FROM orders')
await queryDatabase()
dbSpan?.finish()

const apiSpan = ErrorTracking.startSpan(transaction, 'http.client', 'POST to payment gateway')
await callPaymentApi()
apiSpan?.finish()

transaction?.finish()
```

### Environment Variables

```bash
# Sentry
SENTRY_DSN=https://xxx@sentry.io/xxx

# Optional
GIT_SHA=abc123  # For release tracking
```

---

## Dependencies

Add these to `package.json`:

```json
{
  "dependencies": {
    "@sentry/node": "^7.0.0",
    "@sentry/tracing": "^7.0.0",
    "bullmq": "^4.0.0",
    "pino": "^8.0.0",
    "pino-pretty": "^10.0.0"
  }
}
```

---

## Testing

### Unit Tests

```javascript
// File upload validation
const { validateUpload } = require('./lib/@system/StorageAdapter/validators')

describe('File Upload Validation', () => {
  it('should reject oversized files', () => {
    const result = validateUpload({
      filename: 'large.jpg',
      contentType: 'image/jpeg',
      size: 100 * 1024 * 1024, // 100MB
    })

    expect(result.valid).toBe(false)
    expect(result.errors).toContain(/exceeds maximum/)
  })

  it('should reject dangerous extensions', () => {
    const result = validateUpload({
      filename: 'virus.exe',
      contentType: 'application/x-msdownload',
      size: 1024,
    })

    expect(result.valid).toBe(false)
  })
})
```

---

## Production Checklist

- [ ] Configure email provider credentials
- [ ] Set up Redis for email queue
- [ ] Configure S3/R2 for file storage
- [ ] Set up Sentry project and get DSN
- [ ] Run audit logs migration
- [ ] Configure file upload limits
- [ ] Set audit log retention policy
- [ ] Test email deliverability
- [ ] Test file upload from browser
- [ ] Verify error tracking works
- [ ] Set up monitoring dashboards

---

## Support

For issues or questions:
- Check the implementation code in `server/src/lib/@system/`
- Review test files for usage examples
- Consult the SAAS-CORE-FEATURES-RESEARCH.md for design decisions
