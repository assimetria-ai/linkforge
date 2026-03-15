/**
 * @system/testing — Mock Services
 *
 * Pre-built mocks for PostgreSQL, Redis, Email, and Stripe.
 * Use in Jest tests to avoid external service dependencies.
 *
 * Usage:
 *   const { mockPostgreSQL, mockRedis, mockEmail } = require('../../testing/@system/helpers/mock-services')
 *   jest.mock('../../../src/lib/@system/PostgreSQL', () => mockPostgreSQL())
 */

/**
 * Create a mock PostgreSQL instance.
 * @returns {object} mock db with common pg-promise methods
 */
function mockPostgreSQL() {
  const users = new Map()
  const store = new Map()

  const mockDb = {
    _users: users,
    _store: store,
    _reset() {
      users.clear()
      store.clear()
    },

    one: jest.fn(async () => null),
    oneOrNone: jest.fn(async () => null),
    none: jest.fn(async () => undefined),
    any: jest.fn(async () => []),
    many: jest.fn(async () => []),
    manyOrNone: jest.fn(async () => []),
    result: jest.fn(async () => ({ rowCount: 0, rows: [] })),
    tx: jest.fn(async (fn) => fn(mockDb)),
    task: jest.fn(async (fn) => fn(mockDb)),
    $pool: { end: jest.fn() },
  }

  return mockDb
}

/**
 * Create a mock Redis client.
 * @returns {object} mock Redis with get/set/del/incr
 */
function mockRedis() {
  const store = new Map()

  const client = {
    get: jest.fn(async (k) => store.get(k) ?? null),
    set: jest.fn(async (k, v, opts) => store.set(k, v)),
    del: jest.fn(async (k) => store.delete(k)),
    exists: jest.fn(async (k) => (store.has(k) ? 1 : 0)),
    incr: jest.fn(async (k) => {
      const n = parseInt(store.get(k) ?? '0', 10) + 1
      store.set(k, String(n))
      return n
    }),
    expire: jest.fn(async () => true),
    ttl: jest.fn(async () => -1),
    keys: jest.fn(async (pattern) => [...store.keys()]),
    flushAll: jest.fn(async () => store.clear()),
    _store: store,
    _reset: () => store.clear(),
  }

  return { client, isReady: () => false }
}

/**
 * Create a mock Email service.
 * @returns {object} mock email with send tracking
 */
function mockEmail() {
  const sent = []

  return {
    send: jest.fn(async (opts) => {
      sent.push(opts)
      return { messageId: `mock-${Date.now()}` }
    }),
    sendVerification: jest.fn(async (email, token) => {
      sent.push({ type: 'verification', email, token })
    }),
    sendPasswordReset: jest.fn(async (email, token) => {
      sent.push({ type: 'passwordReset', email, token })
    }),
    sendInvite: jest.fn(async (email, team, token) => {
      sent.push({ type: 'invite', email, team, token })
    }),
    _sent: sent,
    _reset: () => { sent.length = 0 },
  }
}

/**
 * Create a mock Stripe service.
 * @returns {object} mock Stripe with common methods
 */
function mockStripe() {
  const customers = new Map()
  const subscriptions = new Map()

  return {
    customers: {
      create: jest.fn(async (data) => {
        const id = `cus_mock_${Date.now()}`
        const customer = { id, ...data }
        customers.set(id, customer)
        return customer
      }),
      retrieve: jest.fn(async (id) => customers.get(id) || null),
    },
    subscriptions: {
      create: jest.fn(async (data) => {
        const id = `sub_mock_${Date.now()}`
        const sub = { id, status: 'active', ...data }
        subscriptions.set(id, sub)
        return sub
      }),
      retrieve: jest.fn(async (id) => subscriptions.get(id) || null),
      update: jest.fn(async (id, data) => {
        const sub = subscriptions.get(id)
        if (sub) Object.assign(sub, data)
        return sub
      }),
    },
    webhooks: {
      constructEvent: jest.fn((payload, sig, secret) => JSON.parse(payload)),
    },
    _customers: customers,
    _subscriptions: subscriptions,
    _reset: () => { customers.clear(); subscriptions.clear() },
  }
}

module.exports = {
  mockPostgreSQL,
  mockRedis,
  mockEmail,
  mockStripe,
}
