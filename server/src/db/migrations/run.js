'use strict'
// Wrapper: delegates to @system/run.js (which has the resilient migration runner)
module.exports = require('./@system/run.js')

// If called directly (node run.js), execute
if (require.main === module) {
  require('./@system/run.js')
}
