// Stub: email encryption helpers
// In production, implement actual encryption. This stub normalizes/passes through.
const crypto = require('crypto')

function hashEmail(email) {
  return crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex')
}

function decryptEmail(encrypted) {
  // No-op: return as-is (no encryption configured)
  return encrypted
}

function normaliseEmail(email) {
  return email.toLowerCase().trim()
}

module.exports = { hashEmail, decryptEmail, normaliseEmail }
