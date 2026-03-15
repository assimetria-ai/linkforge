// @system — S3 client (AWS SDK v3)
// Presigned PUT URL generation, object deletion, and upload URL helpers.
//
// When S3_BUCKET + AWS credentials are not configured, all functions degrade
// gracefully (return null / false) so callers can fall back to local disk storage.
//
// Supports MinIO and LocalStack via S3_ENDPOINT.
//
// Usage:
//   const s3 = require('../lib/@system/S3')
//   if (s3.isConfigured()) {
//     const { url, expiresAt } = await s3.getPresignedPutUrl({ key, mimeType })
//     await s3.deleteObject({ key })
//   }

const logger = require('../Logger')

// ── Configuration check ───────────────────────────────────────────────────────

/**
 * Returns true when all required S3 env vars are present.
 * Required: S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
 */
function isConfigured() {
  return !!(
    process.env.S3_BUCKET &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY
  )
}

// ── S3Client singleton (lazy init) ────────────────────────────────────────────

let _client = null

function getClient() {
  if (_client) return _client

  const { S3Client } = require('@aws-sdk/client-s3')

  _client = new S3Client({
    region: process.env.AWS_REGION ?? 'eu-west-1',
    ...(process.env.S3_ENDPOINT && {
      endpoint: process.env.S3_ENDPOINT,
      // Required for path-style addressing with MinIO and LocalStack.
      forcePathStyle: true,
    }),
  })

  return _client
}

// ── Presigned PUT URL ─────────────────────────────────────────────────────────

/**
 * Generate a presigned PUT URL for direct client-to-S3 upload.
 *
 * The client must send the file in the body of a PUT request to the returned URL
 * and include `Content-Type: <mimeType>` in its headers.
 *
 * @param {object}  opts
 * @param {string}  opts.key          - S3 object key, e.g. "avatars/123-abc.jpg"
 * @param {string}  opts.mimeType     - Content-Type the client will send with the PUT
 * @param {number}  [opts.expiresIn]  - URL validity in seconds (default: 900 = 15 min)
 * @returns {Promise<{ url: string, expiresAt: number }|null>} null when S3 not configured
 */
async function getPresignedPutUrl({ key, mimeType, expiresIn = 900 }) {
  if (!isConfigured()) return null

  try {
    const { PutObjectCommand }  = require('@aws-sdk/client-s3')
    const { getSignedUrl }      = require('@aws-sdk/s3-request-presigner')

    const command = new PutObjectCommand({
      Bucket:      process.env.S3_BUCKET,
      Key:         key,
      ContentType: mimeType,
    })

    const url = await getSignedUrl(getClient(), command, { expiresIn })

    logger.debug({ key, mimeType, expiresIn }, 's3 presigned PUT URL generated')

    return { url, expiresAt: Date.now() + expiresIn * 1000 }
  } catch (err) {
    logger.error({ err, key }, 's3 getPresignedPutUrl failed')
    throw err
  }
}

// ── Delete object ─────────────────────────────────────────────────────────────

/**
 * Delete a single object from S3.
 *
 * @param {object} opts
 * @param {string} opts.key - Full S3 object key, e.g. "avatars/123-abc.jpg"
 * @returns {Promise<boolean>} false when S3 not configured, true on success
 */
async function deleteObject({ key }) {
  if (!isConfigured()) return false

  try {
    const { DeleteObjectCommand } = require('@aws-sdk/client-s3')

    await getClient().send(new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key:    key,
    }))

    logger.info({ key }, 's3 object deleted')
    return true
  } catch (err) {
    logger.error({ err, key }, 's3 deleteObject failed')
    throw err
  }
}

// ── Public URL helper ─────────────────────────────────────────────────────────

/**
 * Build the public URL for an object.
 *
 * For custom endpoints (MinIO/LocalStack) uses path-style.
 * For AWS S3 uses the virtual-hosted-style URL.
 *
 * @param {string} key - S3 object key
 * @returns {string|null} null when S3 not configured
 */
function getPublicUrl(key) {
  if (!isConfigured()) return null

  const bucket = process.env.S3_BUCKET
  const region = process.env.AWS_REGION ?? 'eu-west-1'

  if (process.env.S3_ENDPOINT) {
    // Path-style for custom endpoints: <endpoint>/<bucket>/<key>
    return `${process.env.S3_ENDPOINT.replace(/\/$/, '')}/${bucket}/${key}`
  }

  // Virtual-hosted-style for AWS S3
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`
}

module.exports = {
  isConfigured,
  getPresignedPutUrl,
  deleteObject,
  getPublicUrl,
}
