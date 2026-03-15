// @system — logs API
// GET /api/logs — return recent structured log entries from the in-memory ring buffer
//
// Query params:
//   limit  {number}  — max entries to return (1–500, default 100)
//   level  {string}  — filter by level name: trace|debug|info|warn|error|fatal

const express = require('express')
const router = express.Router()
const { authenticate } = require('../../lib/@system/Helpers/auth')
const { ringBuffer } = require('../../lib/@system/Logger')

// Pino numeric levels → human-readable names
const LEVEL_NAMES = { 10: 'trace', 20: 'debug', 30: 'info', 40: 'warn', 50: 'error', 60: 'fatal' }
const LEVEL_NUMS  = { trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60 }

// GET /api/logs
router.get('/logs', authenticate, (req, res) => {
  const limit     = Math.min(Math.max(1, parseInt(req.query.limit ?? '100', 10)), 500)
  const levelName = req.query.level?.toLowerCase()
  const levelNum  = levelName ? LEVEL_NUMS[levelName] : undefined

  // Retrieve the full buffer, filter, annotate, reverse to newest-first.
  let entries = ringBuffer.getRecent(500)

  if (levelNum != null) {
    entries = entries.filter(e => e.level === levelNum)
  }

  entries = entries
    .map(e => ({ ...e, levelLabel: LEVEL_NAMES[e.level] ?? String(e.level) }))
    .reverse()
    .slice(0, limit)

  res.json({ entries, total: ringBuffer.size })
})

// GET /api/logs/export
// Returns all buffered log entries as a downloadable JSON file.
// Query params:
//   level  {string}  — optional filter: trace|debug|info|warn|error|fatal
router.get('/logs/export', authenticate, (req, res) => {
  const levelName = req.query.level?.toLowerCase()
  const levelNum  = levelName ? LEVEL_NUMS[levelName] : undefined

  let entries = ringBuffer.getRecent(500)

  if (levelNum != null) {
    entries = entries.filter(e => e.level === levelNum)
  }

  entries = entries.map(e => ({ ...e, levelLabel: LEVEL_NAMES[e.level] ?? String(e.level) }))

  // Filename includes a UTC timestamp so repeated exports are distinguishable.
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  res.setHeader('Content-Disposition', `attachment; filename="logs-${ts}.json"`)
  res.setHeader('Content-Type', 'application/json')
  res.json({ exportedAt: new Date().toISOString(), total: ringBuffer.size, entries })
})

module.exports = router
