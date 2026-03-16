const request = require('supertest')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')

const mockUsersById = new Map()
const mockUsersByEmail = new Map()
const mockRefreshByRaw = new Map()
const mockRefreshById = new Map()
const mockSessionsByTokenHash = new Map()
const mockLockouts = new Map()

let mockRefreshIdSeq = 1
let mockFamilySeq = 1

function resetState() {
  mockUsersById.clear()
  mockUsersByEmail.clear()
  mockRefreshByRaw.clear()
  mockRefreshById.clear()
  mockSessionsByTokenHash.clear()
  mockLockouts.clear()
  mockRefreshIdSeq = 1
  mockFamilySeq = 1
}

function mockHashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function createUser({ id, email, name, password }) {
  const user = {
    id,
    email: email.toLowerCase(),
    name,
    role: 'user',
    password_hash: bcrypt.hashSync(password, 10),
    email_verified_at: null,
    onboarding_completed: true,
    totp_enabled: false,
    totp_secret: null,
  }
  mockUsersById.set(user.id, user)
  mockUsersByEmail.set(user.email, user)
  return user
}

jest.mock('../../../src/lib/@system/PostgreSQL', () => ({
  one: jest.fn(),
  oneOrNone: jest.fn(),
  any: jest.fn(),
  none: jest.fn(),
  result: jest.fn(),
  tx: jest.fn(async (fn) => fn()),
}))

jest.mock('../../../src/lib/@system/Email', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
  sendVerificationEmail: jest.fn().mockResolvedValue(true),
  sendWelcomeEmail: jest.fn().mockResolvedValue(true),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
}))

jest.mock('../../../src/lib/@system/Redis', () => {
  const store = new Map()
  return {
    client: {
      set: jest.fn(async (key, value, exKeyword, ttl) => {
        store.set(key, { value, ttl: exKeyword === 'EX' ? ttl : null })
      }),
      get: jest.fn(async (key) => {
        const row = store.get(key)
        return row ? row.value : null
      }),
      del: jest.fn(async (...keys) => {
        keys.forEach((k) => store.delete(k))
      }),
      exists: jest.fn(async (key) => (store.has(key) ? 1 : 0)),
      incr: jest.fn(async () => 1),
      expire: jest.fn(async () => 1),
      ttl: jest.fn(async () => -1),
      _store: store,
      _reset: () => store.clear(),
    },
    isReady: jest.fn(() => true),
  }
})

jest.mock('../../../src/db/repos/@system/UserRepo', () => ({
  findByEmail: jest.fn(async (email) => mockUsersByEmail.get(email.toLowerCase()) ?? null),
  findById: jest.fn(async (id) => mockUsersById.get(id) ?? null),
  create: jest.fn(async ({ email, name, password_hash, role = 'user' }) => {
    const id = String(mockUsersById.size + 1)
    const user = {
      id,
      email: email.toLowerCase(),
      name: name ?? null,
      role,
      password_hash,
      email_verified_at: null,
      onboarding_completed: true,
      totp_enabled: false,
      totp_secret: null,
    }
    mockUsersById.set(id, user)
    mockUsersByEmail.set(user.email, user)
    return user
  }),
  update: jest.fn(async (id, fields) => {
    const current = mockUsersById.get(id)
    if (!current) return null
    const updated = { ...current, ...fields }
    mockUsersById.set(id, updated)
    mockUsersByEmail.set(updated.email, updated)
    return { id: updated.id, email: updated.email, name: updated.name, role: updated.role }
  }),
}))

