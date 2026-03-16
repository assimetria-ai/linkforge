/**
 * Rate Limiting Tests for /api/sessions (Task #9232)
 *
 * Tests that the login endpoint properly rate limits requests to prevent
 * brute-force attacks. Rate limiting should allow 5 requests per 15 minutes
 * and return 429 (Too Many Requests) after that.
 *
 * These tests run in a NON-test environment to verify rate limiting actually works.
 */

const request = require('supertest')

// ── Mock PostgreSQL ────────────────────────────────────────────────────────
jest.mock('../../../src/lib/@system/PostgreSQL', () => {
  const users = new Map()
  const refreshTokens = new Map()
  const sessions = new Map()

  const mockDb = {
    _users: users,
    _sessions: sessions,
    _refreshTokens: refreshTokens,
    _reset() {
      users.clear()
      refreshTokens.clear()
      sessions.clear()
    },

    one: jest.fn(),
    oneOrNone: jest.fn(),
    none: jest.fn(),
    any: jest.fn(),
    tx: jest.fn(async (fn) => fn(mockDb)),
  }

  return mockDb
})

// ── Mock Redis (rate limiting will use in-memory store) ────────────────────
jest.mock('../../../src/lib/@system/Redis', () => {
  const store = new Map()
  const client = {
    get: jest.fn(async (k) => store.get(k) ?? null),
    set: jest.fn(async (k, v) => store.set(k, v)),
    del: jest.fn(async (k) => store.delete(k)),
    exists: jest.fn(async (k) => (store.has(k) ? 1 : 0)),
    incr: jest.fn(async (k) => {
      const n = parseInt(store.get(k) ?? '0', 10) + 1
      store.set(k, String(n))
      return n
    }),
    expire: jest.fn(),
    ttl: jest.fn(async () => -1),
    pipeline: jest.fn(() => ({
      incr: jest.fn().mockReturnThis(),
      ttl: jest.fn().mockReturnThis(),
      exec: jest.fn(async () => [[null, 1], [null, -1]]),
    })),
    _store: store,
    _reset: () => store.clear(),
  }
  return { 
    client, 
    // Redis is NOT ready, so rate limiter will use in-memory store
    isReady: () => false 
  }
})

// ── Mock Email service ─────────────────────────────────────────────────────
jest.mock('../../../src/lib/@system/Email', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
}))

// ── Override NODE_ENV to enable rate limiting ──────────────────────────────
const originalEnv = process.env.NODE_ENV
beforeAll(() => {
  // Set to 'development' to bypass the skip check
  process.env.NODE_ENV = 'development'
})

afterAll(() => {
  process.env.NODE_ENV = originalEnv
})

const db = require('../../../src/lib/@system/PostgreSQL')
const { client: redis } = require('../../../src/lib/@system/Redis')

// Generate valid JWT key pairs for tests
const crypto = require('crypto')
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
})
process.env.JWT_PRIVATE_KEY = privateKey.replace(/\n/g, '\\n')
process.env.JWT_PUBLIC_KEY = publicKey.replace(/\n/g, '\\n')

// Clear mocks and reset rate limit counters before each test
beforeEach(() => {
  db._reset()
  redis._reset()
  jest.clearAllMocks()
})

