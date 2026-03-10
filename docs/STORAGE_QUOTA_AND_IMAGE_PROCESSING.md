# Storage Quota & Image Processing Guide

Comprehensive guide for storage quota management and automatic image optimization in the product-template.

## Table of Contents

1. [Storage Quota Management](#storage-quota-management)
2. [Image Processing](#image-processing)
3. [API Endpoints](#api-endpoints)
4. [Integration Examples](#integration-examples)
5. [Database Schema](#database-schema)

---

## Storage Quota Management

Track user file uploads and enforce storage limits to prevent abuse and manage costs.

### Features

- ✅ Per-user storage tracking
- ✅ Configurable quota limits by plan tier
- ✅ Real-time quota enforcement
- ✅ File lifecycle management (soft delete)
- ✅ Storage usage analytics
- ✅ System-wide statistics (admin)

### Basic Usage

#### Check User's Storage Status

```javascript
const StorageQuota = require('./lib/@system/StorageQuota')

// Get storage status
const status = await StorageQuota.getStorageStatus(userId)

console.log(status)
// {
//   usedBytes: 52428800,      // 50MB
//   quotaBytes: 104857600,    // 100MB
//   usedMb: 50,
//   quotaMb: 100,
//   percentage: 50.0,
//   availableBytes: 52428800,
//   isOverQuota: false
// }
```

#### Check if User Can Upload

```javascript
const fileSize = 10 * 1024 * 1024 // 10MB

const check = await StorageQuota.canUpload(userId, fileSize)

if (!check.allowed) {
  console.error(check.reason)
  // "File size (10 MB) exceeds available storage (5 MB)"
}
```

#### Track File Upload

```javascript
const file = await StorageQuota.trackUpload({
  userId: 123,
  storageKey: 'uploads/123/1234567890-photo.jpg',
  originalFilename: 'photo.jpg',
  contentType: 'image/jpeg',
  sizeBytes: 5242880, // 5MB
  folder: 'uploads',
  metadata: { camera: 'iPhone 15' },
})
```

#### Set User Quota

```javascript
// Set custom quota (in bytes)
await StorageQuota.setQuota(userId, 1024 * 1024 * 1024) // 1GB

// Set quota by tier
await StorageQuota.setQuotaByTier(userId, 'PRO') // 10GB

// Available tiers: FREE (100MB), PRO (10GB), ENTERPRISE (100GB)
```

#### Delete File

```javascript
// Soft delete in DB + hard delete in storage
await StorageQuota.deleteFile(storageKey, userId, true)

// Soft delete only (keeps file in storage)
await StorageQuota.deleteFile(storageKey, userId, false)
```

#### List User Files

```javascript
const files = await StorageQuota.getUserFiles(userId, {
  limit: 50,
  offset: 0,
  folder: 'uploads',
  contentType: 'image/%', // Wildcard filter
  includeDeleted: false,
})
```

#### Get System Statistics (Admin)

```javascript
const stats = await StorageQuota.getSystemStats()

console.log(stats)
// {
//   totalUsers: 1234,
//   totalFiles: 45678,
//   totalBytes: 123456789,
//   totalMb: 117.74,
//   totalGb: 0.11,
//   avgFileSize: 2702,
//   maxFileSize: 52428800,
//   oldestFile: Date,
//   newestFile: Date
// }
```

### Express Middleware

```javascript
const { quotaCheckMiddleware } = require('./lib/@system/StorageQuota')

// Check quota before allowing upload
app.post('/api/storage/upload-url',
  authenticate,
  quotaCheckMiddleware,
  async (req, res) => {
    // req.storageStatus contains current storage status
    // Will return 413 if over quota
  }
)
```

### Default Quotas

```javascript
const { DEFAULT_QUOTAS } = require('./lib/@system/StorageQuota')

console.log(DEFAULT_QUOTAS)
// {
//   FREE: 104857600,           // 100MB
//   PRO: 10737418240,          // 10GB
//   ENTERPRISE: 107374182400   // 100GB
// }
```

---

## Image Processing

Automatic image optimization, resizing, and variant generation using Sharp.

### Features

- ✅ Automatic optimization (WebP, JPEG, PNG, AVIF)
- ✅ Smart resizing with multiple fit modes
- ✅ Thumbnail generation
- ✅ Avatar processing (circular crop)
- ✅ Multiple size variants
- ✅ EXIF orientation handling
- ✅ Format conversion
- ✅ Metadata extraction

### Installation

```bash
# Sharp is an optional dependency
npm install sharp

# Or if already listed in package.json
npm install
```

Sharp is marked as optional - if not installed, image processing will gracefully fallback.

### Basic Usage

#### Optimize Image

```javascript
const ImageProcessor = require('./lib/@system/ImageProcessor')

// Read image buffer
const buffer = await fs.readFile('photo.jpg')

// Optimize as WebP
const optimized = await ImageProcessor.optimize(buffer, {
  format: 'webp',
  quality: 80,
  progressive: true,
})

// Save optimized version
await fs.writeFile('photo.webp', optimized)
```

#### Resize Image

```javascript
// Resize to specific dimensions
const resized = await ImageProcessor.resize(buffer, {
  width: 800,
  height: 600,
  fit: 'cover', // or 'contain', 'fill', 'inside', 'outside'
  position: 'centre', // or 'top', 'bottom', 'left', 'right', 'attention'
})
```

#### Generate Thumbnail

```javascript
const thumb = await ImageProcessor.thumbnail(buffer, {
  size: 150,
  square: true,
})
```

#### Generate Avatar

```javascript
// Creates circular avatar (PNG with alpha)
const avatar = await ImageProcessor.avatar(buffer, 200)
```

#### Process Upload (All-in-One)

```javascript
// Optimize + generate variants in one call
const processed = await ImageProcessor.processUpload(buffer, {
  generateVariants: true,
  format: 'webp',
  quality: 80,
  sizes: ['thumbnail', 'small', 'medium', 'large'],
})

// Result:
// {
//   original: Buffer,
//   thumbnail: Buffer,
//   small: Buffer,
//   medium: Buffer,
//   large: Buffer
// }
```

#### Get Image Metadata

```javascript
const metadata = await ImageProcessor.getMetadata(buffer)

console.log(metadata)
// {
//   format: 'jpeg',
//   width: 1920,
//   height: 1080,
//   space: 'srgb',
//   channels: 3,
//   depth: 'uchar',
//   hasAlpha: false,
//   orientation: 1,
//   isProgressive: true,
//   size: 524288
// }
```

#### Convert Format

```javascript
// JPEG to WebP
const webp = await ImageProcessor.convert(buffer, 'webp', { quality: 85 })

// PNG to AVIF
const avif = await ImageProcessor.convert(buffer, 'avif', { quality: 70 })
```

#### Validate Image

```javascript
const isValid = await ImageProcessor.isImage(buffer)
if (isValid) {
  console.log('Valid image!')
}
```

### Available Sizes

```javascript
const { SIZES } = require('./lib/@system/ImageProcessor')

console.log(SIZES)
// {
//   thumbnail: { width: 150, height: 150 },
//   small: { width: 320, height: 320 },
//   medium: { width: 640, height: 640 },
//   large: { width: 1280, height: 1280 },
//   avatar: { width: 200, height: 200 },
//   cover: { width: 1200, height: 630 }  // Social media cover
// }
```

### Check Availability

```javascript
if (ImageProcessor.isSharpAvailable()) {
  // Sharp is installed and ready
} else {
  // Fallback to original files
}
```

---

## API Endpoints

Complete REST API for storage management.

### GET /api/storage/status

Get current user's storage usage and quota.

**Auth:** Required

**Response:**
```json
{
  "success": true,
  "storage": {
    "usedBytes": 52428800,
    "quotaBytes": 104857600,
    "usedMb": 50,
    "quotaMb": 100,
    "percentage": 50.0,
    "availableBytes": 52428800,
    "isOverQuota": false
  }
}
```

### POST /api/storage/upload-url

Request presigned URL for direct browser upload.

**Auth:** Required

**Body:**
```json
{
  "filename": "photo.jpg",
  "contentType": "image/jpeg",
  "size": 5242880,
  "folder": "uploads",
  "generateVariants": true
}
```

**Response:**
```json
{
  "success": true,
  "uploadUrl": "https://s3.amazonaws.com/...",
  "fields": { ... },
  "key": "uploads/123/1234567890-photo.jpg",
  "expiresAt": "2024-03-10T10:15:00Z",
  "isImage": true,
  "shouldProcessImage": true,
  "storageStatus": { ... }
}
```

**Errors:**
- `413` - Storage quota exceeded
- `400` - Invalid file type or size

### POST /api/storage/confirm

Confirm successful upload and track in database.

**Auth:** Required

**Body:**
```json
{
  "key": "uploads/123/1234567890-photo.jpg",
  "originalFilename": "photo.jpg",
  "contentType": "image/jpeg",
  "size": 5242880,
  "metadata": { "camera": "iPhone 15" }
}
```

**Response:**
```json
{
  "success": true,
  "file": {
    "id": 42,
    "key": "uploads/123/1234567890-photo.jpg",
    "filename": "photo.jpg",
    "contentType": "image/jpeg",
    "size": 5242880,
    "createdAt": "2024-03-10T10:00:00Z",
    "url": "https://cdn.example.com/uploads/123/..."
  },
  "storage": { ... }
}
```

### GET /api/storage/files

List user's uploaded files.

**Auth:** Required

**Query Parameters:**
- `limit` (default: 50)
- `offset` (default: 0)
- `folder` (optional filter)
- `contentType` (optional filter, supports wildcards: `image/%`)

**Response:**
```json
{
  "success": true,
  "files": [
    {
      "id": 42,
      "user_id": 123,
      "storage_key": "uploads/123/...",
      "original_filename": "photo.jpg",
      "content_type": "image/jpeg",
      "size_bytes": 5242880,
      "created_at": "2024-03-10T10:00:00Z",
      "url": "https://cdn.example.com/..."
    }
  ],
  "count": 10,
  "limit": 50,
  "offset": 0
}
```

### DELETE /api/storage/files/:key

Delete a file (soft delete in DB + hard delete in storage).

**Auth:** Required

**Params:**
- `key` - Storage key (URL-encoded)

**Response:**
```json
{
  "success": true,
  "message": "File deleted successfully",
  "storage": { ... }
}
```

### POST /api/storage/process-image

Process an already-uploaded image (generate variants, optimize).

**Auth:** Required

**Body:**
```json
{
  "key": "uploads/123/1234567890-photo.jpg",
  "sizes": ["thumbnail", "small", "medium"],
  "format": "webp"
}
```

**Response:**
```json
{
  "success": true,
  "original": "uploads/123/1234567890-photo.jpg",
  "variants": {
    "thumbnail": "uploads/123/1234567890-photo-thumbnail.webp",
    "small": "uploads/123/1234567890-photo-small.webp",
    "medium": "uploads/123/1234567890-photo-medium.webp"
  },
  "variantUrls": {
    "thumbnail": "https://cdn.example.com/...",
    "small": "https://cdn.example.com/...",
    "medium": "https://cdn.example.com/..."
  }
}
```

### GET /api/storage/stats

Get system-wide storage statistics (admin only).

**Auth:** Required (Admin)

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalUsers": 1234,
    "totalFiles": 45678,
    "totalBytes": 123456789,
    "totalMb": 117.74,
    "totalGb": 0.11,
    "avgFileSize": 2702,
    "maxFileSize": 52428800,
    "oldestFile": "2024-01-01T00:00:00Z",
    "newestFile": "2024-03-10T10:00:00Z"
  }
}
```

---

## Integration Examples

### Complete Upload Flow (Client → Server → Storage)

#### 1. Client Requests Upload URL

```javascript
// Client-side
async function uploadFile(file) {
  // Step 1: Request upload URL from backend
  const response = await fetch('/api/storage/upload-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      size: file.size,
      folder: 'uploads',
      generateVariants: true, // For images
    }),
  })

  if (!response.ok) {
    if (response.status === 413) {
      throw new Error('Storage quota exceeded')
    }
    throw new Error('Failed to request upload URL')
  }

  const { uploadUrl, fields, key } = await response.json()

  // Step 2: Upload directly to storage (bypasses server)
  const formData = new FormData()
  Object.entries(fields || {}).forEach(([k, v]) => formData.append(k, v))
  formData.append('file', file)

  await fetch(uploadUrl, {
    method: 'POST',
    body: formData,
  })

  // Step 3: Confirm upload with backend
  const confirmResponse = await fetch('/api/storage/confirm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      key,
      originalFilename: file.name,
      contentType: file.type,
      size: file.size,
    }),
  })

  const result = await confirmResponse.json()
  return result.file
}
```

#### 2. Server-Side Processing

```javascript
// server/src/api/posts/create.js
const express = require('express')
const router = express.Router()
const StorageQuota = require('../../lib/@system/StorageQuota')
const ImageProcessor = require('../../lib/@system/ImageProcessor')