jest.mock('../../../src/db/repos/@system/RefreshTokenRepo', () => ({
  create: jest.fn(async ({ userId, familyId = null }) => {
    const token = `refresh-${mockRefreshIdSeq}-${require('crypto').randomBytes(6).toString('hex')}`
    const record = {
      id: mockRefreshIdSeq++,
      user_id: userId,
      family_id: familyId ?? mockFamilySeq++,
      token_hash: mockHashToken(token),
      expires_at: new Date(Date.now() + 60 * 60 * 1000),
      revoked_at: null,
      replaced_by: null,
    }
    mockRefreshByRaw.set(token, record)
    mockRefreshById.set(record.id, record)
    return { token, record }
  }),
  findByHash: jest.fn(async (token) => {
    const record = mockRefreshByRaw.get(token)
    return record ? { ...record } : null
  }),
  rotate: jest.fn(async (oldRecord) => {
    const token = `refresh-${mockRefreshIdSeq}-${require('crypto').randomBytes(6).toString('hex')}`
    const record = {
      id: mockRefreshIdSeq++,
      user_id: oldRecord.user_id,
      family_id: oldRecord.family_id,
      token_hash: mockHashToken(token),
      expires_at: new Date(Date.now() + 60 * 60 * 1000),
      revoked_at: null,
      replaced_by: null,
    }
    mockRefreshByRaw.set(token, record)
    mockRefreshById.set(record.id, record)

    const original = mockRefreshById.get(oldRecord.id)
    if (original) {
      original.revoked_at = new Date().toISOString()
      original.replaced_by = record.id
    }

    return { token, record }
  }),
  revokeById: jest.fn(async (id) => {
    const row = mockRefreshById.get(id)
    if (row) row.revoked_at = new Date().toISOString()
  }),
  revokeByTokenHashDirect: jest.fn(async (tokenHash) => {
    for (const row of mockRefreshById.values()) {
      if (row.token_hash === tokenHash && !row.revoked_at) {
        row.revoked_at = new Date().toISOString()
      }
    }
  }),
  revokeFamilyById: jest.fn(async (familyId) => {
    for (const row of mockRefreshById.values()) {
      if (row.family_id === familyId) row.revoked_at = new Date().toISOString()
    }
  }),
}))

jest.mock('../../../src/db/repos/@system/SessionRepo', () => ({
  create: jest.fn(async ({ userId, tokenHash, ipAddress, userAgent, expiresAt }) => {
    const row = {
      id: mockSessionsByTokenHash.size + 1,
      user_id: userId,
      token_hash: tokenHash,
      ip_address: ipAddress ?? null,
      user_agent: userAgent ?? null,
      expires_at: expiresAt,
      revoked_at: null,
      created_at: new Date().toISOString(),
    }
    mockSessionsByTokenHash.set(tokenHash, row)
    return row
  }),
  updateTokenHash: jest.fn(async (userId, oldHash, newHash, newExpiresAt) => {
    const existing = mockSessionsByTokenHash.get(oldHash)
    if (!existing || existing.user_id !== userId) return null
    mockSessionsByTokenHash.delete(oldHash)
    const updated = { ...existing, token_hash: newHash, expires_at: newExpiresAt }
    mockSessionsByTokenHash.set(newHash, updated)
    return { id: updated.id }
  }),
  revokeByTokenHash: jest.fn(async (tokenHash) => {
    const row = mockSessionsByTokenHash.get(tokenHash)
    if (row) row.revoked_at = new Date().toISOString()
  }),
  revoke: jest.fn(async () => null),
  findActiveByUserId: jest.fn(async () => []),
}))

jest.mock('../../../src/lib/@system/AccountLockout', () => ({
  MAX_ATTEMPTS: 5,
  getLockoutSecondsRemaining: jest.fn(async (email) => {
    const lock = mockLockouts.get(email)
    if (!lock) return 0
    return lock.locked ? 60 : 0
  }),
  incrementFailedAttempts: jest.fn(async (email) => {
    const lock = mockLockouts.get(email) ?? { count: 0, locked: false }
    lock.count += 1
    if (lock.count >= 5) lock.locked = true
    mockLockouts.set(email, lock)
  }),
  getFailedAttemptCount: jest.fn(async (email) => {
    const lock = mockLockouts.get(email)
    return lock ? lock.count : 0
  }),
  clearFailedAttempts: jest.fn(async (email) => {
    mockLockouts.delete(email)
  }),
}))

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
})
process.env.JWT_PRIVATE_KEY = privateKey.replace(/\n/g, '\\n')
process.env.JWT_PUBLIC_KEY = publicKey.replace(/\n/g, '\\n')

