// @system — Email-specific rate limiting
// Provides per-recipient and global send rate limiting to protect deliverability.
// Uses Redis when available, falls back to in-memory store.
//
// Limits (configurable via env vars):
//   - Per recipient: max 5 emails per 15 minutes (prevents user-facing spam)
//   - Global: max 100 emails per minute (stays within provider limits)
//   - Daily: max 10,000 emails per day (safety net)
//
// Usage:
//   const emailLimiter = require('../lib/@system/Email/rate-limit')
//   const allowed = await emailLimiter.checkLimit('user@example.com')
//   if (!allowed.ok) throw new Error(`Rate limited: ${allowed.reason}`)
//   // ... send the email ...
//   await emailLimiter.recordSend('user@example.com')

'use strict'

const logger = require('../Logger')

// ── Configuration ─────────────────────────────────────────────────────────────

const RECIPIENT_MAX = parseInt(process.env.EMAIL_RATE_RECIPIENT_MAX ?? '5', 10)
const RECIPIENT_WINDOW_SEC = parseInt(process.env.EMAIL_RATE_RECIPIENT_WINDOW_SEC ?? '900', 10) // 15 min
const GLOBAL_MAX_PER_MIN = parseInt(process.env.EMAIL_RATE_GLOBAL_MAX_PER_MIN ?? '100', 10)
const DAILY_MAX = parseInt(process.env.EMAIL_RATE_DAILY_MAX ?? '10000', 10)

// ── In-memory fallback store ──────────────────────────────────────────────────
// Used when Redis is unavailable. Not shared across processes,
// but sufficient for single-instance deployments and dev/test.

class MemoryStore {
  constructor() {
    this.buckets = new Map()   // key -> { count, expiresAt }
    this._cleanupInterval = setInterval(() => this._cleanup(), 60000)
    if (this._cleanupInterval.unref) this._cleanupInterval.unref()
  }

  async increment(key, windowSec) {
    const now = Date.now()
    const entry = this.buckets.get(key)

    if (!entry || entry.expiresAt <= now) {
      this.buckets.set(key, { count: 1, expiresAt: now + windowSec * 1000 })
      return 1
    }

    entry.count++
    return entry.count
  }

  async getCount(key) {
    const entry = this.buckets.get(key)
    if (!entry || entry.expiresAt <= Date.now()) return 0
    return entry.count
  }

  /** Returns remaining TTL in seconds for a key, or 0 if absent/expired. */
  async getTtl(key) {
    const entry = this.buckets.get(key)
    if (!entry || entry.expiresAt <= Date.now()) return 0
    return Math.ceil((entry.expiresAt - Date.now()) / 1000)
  }

  _cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.buckets) {
      if (entry.expiresAt <= now) this.buckets.delete(key)
    }
  }

  destroy() {
    if (this._cleanupInterval) clearInterval(this._cleanupInterval)
  }
}

// ── Store selection ───────────────────────────────────────────────────────────

let _store = null

function getStore() {
  if (_store) return _store

  try {
    const { client: redis, isReady: redisReady } = require('../Redis')
    if (redisReady()) {
      _store = new RedisStore(redis)
      logger.info('[Email/RateLimit] Using Redis store')
      return _store
    }
  } catch {
    // Redis not available
  }

  _store = new MemoryStore()
  logger.info('[Email/RateLimit] Using in-memory store (Redis unavailable)')
  return _store
}

// ── Redis store ───────────────────────────────────────────────────────────────

class RedisStore {
  constructor(redis) {
    this.redis = redis
  }

  async increment(key, windowSec) {
    const fullKey = `email:rl:${key}`
    const pipeline = this.redis.pipeline()
    pipeline.incr(fullKey)
    pipeline.expire(fullKey, windowSec)
    const [[, count]] = await pipeline.exec()
    return count
  }

  async getCount(key) {
    const fullKey = `email:rl:${key}`
    const count = await this.redis.get(fullKey)
    return count ? parseInt(count, 10) : 0
  }

  /** Returns remaining TTL in seconds, or 0 if absent/expired. */
  async getTtl(key) {
    const fullKey = `email:rl:${key}`
    const ttl = await this.redis.ttl(fullKey)
    return ttl > 0 ? ttl : 0
  }

  destroy() {
    // Redis client is shared, don't close it
  }
}

