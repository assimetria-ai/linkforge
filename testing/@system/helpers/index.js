/**
 * @system/testing — Main Entry Point
 *
 * Re-exports all helpers for convenient importing:
 *   const { createApiClient, loginUser, seedTestData } = require('./testing/@system/helpers')
 */

module.exports = {
  ...require('./auth'),
  ...require('./api-client'),
  ...require('./db-seed'),
  ...require('./screenshots'),
  ...require('./test-user'),
  ...require('./mock-services'),
}
