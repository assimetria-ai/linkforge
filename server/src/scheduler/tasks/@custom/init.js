'use strict'

// @custom — init
// Register your custom tasks with the scheduler here.
// Called automatically from src/index.js during server startup.
//
// Usage:
//   const { MyTask } = require('.')
//   scheduler.registerTask(new MyTask())

const { TestTask } = require('.')
const DomainHealthCheckTask = require('./DomainHealthCheckTask')

/**
 * @param {import('../@system/scheduler')} scheduler
 */
function init(scheduler) {
  // Example task — comment out or replace with real tasks
  scheduler.registerTask(new TestTask())
  // Domain health check — runs every 30 minutes for verified custom domains
  scheduler.registerTask(new DomainHealthCheckTask())
}

module.exports = init
