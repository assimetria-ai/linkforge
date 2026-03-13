// @custom — QR Code generation API for Linkforge
const express = require('express')
const router = express.Router()
const QRCode = require('qrcode')
const { authenticate } = require('../../../lib/@system/Helpers/auth')
const LinksRepo = require('../../../db/repos/@custom/LinksRepo')

/**
 * GET /api/links/:id/qr
 * Generate QR code for a link
 * Query params:
 *   format: 'png' (default) or 'svg'
 *   size: width in px (default 300, max 2000)
 *   fg: foreground color hex (default '000000')
 *   bg: background color hex (default 'ffffff')
 *   margin: quiet zone modules (default 2)
 */
router.get('/links/:id/qr', authenticate, async (req, res, next) => {
  try {
    const link = await LinksRepo.findById(req.params.id)
    if (!link) {
      return res.status(404).json({ message: 'Link not found' })
    }
    if (link.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const format = req.query.format === 'svg' ? 'svg' : 'png'
    const size = Math.min(Math.max(parseInt(req.query.size) || 300, 50), 2000)
    const fg = sanitizeColor(req.query.fg) || '#000000'
    const bg = sanitizeColor(req.query.bg) || '#ffffff'
    const margin = Math.min(Math.max(parseInt(req.query.margin) || 2, 0), 10)

    // Build the short URL for the QR code
    const baseUrl = req.query.base_url || `${req.protocol}://${req.get('host')}`
    const shortUrl = `${baseUrl}/${link.slug}`

    const qrOptions = {
      width: size,
      margin,
      color: {
        dark: fg,
        light: bg,
      },
      errorCorrectionLevel: 'H', // High — supports logo overlay
    }

    if (format === 'svg') {
      const svg = await QRCode.toString(shortUrl, { ...qrOptions, type: 'svg' })
      res.set('Content-Type', 'image/svg+xml')
      res.set('Content-Disposition', `inline; filename="qr-${link.slug}.svg"`)
      res.send(svg)
    } else {
      const buffer = await QRCode.toBuffer(shortUrl, {
        ...qrOptions,
        type: 'png',
      })
      res.set('Content-Type', 'image/png')
      res.set('Content-Disposition', `inline; filename="qr-${link.slug}.png"`)
      res.send(buffer)
    }
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/links/:id/qr/dataurl
 * Returns QR code as a JSON object with base64 data URL (for inline display)
 */
router.get('/links/:id/qr/dataurl', authenticate, async (req, res, next) => {
  try {
    const link = await LinksRepo.findById(req.params.id)
    if (!link) {
      return res.status(404).json({ message: 'Link not found' })
    }
    if (link.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const size = Math.min(Math.max(parseInt(req.query.size) || 300, 50), 2000)
    const fg = sanitizeColor(req.query.fg) || '#000000'
    const bg = sanitizeColor(req.query.bg) || '#ffffff'
    const margin = Math.min(Math.max(parseInt(req.query.margin) || 2, 0), 10)

    const baseUrl = req.query.base_url || `${req.protocol}://${req.get('host')}`
    const shortUrl = `${baseUrl}/${link.slug}`

    const dataUrl = await QRCode.toDataURL(shortUrl, {
      width: size,
      margin,
      color: {
        dark: fg,
        light: bg,
      },
      errorCorrectionLevel: 'H',
    })

    // Also generate SVG for dual-format download
    const svg = await QRCode.toString(shortUrl, {
      width: size,
      margin,
      type: 'svg',
      color: {
        dark: fg,
        light: bg,
      },
      errorCorrectionLevel: 'H',
    })

    res.json({
      dataUrl,
      svg,
      shortUrl,
      slug: link.slug,
    })
  } catch (err) {
    next(err)
  }
})

/**
 * Sanitize a color string — accepts hex with or without #
 */
function sanitizeColor(color) {
  if (!color) return null
  // Remove # if present
  const clean = color.replace(/^#/, '')
  // Validate hex color (3, 4, 6, or 8 chars)
  if (/^[0-9a-fA-F]{3,8}$/.test(clean)) {
    return `#${clean}`
  }
  return null
}

module.exports = router
