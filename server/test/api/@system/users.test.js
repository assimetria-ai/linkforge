const request = require('supertest')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')

const mockUsersById = new Map()
const mockUsersByEmail = new Map()

function resetState() {
  mockUsersById.clear()
  mockUsersByEmail.clear()
}

function createUser({ id, email, name = null, password = 'StrongPassword1!' }) {
  const user = {
    id,
    email: email.toLowerCase(),
    name,
    role: 'user',
    password_hash: bcrypt.hashSync(password, 10),
    email_verified_at: null,
    onboarding_completed: true,
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

jest.mock('../../../src/lib/@system/Redis', () => ({
  client: {
    get: jest.fn(async () => null),
    set: jest.fn(async () => true),
    del: jest.fn(async () => true),
    exists: jest.fn(async () => 0),
    incr: jest.fn(async () => 1),
    expire: jest.fn(async () => 1),
    ttl: jest.fn(async () => -1),
  },
  isReady: jest.fn(() => false),
}))

jest.mock('../../../src/lib/@system/Email', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
  sendVerificationEmail: jest.fn().mockResolvedValue(true),
  sendWelcomeEmail: jest.fn().mockResolvedValue(true),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
}))

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
    }
    mockUsersById.set(id, user)
    mockUsersByEmail.set(user.email, user)
    return user
  }),
  update: jest.fn(async (id, fields) => {
    const current = mockUsersById.get(id)
    if (!current) return null
    const next = { ...current, ...fields }
    mockUsersById.set(id, next)
    mockUsersByEmail.set(next.email, next)
    return { id: next.id, email: next.email, name: next.name, role: next.role }
  }),
  verifyEmail: jest.fn(async (id) => mockUsersById.get(id) ?? null),
}))

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
})
process.env.JWT_PRIVATE_KEY = privateKey.replace(/\n/g, '\\n')
process.env.JWT_PUBLIC_KEY = publicKey.replace(/\n/g, '\\n')

const app = require('../../../src/app')

afterEach(() => {
  resetState()
  jest.clearAllMocks()
})

describe('POST /api/users registration validation/security', () => {
  it('returns 201 for valid registration', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({
        email: 'valid@example.com',
        password: 'StrongPassword1!',
        name: 'Valid User',
      })

    expect(res.status).toBe(201)
    expect(res.body.user.email).toBe('valid@example.com')
    expect(res.body.user.name).toBe('Valid User')
  })

  it('returns 409 for duplicate email', async () => {
    createUser({ id: '1', email: 'taken@example.com', name: 'Taken' })

    const res = await request(app)
      .post('/api/users')
      .send({
        email: 'taken@example.com',
        password: 'StrongPassword1!',
        name: 'Duplicate',
      })

    expect(res.status).toBe(409)
  })

  it('returns 400 for invalid email', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({
        email: 'not-an-email',
        password: 'StrongPassword1!',
        name: 'Bad Email',
      })

    expect(res.status).toBe(400)
  })

  it('returns 400 for weak password', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({
        email: 'weak@example.com',
        password: 'short',
        name: 'Weak',
      })

    expect(res.status).toBe(400)
  })

  it('SQL injection payload in email returns 400 (not 500)', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({
        email: "test@example.com' OR 1=1 --",
        password: 'StrongPassword1!',
        name: 'SQL Test',
      })

    expect(res.status).toBe(400)
  })

  it('XSS payload in name is sanitized', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({
        email: 'xss@example.com',
        password: 'StrongPassword1!',
        name: '<script>alert(1)</script><b>Alice</b>',
      })

    expect(res.status).toBe(201)
    expect(res.body.user.name).toBe('Alice')
    expect(res.body.user.name).not.toContain('<script>')
    expect(res.body.user.name).not.toContain('<b>')
  })
})

describe('password reset request input validation', () => {
  it('returns 400 without email', async () => {
    const res = await request(app)
      .post('/api/users/password/request')
      .send({})

    expect(res.status).toBe(400)
  })

  it('returns 400 for malformed email', async () => {
    const res = await request(app)
      .post('/api/users/password/request')
      .send({ email: 'bad' })

    expect(res.status).toBe(400)
  })

  it('returns 200 for valid email regardless of existence', async () => {
    const res = await request(app)
      .post('/api/users/password/request')
      .send({ email: 'unknown@example.com' })

    expect(res.status).toBe(200)
  })
})
