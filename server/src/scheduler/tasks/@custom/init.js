'use strict'

// @custom — init
// Register your custom tasks with the scheduler here.
// Called from server/src/index.js on server start.
//
// Usage:
//   const { MyTask } = require('.')
//   scheduler.registerTask(new MyTask())

const { TestTask } = require('.')

/**
 * @param {import('../@system/scheduler')} scheduler
 */
function init(scheduler) {
  // Example task — comment out or replace with real tasks
  scheduler.registerTask(new TestTask())
}

module.exports = init
