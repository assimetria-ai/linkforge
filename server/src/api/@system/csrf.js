const express = require('express')
const router = express.Router()

/**
 * GET /csrf-token
 * 
 * Returns a CSRF token that must be included in subsequent state-changing requests.
 * The token must be sent in the X-CSRF-Token header for POST/PUT/PATCH/DELETE requests.
 * 
 * @route GET /api/csrf-token
 * @returns {object} 200 - CSRF token
 */
router.get('/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() })
})

module.exports = router
