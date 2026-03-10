# SaaS Features - Quick Setup Guide

This guide will help you configure and enable the core SaaS features in production.

## Prerequisites

- PostgreSQL database running
- Node.js 18+ installed
- Domain name configured (for production email)

---

## 1. Email System Setup

### Step 1: Choose Your Provider

Pick **ONE** of these options based on your needs:

#### Option A: Resend (Recommended for New Projects)

**Why Resend?**
- Modern API, great developer experience
- Generous free tier (3,000 emails/month)
- Built-in analytics and webhooks
- 5-minute setup

**Setup:**

1. Sign up at [resend.com](https://resend.com)
2. Get your API key from the dashboard
3. Verify your sending domain (or use their sandbox for testing)
4. Add to `.env`:

```bash
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM="Your App <noreply@yourdomain.com>"
APP_URL=https://yourdomain.com
APP_NAME="Your App"
EMAIL_TRACKING_SECRET=your-random-secret-here  # For webhook validation
```

#### Option B: SMTP (For Existing Email Providers)

**Use if you already have:**
- SendGrid account
- Mailgun account
- Gmail/Google Workspace
- Any other SMTP provider

**Setup:**

```bash
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.sendgrid.net        # Your provider's SMTP host
SMTP_PORT=587                       # Usually 587 for TLS
SMTP_USER=apikey                    # Username (often "apikey")
SMTP_PASS=SG.xxxxxxxxxxxxxxxxxx    # Your API key or password
SMTP_SECURE=false                   # true for port 465
SMTP_POOL=true                      # Connection pooling
EMAIL_FROM="Your App <noreply@yourdomain.com>"
APP_URL=https://yourdomain.com
APP_NAME="Your App"
```

**Common SMTP Providers:**

| Provider | Host | Port | User |
|----------|------|------|------|
| SendGrid | smtp.sendgrid.net | 587 | apikey |
| Mailgun | smtp.mailgun.org | 587 | postmaster@your.domain |
| Gmail | smtp.gmail.com | 587 | your@gmail.com |
| AWS SES SMTP | email-smtp.eu-west-1.amazonaws.com | 587 | Your SMTP credentials |

#### Option C: Amazon SES (For AWS Users)

**Use if you:**
- Already use AWS infrastructure
- Need high volume (50,000+ emails/day)
- Want the lowest cost at scale

**Setup:**

1. Verify your sending domain in SES console
2. Request production access (starts in sandbox mode)
3. Create IAM user with SES send permissions
4. Add to `.env`:

```bash
EMAIL_PROVIDER=ses
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=AKIAxxxxxxxxxxxxxxxxx
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM="Your App <noreply@yourdomain.com>"
SES_FROM_EMAIL=noreply@yourdomain.com
APP_URL=https://yourdomain.com
APP_NAME="Your App"
```

#### Option D: Console (Development Only)

**For local development:**

```bash
# No email config needed!
# Emails will be logged to console with clickable URLs
APP_URL=http://localhost:5173
APP_NAME="Your App (Dev)"
```

### Step 2: Test Email Sending

```bash
# Start your server
npm run dev

# In another terminal, test with curl:
curl -X POST http://localhost:3001/api/test-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "your@email.com",
    "name": "Test User"
  }'
```

Or add a test route in `server/src/api/@system/email/index.js`:

```javascript
// Add this temporarily for testing
router.post('/email/test', async (req, res, next) => {
  try {
    const { to, name } = req.body
    const result = await Email.sendWelcomeEmail({ to, name })
    res.json({ success: true, ...result })
  } catch (err) {
    next(err)
  }
})
```

### Step 3: Verify Email Tracking

1. Check that emails are being logged:

```bash
# Query the database
psql $DATABASE_URL -c "SELECT id, to_address, subject, status FROM email_logs ORDER BY created_at DESC LIMIT 5;"
```

2. Or visit the admin panel (requires admin user):

```
http://localhost:5173/app/email-tracking
```

---

## 2. File Upload Setup

### Step 1: Choose Your Storage Provider

#### Option A: AWS S3 (Production Standard)

**Setup:**

1. Create S3 bucket in AWS Console
2. Set bucket policy for public read access (if needed)
3. Create IAM user with S3 permissions
4. Add to `.env`:

```bash
STORAGE_PROVIDER=s3
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=AKIAxxxxxxxxxxxxxxxxx
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
S3_BUCKET=your-bucket-name
S3_PUBLIC_URL=https://your-bucket.s3.eu-west-1.amazonaws.com
```

**Required IAM Policy:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:HeadObject"
      ],
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

#### Option B: Cloudflare R2 (Zero Egress Fees)