describe('POST /api/sessions — Rate Limiting (Task #9232)', () => {
  
  // Import app AFTER environment is set
  let app
  beforeAll(() => {
    // Clear require cache to force reload with new NODE_ENV
    delete require.cache[require.resolve('../../../src/app')]
    delete require.cache[require.resolve('../../../src/lib/@system/RateLimit')]
    app = require('../../../src/app')
  })

  describe('Login Rate Limiting', () => {
    
    it('should allow 5 login attempts within the limit', async () => {
      const credentials = { email: 'test@example.com', password: 'Password123' }
      
      // Make 5 requests - all should be allowed (will return 401 due to no user, but not 429)
      for (let i = 0; i < 5; i++) {
        const res = await request(app)
          .post('/api/sessions')
          .send(credentials)
        
        // Expecting 401 (invalid credentials) not 429 (rate limited)
        expect(res.status).not.toBe(429)
      }
    })

    it('should return 429 after 6th rapid login attempt', async () => {
      const credentials = { email: 'test@example.com', password: 'Password123' }
      
      // Make 5 requests to reach the limit
      for (let i = 0; i < 5; i++) {
        await request(app).post('/api/sessions').send(credentials)
      }
      
      // 6th request should be rate limited
      const res = await request(app)
        .post('/api/sessions')
        .send(credentials)
      
      expect(res.status).toBe(429)
      expect(res.body).toHaveProperty('message')
      expect(res.body.message).toContain('Too many login attempts')
    })

    it('should return 429 after multiple rapid requests (stress test)', async () => {
      const credentials = { email: 'attacker@example.com', password: 'BruteForce123' }
      
      // Simulate brute-force attack with 20 rapid requests
      const responses = []
      for (let i = 0; i < 20; i++) {
        const res = await request(app)
          .post('/api/sessions')
          .send(credentials)
        responses.push(res.status)
      }
      
      // Count how many were rate limited (429)
      const rateLimited = responses.filter(status => status === 429).length
      
      // Should have at least 15 rate-limited responses (20 total - 5 allowed)
      expect(rateLimited).toBeGreaterThanOrEqual(15)
      
      // First 5 should NOT be rate limited
      expect(responses.slice(0, 5).every(status => status !== 429)).toBe(true)
      
      // After 5, all should be rate limited
      expect(responses.slice(5).every(status => status === 429)).toBe(true)
    })

    it('should include RateLimit headers in responses', async () => {
      const credentials = { email: 'test@example.com', password: 'Password123' }
      
      const res = await request(app)
        .post('/api/sessions')
        .send(credentials)
      
      // Should have standard rate limit headers
      expect(res.headers).toHaveProperty('ratelimit-limit')
      expect(res.headers).toHaveProperty('ratelimit-remaining')
      expect(res.headers).toHaveProperty('ratelimit-reset')
    })

    it('should rate limit per IP address', async () => {
      const credentials = { email: 'test@example.com', password: 'Password123' }
      
      // Simulate requests from same IP
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/sessions')
          .set('X-Forwarded-For', '192.168.1.100')
          .send(credentials)
      }
      
      // 6th request from same IP should be blocked
      const blocked = await request(app)
        .post('/api/sessions')
        .set('X-Forwarded-For', '192.168.1.100')
        .send(credentials)
      
      expect(blocked.status).toBe(429)
      
      // But request from different IP should still work
      const allowed = await request(app)
        .post('/api/sessions')
        .set('X-Forwarded-For', '192.168.1.200')
        .send(credentials)
      
      expect(allowed.status).not.toBe(429)
    })

    it('should prevent timing-based enumeration attacks', async () => {
      // Attacker tries many different emails rapidly
      const emails = [
        'user1@example.com',
        'user2@example.com',
        'user3@example.com',
        'user4@example.com',
        'user5@example.com',
        'user6@example.com',
      ]
      
      const results = []
      for (const email of emails) {
        const res = await request(app)
          .post('/api/sessions')
          .send({ email, password: 'Test123' })
        results.push(res.status)
      }
      
      // 6th attempt should be rate limited regardless of email
      expect(results[5]).toBe(429)
    })

    it('should return appropriate error message when rate limited', async () => {
      const credentials = { email: 'test@example.com', password: 'Password123' }
      
      // Exhaust the limit
      for (let i = 0; i < 5; i++) {
        await request(app).post('/api/sessions').send(credentials)
      }
      
      // Next request should return proper error
      const res = await request(app)
        .post('/api/sessions')
        .send(credentials)
      
      expect(res.status).toBe(429)
      expect(res.body.message).toBe('Too many login attempts. Please try again in 15 minutes.')
    })
  })

  describe('Rate Limit Configuration', () => {
    
    it('should have a 15-minute window', async () => {
      // This test verifies the window is configured correctly
      // Actual time-based testing would require waiting or mocking time
      const credentials = { email: 'test@example.com', password: 'Password123' }
      
      const res = await request(app)
        .post('/api/sessions')
        .send(credentials)
      
      // Check that the reset time is approximately 15 minutes from now
      const resetHeader = res.headers['ratelimit-reset']
      if (resetHeader) {
        const resetTime = new Date(parseInt(resetHeader) * 1000)
        const now = new Date()
        const diffMinutes = (resetTime - now) / 1000 / 60
        
        // Should be between 14 and 16 minutes (accounting for test execution time)
        expect(diffMinutes).toBeGreaterThan(14)
        expect(diffMinutes).toBeLessThan(16)
      }
    })

    it('should limit to exactly 5 requests', async () => {
      const credentials = { email: 'test@example.com', password: 'Password123' }
      
      // Make exactly 5 requests
      for (let i = 0; i < 5; i++) {
        const res = await request(app)
          .post('/api/sessions')
          .send(credentials)
        expect(res.status).not.toBe(429)
      }
      
      // 6th should be blocked
      const res = await request(app)
        .post('/api/sessions')
        .send(credentials)
      expect(res.status).toBe(429)
    })
  })

  describe('Security Verification', () => {
    
    it('should prevent brute-force password attacks', async () => {
      const email = 'victim@example.com'
      const passwords = Array.from({ length: 10 }, (_, i) => `password${i}`)
      
      let rateLimitedCount = 0
      
      for (const password of passwords) {
        const res = await request(app)
          .post('/api/sessions')
          .send({ email, password })
        
        if (res.status === 429) {
          rateLimitedCount++
        }
      }
      
      // Should have rate limited at least 5 of the 10 attempts
      expect(rateLimitedCount).toBeGreaterThanOrEqual(5)
    })

    it('should prevent credential stuffing attacks', async () => {
      // Simulate credential stuffing with leaked credentials
      const credentials = Array.from({ length: 10 }, (_, i) => ({
        email: `leaked${i}@example.com`,
        password: 'CommonPassword123',
      }))
      
      let successCount = 0
      let rateLimitedCount = 0
      
      for (const cred of credentials) {
        const res = await request(app)
          .post('/api/sessions')
          .send(cred)
        
        if (res.status === 429) rateLimitedCount++
        else if (res.status === 200) successCount++
      }
      
      // Most attempts should be rate limited
      expect(rateLimitedCount).toBeGreaterThanOrEqual(5)
      // No successful logins (all are fake credentials)
      expect(successCount).toBe(0)
    })
  })
})

console.log('✅ Rate limiting tests defined for Task #9232')
