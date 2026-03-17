const express = require('express')
const router = express.Router()

// @custom — register product-specific routers here
// Each route is wrapped in try/catch to prevent broken @custom modules from crashing the server
const customRoutes = [
  '../../api/@custom/audit-logs',
  '../../api/@custom/errors',
  '../../api/@custom/collaborators',
  '../../api/@custom/brands',
  '../../api/@custom/chatbase',
  '../../api/@custom/email-logs',
  '../../api/@custom/blog',
  '../../api/@custom/pages',
  '../../api/@custom/pricing',
]

for (const route of customRoutes) {
  try {
    router.use(require(route))
  } catch (err) {
    console.warn(`[routes] Skipping @custom route ${route}: ${err.message}`)
  }
}

module.exports = router
