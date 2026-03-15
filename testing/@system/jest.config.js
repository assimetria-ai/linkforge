/**
 * @system/testing — Shared Jest Configuration
 *
 * Import in your product's jest.config.js:
 *   const base = require('./testing/@system/jest.config')
 *   module.exports = { ...base, /* overrides * / }
 */

module.exports = {
  // Unit tests
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/server/test/unit/**/*.test.{js,ts}'],
      testEnvironment: 'node',
      setupFilesAfterSetup: [],
      transform: {},
      moduleNameMapper: {
        '^@system/(.*)$': '<rootDir>/server/src/lib/@system/$1',
        '^@custom/(.*)$': '<rootDir>/server/src/lib/@custom/$1',
      },
    },
    {
      displayName: 'api',
      testMatch: ['<rootDir>/server/test/api/**/*.test.{js,ts}'],
      testEnvironment: 'node',
      setupFilesAfterSetup: [],
      transform: {},
      moduleNameMapper: {
        '^@system/(.*)$': '<rootDir>/server/src/lib/@system/$1',
        '^@custom/(.*)$': '<rootDir>/server/src/lib/@custom/$1',
      },
    },
  ],

  // Coverage
  collectCoverageFrom: [
    'server/src/**/*.{js,ts}',
    '!server/src/**/*.d.ts',
    '!server/src/index.js',
    '!**/node_modules/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov', 'json-summary'],
  coverageThresholds: {
    global: {
      branches: 60,
      functions: 60,
      lines: 70,
      statements: 70,
    },
  },

  // Timeouts
  testTimeout: 15_000,

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
}
