// @system — structured logger (pino) + in-memory ring buffer
//
// Usage:
//   const logger = require('../lib/@system/Logger')
//   logger.info('something happened')
//   logger.error({ err }, 'request failed')
//
// Access recent log entries (for /api/logs):
//   const { ringBuffer } = require('../lib/@system/Logger')
//   ringBuffer.getRecent(100)

const pino    = require('pino')
const { Writable } = require('stream')
const ringBuffer   = require('./ring-buffer')

const isDev = process.env.NODE_ENV !== 'production'

// ─── Ring-buffer capture stream ───────────────────────────────────────────────
// Every JSON log line written by pino flows through this Writable so it is also
// stored in the in-memory ring buffer and exposed by GET /api/logs.
const bufferStream = new Writable({
  write(chunk, _enc, done) {
    try {
      const line = chunk.toString().trim()
      if (line) ringBuffer.push(JSON.parse(line))
    } catch {
      // Ignore malformed lines (e.g. partial writes or non-JSON noise).
    }
    done()
  },
})

// ─── Base pino options ────────────────────────────────────────────────────────
const baseOptions = {
  level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
  base: {
    service: process.env.SERVICE_NAME ?? 'server',
    env:     process.env.NODE_ENV ?? 'development',
  },
}

// ─── Logger factory ───────────────────────────────────────────────────────────
// In development, pino-pretty is used as a Node.js Transform stream (not the
// worker-thread transport) so we can compose it with bufferStream via
// pino.multistream — both pretty output AND ring-buffer capture are active.
//
// In production, JSON goes to stdout and the ring buffer simultaneously.
let logger

if (isDev) {
  // pino-pretty as a stream: require('pino-pretty')({ ... }) returns a Transform.
  const pretty = require('pino-pretty')
  const prettyStream = pretty({
    colorize:      true,
    translateTime: 'SYS:HH:MM:ss',
    ignore:        'pid,hostname',
  })

  logger = pino(baseOptions, pino.multistream([
    { stream: prettyStream },
    { stream: bufferStream },
  ]))
} else {
  logger = pino(baseOptions, pino.multistream([
    { stream: process.stdout },
    { stream: bufferStream },
  ]))
}

module.exports          = logger
module.exports.ringBuffer = ringBuffer
