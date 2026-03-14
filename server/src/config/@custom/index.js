// @custom — product-specific server config override
// Merge/override values from @system/info.js here.
// This file is NEVER overwritten during template sync.

const systemInfo = require('../@system/info')

const customInfo = {
  name: 'Linkforge',
  url: process.env.APP_URL || 'https://linkforge.io',
}

module.exports = { ...systemInfo, ...customInfo }