const app = require('../../../src/app')
const { client: redis } = require('../../../src/lib/@system/Redis')

function getCookie(setCookie, name) {
  return setCookie.find((c) => c.startsWith(`${name}=`))
}

beforeEach(() => {
  resetState()
  redis._reset()
  jest.clearAllMocks()
})

describe('POST /api/auth/register', () => {
  it('valid registration returns user + sets auth cookies', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'new.user@example.com',
        password: 'StrongPassword1!',
        name: 'New User',
      })

    expect(res.status).toBe(201)
    expect(res.body.user.email).toBe('new.user@example.com')
    expect(getCookie(res.headers['set-cookie'], 'access_token')).toBeTruthy()
    expect(getCookie(res.headers['set-cookie'], 'refresh_token')).toBeTruthy()
  })

  it('duplicate email returns 409', async () => {
    createUser({ id: '10', email: 'dup@example.com', name: 'Dup', password: 'StrongPassword1!' })

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'dup@example.com', password: 'StrongPassword1!', name: 'Again' })

    expect(res.status).toBe(409)
  })

  it('invalid email returns 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'StrongPassword1!', name: 'Test' })

    expect(res.status).toBe(400)
  })

  it('weak password returns 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'valid@example.com', password: 'weak', name: 'Test' })

    expect(res.status).toBe(400)
  })
})

describe('POST /api/sessions', () => {
  it('valid credentials return user + access/refresh cookies', async () => {
    createUser({ id: '1', email: 'login@example.com', name: 'Login', password: 'StrongPassword1!' })

    const res = await request(app)
      .post('/api/sessions')
      .send({ email: 'login@example.com', password: 'StrongPassword1!' })

    expect(res.status).toBe(200)
    expect(res.body.user.email).toBe('login@example.com')
    expect(getCookie(res.headers['set-cookie'], 'access_token')).toBeTruthy()
    expect(getCookie(res.headers['set-cookie'], 'refresh_token')).toBeTruthy()
  })

  it('wrong password returns 401', async () => {
    createUser({ id: '2', email: 'wrong@example.com', name: 'Wrong', password: 'StrongPassword1!' })

    const res = await request(app)
      .post('/api/sessions')
      .send({ email: 'wrong@example.com', password: 'BadPassword1!' })

    expect(res.status).toBe(401)
  })

  it('nonexistent user returns 401', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .send({ email: 'missing@example.com', password: 'StrongPassword1!' })

    expect(res.status).toBe(401)
  })

  it('repeated rapid failed logins lock account with 429', async () => {
    createUser({ id: '3', email: 'lock@example.com', name: 'Lock', password: 'StrongPassword1!' })

    for (let i = 0; i < 5; i += 1) {
      const attempt = await request(app)
        .post('/api/sessions')
        .send({ email: 'lock@example.com', password: 'WrongPassword1!' })
      expect(attempt.status).toBe(401)
    }

    const locked = await request(app)
      .post('/api/sessions')
      .send({ email: 'lock@example.com', password: 'WrongPassword1!' })

    expect(locked.status).toBe(429)
  })
})