**Setup:**

1. Create R2 bucket in Cloudflare dashboard
2. Generate R2 API token
3. Enable public access (optional)
4. Add to `.env`:

```bash
STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
R2_ACCESS_KEY_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
R2_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
R2_BUCKET=your-bucket-name
R2_PUBLIC_URL=https://pub-xxxxxxxxxxxx.r2.dev
```

**Advantages of R2:**
- S3-compatible API (easy migration)
- $0 egress fees (huge savings for large files)
- Cheaper than S3 for storage
- Global CDN included

#### Option C: Local Filesystem (Development/Self-Hosted)

**Setup:**

```bash
STORAGE_PROVIDER=local
LOCAL_STORAGE_PATH=./uploads
LOCAL_STORAGE_URL=http://localhost:3001/uploads
```

**For production self-hosting:**

1. Use absolute path:
```bash
LOCAL_STORAGE_PATH=/var/www/uploads
LOCAL_STORAGE_URL=https://yourdomain.com/uploads
```

2. Serve uploads with nginx:
```nginx
location /uploads {
    alias /var/www/uploads;
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### Step 2: Test File Upload

```bash
# Start server
npm run dev

# Test upload URL generation
curl -X POST http://localhost:3001/api/storage/upload-url \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "test.jpg",
    "contentType": "image/jpeg",
    "folder": "test"
  }'

# Response:
# {
#   "ok": true,
#   "url": "https://...",  # Upload to this URL
#   "key": "test/abc123.jpg",
#   "publicUrl": "https://...",  # Access file here
#   "expiresAt": "2024-03-08T11:05:00Z"
# }
```

### Step 3: Integrate in Your Frontend

Use the included `FileUpload` component:

```jsx
import { FileUpload } from '../components/@system/FileUpload'

function ProfilePage() {
  const [avatarUrl, setAvatarUrl] = useState(null)
  
  async function handleUpload({ publicUrl, key }) {
    // Update user profile with avatar URL
    await fetch('/api/user/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar_url: publicUrl, avatar_key: key }),
    })
    
    setAvatarUrl(publicUrl)
  }
  
  return (
    <div>
      {avatarUrl && <img src={avatarUrl} alt="Avatar" />}
      <FileUpload onUpload={handleUpload} folder="avatars" />
    </div>
  )
}
```

---

## 3. Logging & Audit Setup

### Step 1: Configure Log Level

```bash
# Development
NODE_ENV=development
LOG_LEVEL=debug  # See everything

# Production
NODE_ENV=production
LOG_LEVEL=info   # Standard logging
SERVICE_NAME=your-app-api  # Service identifier
```

### Step 2: Verify Audit Logs

All audit logging is automatic when you use the provided patterns.

**Test it:**

1. Make a change through your API (create/update/delete)
2. Check audit logs:

```bash
psql $DATABASE_URL -c "SELECT id, action, resource_type, actor_email, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 10;"
```

3. Or use the API:

```bash
curl http://localhost:3001/api/audit-logs \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

### Step 3: Add Audit Logging to Your Routes

```javascript
const AuditLogRepo = require('./db/repos/@custom/AuditLogRepo')

router.patch('/api/posts/:id', authenticate, async (req, res, next) => {
  try {
    const old = await postsRepo.findById(req.params.id)
    const updated = await postsRepo.update(req.params.id, req.body)
    
    // Add audit log
    await AuditLogRepo.create({
      user_id: req.user.id,
      actor_email: req.user.email,
      action: 'update',
      resource_type: 'post',
      resource_id: String(req.params.id),
      old_data: old,
      new_data: updated,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    })
    
    res.json({ post: updated })
  } catch (err) {
    next(err)
  }
})
```

---

## 4. Complete .env Example

Here's a production-ready `.env` with all SaaS features enabled:

