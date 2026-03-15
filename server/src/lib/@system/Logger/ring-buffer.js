// @system — in-memory ring buffer for recent structured log entries
// Captures the last N log entries so the /api/logs endpoint can serve them.
//
// Usage:
//   const ringBuffer = require('./ring-buffer')
//   ringBuffer.getRecent(100)   // last 100 entries, chronological
//   ringBuffer.size              // number of entries currently stored

const MAX_LOG_ENTRIES = parseInt(process.env.LOG_BUFFER_SIZE ?? '500', 10)

class RingBuffer {
  constructor(max = MAX_LOG_ENTRIES) {
    this._max = max
    this._buf = []
    this._head = 0
  }

  /** Append a new log entry. Overwrites the oldest entry when full. */
  push(entry) {
    if (this._buf.length < this._max) {
      this._buf.push(entry)
    } else {
      this._buf[this._head] = entry
      this._head = (this._head + 1) % this._max
    }
  }

  /**
   * Return the `limit` most-recent entries in chronological (oldest→newest) order.
   * @param {number} [limit=100]
   */
  getRecent(limit = 100) {
    const n = this._buf.length
    if (n === 0) return []

    if (n < this._max) {
      // Buffer is not yet full — entries are already in insertion order.
      return this._buf.slice(Math.max(0, n - limit))
    }

    // Buffer is full — reconstruct chronological order from the ring.
    const ordered = new Array(this._max)
    for (let i = 0; i < this._max; i++) {
      ordered[i] = this._buf[(this._head + i) % this._max]
    }
    return ordered.slice(-limit)
  }

  /** Total number of entries currently stored (up to max). */
  get size() {
    return this._buf.length
  }

  clear() {
    this._buf = []
    this._head = 0
  }
}

module.exports = new RingBuffer()