// ── Per-recipient sliding-window limits ───────────────────────────────────────

const DEFAULT_MAX_PER_MINUTE = parseInt(process.env.EMAIL_RATE_MAX_PER_MINUTE ?? '5',   10)
const DEFAULT_MAX_PER_HOUR   = parseInt(process.env.EMAIL_RATE_MAX_PER_HOUR   ?? '20',  10)
const DEFAULT_MAX_PER_DAY    = parseInt(process.env.EMAIL_RATE_MAX_PER_DAY    ?? '100', 10)

/**
 * Per-recipient sliding-window rate limiter.
 * Tracks sends across three independent windows: per-minute, per-hour, per-day.
 */
class EmailRateLimiter {
  /**
   * @param {object} [opts]
   * @param {number} [opts.maxPerMinute=5]   Max emails per minute per recipient
   * @param {number} [opts.maxPerHour=20]    Max emails per hour per recipient
   * @param {number} [opts.maxPerDay=100]    Max emails per day per recipient
   */
  constructor(opts = {}) {
    this.maxPerMinute = opts.maxPerMinute ?? DEFAULT_MAX_PER_MINUTE
    this.maxPerHour   = opts.maxPerHour   ?? DEFAULT_MAX_PER_HOUR
    this.maxPerDay    = opts.maxPerDay    ?? DEFAULT_MAX_PER_DAY
  }

  _keys(to) {
    const e = to.toLowerCase().trim()
    return {
      minute: `rcp:${e}:min`,
      hour:   `rcp:${e}:hr`,
      day:    `rcp:${e}:day`,
    }
  }

  /**
   * Check whether sending to `to` is allowed. Does NOT consume a slot.
   * Call recordSend() after the email is successfully delivered.
   *
   * @param {string} to Recipient address
   * @returns {Promise<{ allowed: boolean, retryAfter?: number, limits: object }>}
   */
  async checkRateLimit(to) {
    const store = getStore()
    const keys  = this._keys(to)

    try {
      const [minCount, hrCount, dayCount] = await Promise.all([
        store.getCount(keys.minute),
        store.getCount(keys.hour),
        store.getCount(keys.day),
      ])

      const limits = {
        minute: { current: minCount, max: this.maxPerMinute, window: 60 },
        hour:   { current: hrCount,  max: this.maxPerHour,   window: 3600 },
        day:    { current: dayCount, max: this.maxPerDay,    window: 86400 },
      }

      if (minCount >= this.maxPerMinute) {
        const retryAfter = await store.getTtl(keys.minute)
        return { allowed: false, retryAfter: retryAfter || 60, limits }
      }

      if (hrCount >= this.maxPerHour) {
        const retryAfter = await store.getTtl(keys.hour)
        return { allowed: false, retryAfter: retryAfter || 3600, limits }
      }

      if (dayCount >= this.maxPerDay) {
        const retryAfter = await store.getTtl(keys.day)
        return { allowed: false, retryAfter: retryAfter || 86400, limits }
      }

      return { allowed: true, limits }
    } catch (err) {
      // Fail open — rate limit errors must never block delivery
      logger.error({ err, to }, '[Email/RateLimit] checkRateLimit failed — allowing send')
      return { allowed: true, limits: null }
    }
  }

  /**
   * Record a successful send. Call this AFTER the email is delivered.
   *
   * @param {string} to Recipient address
   */
  async recordSend(to) {
    const store = getStore()
    const keys  = this._keys(to)

    try {
      await Promise.all([
        store.increment(keys.minute, 60),
        store.increment(keys.hour,   3600),
        store.increment(keys.day,    86400),
      ])
    } catch (err) {
      logger.error({ err, to }, '[Email/RateLimit] recordSend failed')
    }
  }
}

/**
 * Create a configurable per-recipient email rate limiter.
 *
 * @param {object} [opts]
 * @param {number} [opts.maxPerMinute=5]   Max emails per minute per recipient
 * @param {number} [opts.maxPerHour=20]    Max emails per hour per recipient
 * @param {number} [opts.maxPerDay=100]    Max emails per day per recipient
 * @returns {EmailRateLimiter}
 */
function createEmailRateLimiter(opts = {}) {
  return new EmailRateLimiter(opts)
}

