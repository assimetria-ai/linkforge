/**
 * @system/testing — Shared Playwright Configuration
 *
 * Import this in your product's playwright.config.js:
 *   const base = require('./testing/@system/playwright.config')
 *   module.exports = { ...base, /* overrides * / }
 */

const { defineConfig, devices } = require('@playwright/test')

module.exports = defineConfig({
  testDir: '../../e2e',
  testMatch: '**/*.spec.{js,ts}',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['json', { outputFile: 'test-results/results.json' }]]
    : [['html', { open: 'on-failure' }]],
  outputDir: 'test-results',

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
    },
  ],

  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm run dev',
        url: process.env.BASE_URL || 'http://localhost:5173',
        reuseExistingServer: true,
        timeout: 30_000,
      },
})