router.post('/posts',
  authenticate,
  async (req, res, next) => {
    try {
      const { title, content, imageKey } = req.body

      // If image provided, verify it belongs to user
      let imageUrl = null
      if (imageKey) {
        const files = await StorageQuota.getUserFiles(req.user.id, {
          limit: 1,
        })

        const file = files.find(f => f.storage_key === imageKey)
        if (file) {
          imageUrl = StorageAdapter.getPublicUrl(imageKey)
        }
      }

      // Create post
      const post = await db.one(
        `INSERT INTO posts (user_id, title, content, image_url)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [req.user.id, title, content, imageUrl]
      )

      res.json({ success: true, post })
    } catch (err) {
      next(err)
    }
  }
)
```

### Auto-Process Uploaded Images

```javascript
// After upload confirmation
app.post('/api/storage/confirm', authenticate, async (req, res) => {
  const { key, contentType } = req.body

  // Track upload
  const file = await StorageQuota.trackUpload({ ... })

  // Auto-process if image
  if (contentType.startsWith('image/') && ImageProcessor.isSharpAvailable()) {
    // Process in background (don't block response)
    processImageInBackground(key).catch(err => {
      logger.error({ err, key }, 'Image processing failed')
    })
  }

  res.json({ success: true, file })
})

async function processImageInBackground(key) {
  // Download original
  const downloadUrl = await StorageAdapter.createDownloadUrl({ key })
  const response = await fetch(downloadUrl.url)
  const buffer = Buffer.from(await response.arrayBuffer())

  // Generate variants
  const processed = await ImageProcessor.processUpload(buffer, {
    generateVariants: true,
    sizes: ['thumbnail', 'small', 'medium'],
    format: 'webp',
  })

  // Upload variants
  for (const [sizeName, variantBuffer] of Object.entries(processed)) {
    if (sizeName === 'original') continue

    const variantKey = key.replace(/\.[^.]+$/, `-${sizeName}.webp`)
    const uploadData = await StorageAdapter.createUploadUrl({
      key: variantKey,
      contentType: 'image/webp',
    })

    await fetch(uploadData.url, {
      method: 'PUT',
      body: variantBuffer,
    })
  }
}
```

---

## Database Schema

### file_uploads

```sql
CREATE TABLE file_uploads (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  storage_key VARCHAR(500) UNIQUE NOT NULL,
  original_filename VARCHAR(500) NOT NULL,
  content_type VARCHAR(100),
  size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
  folder VARCHAR(200) DEFAULT 'uploads',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_file_uploads_user_id ON file_uploads(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_file_uploads_deleted_at ON file_uploads(deleted_at);
CREATE INDEX idx_file_uploads_created_at ON file_uploads(created_at);
CREATE INDEX idx_file_uploads_folder ON file_uploads(folder) WHERE deleted_at IS NULL;
```

### storage_quotas

```sql
CREATE TABLE storage_quotas (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  quota_bytes BIGINT NOT NULL DEFAULT 104857600 CHECK (quota_bytes > 0),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_storage_quotas_user_id ON storage_quotas(user_id);
```

### user_storage_usage (View)

```sql
CREATE VIEW user_storage_usage AS
SELECT 
  user_id,
  COUNT(*) as file_count,
  SUM(size_bytes) as total_bytes,
  ROUND(SUM(size_bytes) / (1024.0 * 1024.0), 2) as total_mb,
  ROUND(SUM(size_bytes) / (1024.0 * 1024.0 * 1024.0), 2) as total_gb,
  MAX(created_at) as last_upload_at
FROM file_uploads
WHERE deleted_at IS NULL
GROUP BY user_id;
```

### get_storage_status Function

```sql
CREATE FUNCTION get_storage_status(p_user_id INTEGER)
RETURNS TABLE (
  used_bytes BIGINT,
  quota_bytes BIGINT,
  used_mb NUMERIC,
  quota_mb NUMERIC,
  percentage NUMERIC,
  available_bytes BIGINT,
  is_over_quota BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(u.total_bytes, 0)::BIGINT as used_bytes,
    COALESCE(q.quota_bytes, 104857600)::BIGINT as quota_bytes,
    ROUND(COALESCE(u.total_bytes, 0) / (1024.0 * 1024.0), 2) as used_mb,
    ROUND(COALESCE(q.quota_bytes, 104857600) / (1024.0 * 1024.0), 2) as quota_mb,
    ROUND((COALESCE(u.total_bytes, 0)::NUMERIC / COALESCE(q.quota_bytes, 104857600)::NUMERIC) * 100, 1) as percentage,
    GREATEST(COALESCE(q.quota_bytes, 104857600) - COALESCE(u.total_bytes, 0), 0)::BIGINT as available_bytes,
    COALESCE(u.total_bytes, 0) > COALESCE(q.quota_bytes, 104857600) as is_over_quota
  FROM (SELECT p_user_id as user_id) base
  LEFT JOIN user_storage_usage u ON u.user_id = base.user_id
  LEFT JOIN storage_quotas q ON q.user_id = base.user_id;
END;
$$ LANGUAGE plpgsql STABLE;
```

---

## Environment Variables

```bash
# Storage Quotas
FREE_TIER_STORAGE_MB=100
PRO_TIER_STORAGE_MB=10000
ENTERPRISE_TIER_STORAGE_MB=100000

# Image Processing (Sharp will auto-detect if installed)
IMAGE_PROCESSING_ENABLED=true
IMAGE_DEFAULT_FORMAT=webp
IMAGE_DEFAULT_QUALITY=80
```

---

## Production Checklist

- [ ] Run migration: `npm run migrate`
- [ ] Install Sharp: `npm install sharp` (optional)
- [ ] Set default quotas for existing users
- [ ] Configure cleanup cron job for abandoned uploads
- [ ] Monitor storage costs and usage
- [ ] Test quota enforcement
- [ ] Test image processing
- [ ] Set up CDN for optimized assets

---

## Related Documentation

- [SAAS_CORE_FEATURES.md](./SAAS_CORE_FEATURES.md) - Email, logging, error tracking
- [API_PATTERNS.md](./API_PATTERNS.md) - API design patterns
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture overview