// ── Module-level default instance ─────────────────────────────────────────────
// Uses env-var defaults. Shared across all callers that use the module-level API.

const _defaultLimiter = new EmailRateLimiter()

// ── Rate limit checks ─────────────────────────────────────────────────────────

/**
 * Check whether sending to `to` is allowed using the default rate limiter.
 * Does NOT consume a slot — call recordSend() after successful delivery.
 *
 * @param {string} to Recipient address
 * @returns {Promise<{ allowed: boolean, retryAfter?: number, limits: object }>}
 */
async function checkRateLimit(to) {
  return _defaultLimiter.checkRateLimit(to)
}

/**
 * Record a successful send using the default rate limiter.
 * Call this AFTER the email is delivered.
 *
 * @param {string} to Recipient address
 */
async function recordSend(to) {
  return _defaultLimiter.recordSend(to)
}

// ── Legacy API ────────────────────────────────────────────────────────────────

/**
 * @deprecated Use checkRateLimit() instead.
 *
 * Check whether sending an email to this recipient is allowed.
 * Does NOT consume a slot — call recordSend() after successful send.
 *
 * @param {string} email Recipient address
 * @returns {Promise<{ ok: boolean, reason?: string, limits: object }>}
 */
async function checkLimit(email) {
  const store = getStore()
  const normalizedEmail = email.toLowerCase().trim()

  try {
    const [recipientCount, globalCount, dailyCount] = await Promise.all([
      store.getCount(`recipient:${normalizedEmail}`),
      store.getCount('global:minute'),
      store.getCount('global:daily'),
    ])

    const limits = {
      recipient: { current: recipientCount, max: RECIPIENT_MAX, windowSec: RECIPIENT_WINDOW_SEC },
      global: { current: globalCount, max: GLOBAL_MAX_PER_MIN },
      daily: { current: dailyCount, max: DAILY_MAX },
    }

    if (recipientCount >= RECIPIENT_MAX) {
      return {
        ok: false,
        reason: `Recipient rate limit exceeded (${recipientCount}/${RECIPIENT_MAX} in ${RECIPIENT_WINDOW_SEC}s)`,
        limits,
      }
    }

    if (globalCount >= GLOBAL_MAX_PER_MIN) {
      return {
        ok: false,
        reason: `Global rate limit exceeded (${globalCount}/${GLOBAL_MAX_PER_MIN} per minute)`,
        limits,
      }
    }

    if (dailyCount >= DAILY_MAX) {
      return {
        ok: false,
        reason: `Daily send limit exceeded (${dailyCount}/${DAILY_MAX} per day)`,
        limits,
      }
    }

    return { ok: true, limits }
  } catch (err) {
    // Fail open: if rate limit check fails, allow the email
    logger.error({ err, email: normalizedEmail }, '[Email/RateLimit] check failed — allowing send')
    return { ok: true, limits: null }
  }
}

/**
 * Get current rate limit stats (for monitoring dashboards).
 *
 * @returns {Promise<object>}
 */
async function getStats() {
  const store = getStore()

  try {
    const [globalPerMin, dailyTotal] = await Promise.all([
      store.getCount('global:minute'),
      store.getCount('global:daily'),
    ])

    return {
      globalPerMinute: { current: globalPerMin, max: GLOBAL_MAX_PER_MIN },
      daily: { current: dailyTotal, max: DAILY_MAX },
      config: {
        recipientMax: RECIPIENT_MAX,
        recipientWindowSec: RECIPIENT_WINDOW_SEC,
        globalMaxPerMin: GLOBAL_MAX_PER_MIN,
        dailyMax: DAILY_MAX,
      },
    }
  } catch (err) {
    logger.error({ err }, '[Email/RateLimit] stats failed')
    return null
  }
}

module.exports = {
  // Primary API
  createEmailRateLimiter,
  checkRateLimit,
  recordSend,
  // Monitoring
  getStats,
  // Legacy
  checkLimit,
  // Internals (for testing)
  MemoryStore,
  // Constants
  DEFAULT_MAX_PER_MINUTE,
  DEFAULT_MAX_PER_HOUR,
  DEFAULT_MAX_PER_DAY,
  RECIPIENT_MAX,
  RECIPIENT_WINDOW_SEC,
  GLOBAL_MAX_PER_MIN,
  DAILY_MAX,
}
