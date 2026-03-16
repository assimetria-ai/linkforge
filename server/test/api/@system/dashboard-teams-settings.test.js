const request = require('supertest')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')

const mockUsers = new Map()
const mockTeams = new Map()
const mockMembers = []
let mockTeamSeq = 1

function resetState() {
  mockUsers.clear()
  mockTeams.clear()
  mockMembers.length = 0
  mockTeamSeq = 1
}

function createUser({ id, email, name }) {
  const user = {
    id,
    email,
    name,
    role: 'user',
    password_hash: 'hash',
    email_verified_at: null,
    onboarding_completed: true,
  }
  mockUsers.set(id, user)
  return user
}

jest.mock('../../../src/lib/@system/PostgreSQL', () => {
  const normalizeSql = (sql) => String(sql).replace(/\s+/g, ' ').trim().toLowerCase()

  const mockDb = {
    one: jest.fn(async (sql, params = []) => {
      const q = normalizeSql(sql)

      if (q.includes('insert into teams')) {
        const [name, slug, description, owner_id, settings] = params
        const row = {
          id: mockTeamSeq++,
          name,
          slug,
          description,
          owner_id,
          settings,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        mockTeams.set(row.id, row)
        return row
      }

      if (q.includes('insert into team_members')) {
        const [team_id, user_id, role, permissions] = params
        const row = {
          id: mockMembers.length + 1,
          team_id,
          user_id,
          role,
          permissions,
          joined_at: new Date().toISOString(),
        }
        mockMembers.push(row)
        return row
      }

      if (q.includes('insert into team_activity_log')) {
        const [team_id, user_id, action, details, ip_address, user_agent] = params
        return { id: 1, team_id, user_id, action, details, ip_address, user_agent }
      }

      if (q.includes('update users set') && q.includes('returning id, email, name, role')) {
        const [id, name] = params
        const user = mockUsers.get(id)
        if (!user) throw new Error('User not found')
        const updated = { ...user, name }
        mockUsers.set(id, updated)
        return { id: updated.id, email: updated.email, name: updated.name, role: updated.role }
      }

      if (q.includes('select count(*) as count from team_members where team_id = $1')) {
        const [teamId] = params
        const count = mockMembers.filter((m) => String(m.team_id) === String(teamId)).length
        return { count: String(count) }
      }

      throw new Error(`Unhandled db.one SQL in test: ${q}`)
    }),

    oneOrNone: jest.fn(async (sql, params = []) => {
      const q = normalizeSql(sql)

      if (q.includes('select * from users where id = $1')) {
        return mockUsers.get(params[0]) ?? null
      }

      if (q.includes('select * from users where email = $1')) {
        const email = String(params[0]).toLowerCase()
        return [...mockUsers.values()].find((u) => u.email.toLowerCase() === email) ?? null
      }

      if (q.includes('select * from teams where slug = $1')) {
        const slug = params[0]
        return [...mockTeams.values()].find((t) => t.slug === slug) ?? null
      }

      if (q.includes('select * from teams where id = $1')) {
        return mockTeams.get(Number(params[0])) ?? null
      }

      return null
    }),

    any: jest.fn(async (sql, params = []) => {
      const q = normalizeSql(sql)

      if (q.includes('from teams') && q.includes('where owner_id = $1')) {
        const ownerId = params[0]
        return [...mockTeams.values()].filter((t) => String(t.owner_id) === String(ownerId))
      }

      if (q.includes('from teams t') && q.includes('inner join team_members tm')) {
        const userId = params[0]
        const memberTeamIds = mockMembers
          .filter((m) => String(m.user_id) === String(userId))
          .map((m) => m.team_id)

        return [...mockTeams.values()]
          .filter((t) => memberTeamIds.includes(t.id))
          .map((t) => ({ ...t, role: 'member' }))
      }

      if (q.includes('select role, count(*) as count from team_members')) {
        const teamId = params[0]
        const counts = mockMembers
          .filter((m) => String(m.team_id) === String(teamId))
          .reduce((acc, m) => {
            acc[m.role] = (acc[m.role] ?? 0) + 1
            return acc
          }, {})

        return Object.entries(counts).map(([role, count]) => ({ role, count: String(count) }))
      }

      return []
    }),

    none: jest.fn(async () => undefined),
    result: jest.fn(async () => ({ rowCount: 0 })),
    tx: jest.fn(async (fn) => fn(mockDb)),
  }

  return mockDb
})

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

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
})
process.env.JWT_PRIVATE_KEY = privateKey.replace(/\n/g, '\\n')
process.env.JWT_PUBLIC_KEY = publicKey.replace(/\n/g, '\\n')

const app = require('../../../src/app')

function authCookie(userId) {
  const token = jwt.sign({ userId }, privateKey, { algorithm: 'RS256', expiresIn: '1h' })
  return `access_token=${token}`
}

beforeEach(() => {
  resetState()
  jest.clearAllMocks()
})

describe('Dashboard / Teams / Settings APIs', () => {
  it('GET /api/dashboard authenticated returns data', async () => {
    createUser({ id: '1', email: 'dash@example.com', name: 'Dash' })

    const res = await request(app)
      .get('/api/dashboard')
      .set('Cookie', [authCookie('1')])

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.data).toBeDefined()
  })

  it('GET /api/dashboard unauthenticated returns 401', async () => {
    const res = await request(app).get('/api/dashboard')
    expect(res.status).toBe(401)
  })

  it('GET /api/teams returns team list for authenticated user', async () => {
    createUser({ id: '2', email: 'team@example.com', name: 'Team User' })

    mockTeams.set(1, {
      id: 1,
      name: 'Core Team',
      slug: 'core-team',
      description: null,
      owner_id: '2',
      settings: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    const res = await request(app)
      .get('/api/teams')
      .set('Cookie', [authCookie('2')])

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.teams)).toBe(true)
    expect(res.body.teams).toHaveLength(1)
    expect(res.body.teams[0].name).toBe('Core Team')
  })

  it('POST /api/teams creates a team', async () => {
    createUser({ id: '3', email: 'owner@example.com', name: 'Owner' })

    const res = await request(app)
      .post('/api/teams')
      .set('Cookie', [authCookie('3')])
      .send({ name: 'Growth Team', description: 'Handles growth' })

    expect(res.status).toBe(201)
    expect(res.body.team.name).toBe('Growth Team')
    expect(res.body.team.slug).toBe('growth-team')
  })

  it('GET /api/users/me returns current user settings/profile', async () => {
    createUser({ id: '4', email: 'settings@example.com', name: 'Settings User' })

    const res = await request(app)
      .get('/api/users/me')
      .set('Cookie', [authCookie('4')])

    expect(res.status).toBe(200)
    expect(res.body.user.email).toBe('settings@example.com')
  })

  it('PATCH /api/users/me updates profile name', async () => {
    createUser({ id: '5', email: 'patch@example.com', name: 'Before' })

    const res = await request(app)
      .patch('/api/users/me')
      .set('Cookie', [authCookie('5')])
      .send({ name: 'After Update' })

    expect(res.status).toBe(200)
    expect(res.body.user.name).toBe('After Update')
  })
})