describe('GET /api/sessions/me', () => {
  it('with valid cookie returns user object', async () => {
    createUser({ id: '4', email: 'me@example.com', name: 'Me', password: 'StrongPassword1!' })

    const login = await request(app)
      .post('/api/sessions')
      .send({ email: 'me@example.com', password: 'StrongPassword1!' })

    const accessCookie = getCookie(login.headers['set-cookie'], 'access_token')
    const res = await request(app)
      .get('/api/sessions/me')
      .set('Cookie', [accessCookie])

    expect(res.status).toBe(200)
    expect(res.body.user.email).toBe('me@example.com')
  })

  it('without cookie returns 401', async () => {
    const res = await request(app).get('/api/sessions/me')
    expect(res.status).toBe(401)
  })

  it('with expired token returns 401', async () => {
    createUser({ id: '5', email: 'expired@example.com', name: 'Expired', password: 'StrongPassword1!' })

    const expired = jwt.sign({ userId: '5' }, privateKey, {
      algorithm: 'RS256',
      expiresIn: -1,
    })

    const res = await request(app)
      .get('/api/sessions/me')
      .set('Cookie', [`access_token=${expired}`])

    expect(res.status).toBe(401)
  })

  it('JWT with tampered payload is rejected', async () => {
    createUser({ id: '6', email: 'tampered@example.com', name: 'Tampered', password: 'StrongPassword1!' })

    const valid = await request(app)
      .post('/api/sessions')
      .send({ email: 'tampered@example.com', password: 'StrongPassword1!' })

    const tokenCookie = getCookie(valid.headers['set-cookie'], 'access_token')
    const token = tokenCookie.split(';')[0].split('=')[1]
    const [header, payload, sig] = token.split('.')

    const tamperedPayload = Buffer.from(JSON.stringify({ userId: '9999' })).toString('base64url')
    const tampered = `${header}.${tamperedPayload}.${sig}`

    const res = await request(app)
      .get('/api/sessions/me')
      .set('Cookie', [`access_token=${tampered}`])

    expect(res.status).toBe(401)
  })
})

describe('POST /api/sessions/refresh', () => {
  it('with valid refresh token rotates both tokens', async () => {
    createUser({ id: '7', email: 'rotate@example.com', name: 'Rotate', password: 'StrongPassword1!' })

    const login = await request(app)
      .post('/api/sessions')
      .send({ email: 'rotate@example.com', password: 'StrongPassword1!' })

    const refreshCookie = getCookie(login.headers['set-cookie'], 'refresh_token')
    const oldRefreshToken = refreshCookie.split(';')[0].split('=')[1]

    const refreshed = await request(app)
      .post('/api/sessions/refresh')
      .set('Cookie', [refreshCookie])

    expect(refreshed.status).toBe(200)

    const newAccess = getCookie(refreshed.headers['set-cookie'], 'access_token')
    const newRefresh = getCookie(refreshed.headers['set-cookie'], 'refresh_token')
    const newRefreshToken = newRefresh.split(';')[0].split('=')[1]

    expect(newAccess).toBeTruthy()
    expect(newRefresh).toBeTruthy()
    expect(newRefreshToken).not.toBe(oldRefreshToken)
  })

  it('with invalid refresh token returns 401', async () => {
    const res = await request(app)
      .post('/api/sessions/refresh')
      .set('Cookie', ['refresh_token=invalid-token'])

    expect(res.status).toBe(401)
  })
})

describe('DELETE /api/sessions', () => {
  it('clears cookies and blacklists access token', async () => {
    createUser({ id: '8', email: 'logout@example.com', name: 'Logout', password: 'StrongPassword1!' })

    const login = await request(app)
      .post('/api/sessions')
      .send({ email: 'logout@example.com', password: 'StrongPassword1!' })

    const accessCookie = getCookie(login.headers['set-cookie'], 'access_token')
    const refreshCookie = getCookie(login.headers['set-cookie'], 'refresh_token')

    const logout = await request(app)
      .delete('/api/sessions')
      .set('Cookie', [accessCookie, refreshCookie])

    expect(logout.status).toBe(200)
    expect(logout.body.message).toMatch(/logged out/i)

    const clearedAccess = getCookie(logout.headers['set-cookie'], 'access_token')
    const clearedRefresh = getCookie(logout.headers['set-cookie'], 'refresh_token')
    expect(clearedAccess).toContain('access_token=;')
    expect(clearedRefresh).toContain('refresh_token=;')

    const blacklistedKey = `session:blacklist:${accessCookie.split(';')[0].split('=')[1]}`
    expect(await redis.exists(blacklistedKey)).toBe(1)
  })
})

