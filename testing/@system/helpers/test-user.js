/**
 * @system/testing — Test User Constants & Factory
 */

const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@example.com',
  password: process.env.TEST_USER_PASSWORD || 'TestPassword1!',
  name: 'Test User',
}

const ADMIN_USER = {
  email: process.env.TEST_ADMIN_EMAIL || 'admin@example.com',
  password: process.env.TEST_ADMIN_PASSWORD || 'AdminPassword1!',
  name: 'Admin User',
  role: 'admin',
}

let userCounter = 0

/**
 * Generate a unique test user for isolation.
 * @param {object} [overrides] - fields to override
 * @returns {object} user with unique email
 */
function createTestUser(overrides = {}) {
  userCounter++
  const id = `${Date.now()}-${userCounter}`
  return {
    email: `test-${id}@example.com`,
    password: 'TestPassword1!',
    name: `Test User ${userCounter}`,
    ...overrides,
  }
}

/**
 * Reset the user counter (for test isolation).
 */
function resetUserCounter() {
  userCounter = 0
}

module.exports = {
  TEST_USER,
  ADMIN_USER,
  createTestUser,
  resetUserCounter,
}