```bash
# ── App ───────────────────────────────────────────────────────────────
NODE_ENV=production
APP_NAME="Your SaaS App"
APP_URL=https://yourdomain.com
PORT=3001

# ── Database ──────────────────────────────────────────────────────────
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# ── Auth ──────────────────────────────────────────────────────────────
JWT_SECRET=your-super-secret-jwt-key-change-this
REFRESH_SECRET=your-refresh-token-secret
SESSION_SECRET=your-session-secret

# ── Email (Resend) ────────────────────────────────────────────────────
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM="Your App <noreply@yourdomain.com>"
EMAIL_TRACKING_SECRET=your-webhook-secret

# ── Storage (Cloudflare R2) ──────────────────────────────────────────
STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
R2_ACCESS_KEY_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
R2_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
R2_BUCKET=your-bucket-name
R2_PUBLIC_URL=https://pub-xxxxxxxxxxxx.r2.dev

# ── Logging ───────────────────────────────────────────────────────────
LOG_LEVEL=info
SERVICE_NAME=your-app-api

# ── Optional: Payment (Stripe) ────────────────────────────────────────
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx

# ── Optional: OAuth ────────────────────────────────────────────────────
GOOGLE_CLIENT_ID=xxxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxx
GITHUB_CLIENT_ID=xxxxxxxxxxxxxxxxxxxx
GITHUB_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 5. Verification Checklist

Use this checklist to ensure everything is working:

### Email System
- [ ] `.env` has email provider configured
- [ ] Test email sends successfully
- [ ] Email appears in recipient inbox (check spam!)
- [ ] Email log recorded in database
- [ ] Email templates render correctly
- [ ] Email tracking stats visible in admin panel

### File Upload
- [ ] `.env` has storage provider configured
- [ ] Storage health check returns success
- [ ] Can generate presigned upload URL
- [ ] Can upload file from browser
- [ ] File accessible via public URL
- [ ] Can delete uploaded file
- [ ] File upload tracked in database

### Logging
- [ ] Application logs visible in console
- [ ] Log level respected (debug/info/error)
- [ ] Structured logs in production (JSON format)
- [ ] HTTP requests logged automatically
- [ ] No sensitive data in logs

### Audit Trails
- [ ] Audit logs table exists
- [ ] Create/update/delete actions logged
- [ ] Old/new data snapshots captured
- [ ] Can query audit logs via API
- [ ] Resource history endpoint works
- [ ] User activity endpoint works

---

## 6. Production Deployment Tips

### Email

1. **Verify your domain** - Don't send from generic domains
2. **Set up SPF/DKIM/DMARC** - Improve deliverability
3. **Monitor bounce rates** - Remove bouncing addresses
4. **Use email verification** - Don't send to unverified emails
5. **Respect unsubscribes** - Store preferences

### File Upload

1. **Set CORS policies** - Allow browser uploads to S3/R2
2. **Validate file types** - Check MIME types server-side
3. **Scan for malware** - Use ClamAV or similar
4. **Set size limits** - Prevent abuse
5. **Use CDN** - Serve files through CloudFront/CloudFlare
6. **Clean up orphaned files** - Delete files after X days if not referenced

### Logging

1. **Aggregate logs** - Use LogDNA, Datadog, or similar
2. **Set up alerts** - Monitor error rates
3. **Rotate logs** - Don't fill disk space
4. **Redact sensitive data** - PII, passwords, tokens
5. **Archive audit logs** - Compliance requirements

---

## 7. Common Issues

### Email not sending

```bash
# Check provider configuration
curl http://localhost:3001/api/email/health

# Check email logs for errors
psql $DATABASE_URL -c "SELECT * FROM email_logs WHERE status = 'failed' ORDER BY created_at DESC LIMIT 5;"

# Verify environment variables
echo $EMAIL_PROVIDER
echo $RESEND_API_KEY  # Should NOT be empty
```

### File upload failing

```bash
# Check storage health
curl http://localhost:3001/api/storage/health \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Verify CORS settings (for S3/R2)
# Check bucket permissions
# Verify presigned URL expiration
```

### Audit logs not appearing

```bash
# Verify table exists
psql $DATABASE_URL -c "SELECT COUNT(*) FROM audit_logs;"

# Check for errors in application logs
# Verify AuditLogRepo.create() is being called
# Check IP address capture: req.ip might be undefined if behind proxy
```

---

## 8. Next Steps

Once all features are working:

1. **Customize email templates** - Update `server/src/lib/@system/Email/templates.js`
2. **Add webhook handlers** - Resend/SendGrid delivery webhooks
3. **Implement file virus scanning** - ClamAV integration
4. **Set up log aggregation** - Send logs to external service
5. **Create admin dashboards** - Email analytics, storage usage, audit trail viewer
6. **Add automated tests** - Test email sending, file upload, audit logging
7. **Document for your team** - Add project-specific setup instructions

---

## Support

- **Email Issues**: Check `docs/SAAS_CORE_FEATURES.md` section 1
- **Upload Issues**: Check `docs/SAAS_CORE_FEATURES.md` section 2
- **Logging Issues**: Check `docs/SAAS_CORE_FEATURES.md` section 3
- **API Patterns**: Check `docs/API_PATTERNS.md`

Need help? Check the inline code comments in:
- `server/src/lib/@system/Email/index.js`
- `server/src/lib/@system/StorageAdapter/index.js`
- `server/src/lib/@system/Logger/index.js`