describe('POST /api/auth/login (comprehensive)', () => {
  it('valid credentials return user + auth cookies', async () => {
    createUser({ id: '90', email: 'auth-login@example.com', name: 'Auth Login', password: 'StrongPassword1!' })

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'auth-login@example.com', password: 'StrongPassword1!' })

    expect(res.status).toBe(200)
    expect(res.body.user.email).toBe('auth-login@example.com')
    expect(getCookie(res.headers['set-cookie'], 'access_token')).toBeTruthy()
    expect(getCookie(res.headers['set-cookie'], 'refresh_token')).toBeTruthy()
  })

  it('oauth-only account returns 401 with helpful message', async () => {
    const user = createUser({ id: '91', email: 'social@example.com', name: 'Social User', password: 'StrongPassword1!' })
    user.password_hash = null

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'social@example.com', password: 'StrongPassword1!' })

    expect(res.status).toBe(401)
    expect(res.body.message).toMatch(/social login/i)
  })
})

describe('GET /api/auth/me (comprehensive)', () => {
  it('returns current user when access token is valid', async () => {
    createUser({ id: '92', email: 'auth-me@example.com', name: 'Auth Me', password: 'StrongPassword1!' })

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'auth-me@example.com', password: 'StrongPassword1!' })

    const accessCookie = getCookie(login.headers['set-cookie'], 'access_token')
    const me = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [accessCookie])

    expect(me.status).toBe(200)
    expect(me.body.user.email).toBe('auth-me@example.com')
  })
})

describe('POST /api/auth/forgot-password (comprehensive)', () => {
  it('without email returns 400', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({})

    expect(res.status).toBe(400)
  })

  it('always returns 200 for unknown email to avoid enumeration', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'missing-user@example.com' })

    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/if an account with that email exists/i)
  })
})

describe('POST /api/auth/reset-password (comprehensive)', () => {
  it('missing token or password returns 400', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: '', password: '' })

    expect(res.status).toBe(400)
  })

  it('stubbed endpoint returns 501 for now', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'stub-token', password: 'StrongPassword1!' })

    expect(res.status).toBe(501)
  })
})

describe('POST /api/sessions/refresh (comprehensive)', () => {
  it('without refresh cookie returns 401', async () => {
    const res = await request(app).post('/api/sessions/refresh')
    expect(res.status).toBe(401)
  })

  it('expired refresh token returns 401 and clears cookies', async () => {
    createUser({ id: '93', email: 'expired-refresh@example.com', name: 'Expired Refresh', password: 'StrongPassword1!' })

    const login = await request(app)
      .post('/api/sessions')
      .send({ email: 'expired-refresh@example.com', password: 'StrongPassword1!' })

    const refreshCookie = getCookie(login.headers['set-cookie'], 'refresh_token')
    const refreshToken = refreshCookie.split(';')[0].split('=')[1]
    const record = mockRefreshByRaw.get(refreshToken)
    record.expires_at = new Date(Date.now() - 1000)

    const refreshed = await request(app)
      .post('/api/sessions/refresh')
      .set('Cookie', [refreshCookie])

    expect(refreshed.status).toBe(401)
    expect(getCookie(refreshed.headers['set-cookie'], 'access_token')).toContain('access_token=;')
    expect(getCookie(refreshed.headers['set-cookie'], 'refresh_token')).toContain('refresh_token=;')
  })

  it('revoked refresh token triggers family revocation and denies reuse', async () => {
    createUser({ id: '94', email: 'reuse@example.com', name: 'Reuse', password: 'StrongPassword1!' })

    const login = await request(app)
      .post('/api/sessions')
      .send({ email: 'reuse@example.com', password: 'StrongPassword1!' })

    const refreshCookie = getCookie(login.headers['set-cookie'], 'refresh_token')
    const refreshToken = refreshCookie.split(';')[0].split('=')[1]
    const record = mockRefreshByRaw.get(refreshToken)
    record.revoked_at = new Date().toISOString()

    const refreshed = await request(app)
      .post('/api/sessions/refresh')
      .set('Cookie', [refreshCookie])

    expect(refreshed.status).toBe(401)
    expect(refreshed.body.message).toMatch(/reuse detected/i)
  })
})
