const express = require('express')
const router = express.Router()

const { authenticate } = require('../../../lib/@system/Helpers/auth')

// GET /api/dashboard — lightweight dashboard payload used by UI/test smoke checks
router.get('/dashboard', authenticate, async (req, res) => {
  res.json({
    ok: true,
    data: {
      welcome: `Welcome back, ${req.user.name ?? req.user.email}`,
      stats: {
        activeProjects: 0,
        notifications: 0,
      },
    },
  })
})

module.exports = router
