/**
 * Client-side browser fingerprint collector
 * Privacy-friendly: no cookies, no localStorage, no tracking pixels.
 * Generates a one-way hash from browser signals for unique visitor identification.
 *
 * Usage: import { collectFingerprint, sendFingerprint } from './fingerprint'
 */

/**
 * Generate a canvas fingerprint hash.
 * Different browsers/GPUs render text slightly differently,
 * producing a unique-ish hash per device.
 */
export function getCanvasHash() {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 200
    canvas.height = 50
    const ctx = canvas.getContext('2d')

    ctx.textBaseline = 'top'
    ctx.font = '14px Arial'
    ctx.fillStyle = '#f60'
    ctx.fillRect(0, 0, 100, 50)
    ctx.fillStyle = '#069'
    ctx.fillText('Lf~fp!@#', 2, 2)
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)'
    ctx.fillText('Lf~fp!@#', 4, 4)

    const dataUrl = canvas.toDataURL()
    let hash = 0
    for (let i = 0; i < dataUrl.length; i++) {
      hash = ((hash << 5) - hash) + dataUrl.charCodeAt(i)
      hash |= 0 // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16)
  } catch {
    return null
  }
}

/**
 * Collect all available browser fingerprint signals
 */
export function collectFingerprint() {
  return {
    screen_resolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    color_depth: screen.colorDepth || 0,
    platform: navigator.platform || '',
    canvas_hash: getCanvasHash(),
    user_agent: navigator.userAgent,
  }
}

/**
 * Send fingerprint data to the beacon endpoint
 * @param {number} clickEventId - The click event ID to update
 * @param {object} fingerprint - Fingerprint signals from collectFingerprint()
 */
export function sendFingerprint(clickEventId, fingerprint) {
  const payload = JSON.stringify({
    id: clickEventId,
    sr: fingerprint.screen_resolution,
    tz: fingerprint.timezone,
    cd: fingerprint.color_depth,
    p: fingerprint.platform,
    ch: fingerprint.canvas_hash,
  })

  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/fp', payload)
  } else {
    fetch('/api/fp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {})
  }
}
