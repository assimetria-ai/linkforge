// @custom — QR Code generation panel for links and bio pages
import { useState, useEffect, useCallback } from 'react'
import { QrCode, Download, Palette, RefreshCw, Image } from 'lucide-react'
import { Button } from '../@system/ui/button'
import { getLinkQrDataUrl } from '../../api/@custom/links'
import { getPageQrDataUrl } from '../../api/@custom/pages'

const COLOR_PRESETS = [
  { label: 'Classic', fg: '000000', bg: 'ffffff' },
  { label: 'Ocean', fg: '1e40af', bg: 'eff6ff' },
  { label: 'Forest', fg: '166534', bg: 'f0fdf4' },
  { label: 'Berry', fg: '9333ea', bg: 'faf5ff' },
  { label: 'Sunset', fg: 'ea580c', bg: 'fff7ed' },
  { label: 'Slate', fg: '334155', bg: 'f8fafc' },
]

/**
 * QrCodePanel — unified QR code generator for links and bio pages
 * Props:
 *   linkId + slug — for link QR codes (original usage)
 *   pageId + slug — for bio page QR codes
 *   logoUrl — optional center logo overlay (displayed client-side on the canvas)
 */
export function QrCodePanel({ linkId, pageId, slug, logoUrl: initialLogoUrl }) {
  const [qrData, setQrData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fgColor, setFgColor] = useState('000000')
  const [bgColor, setBgColor] = useState('ffffff')
  const [showCustomize, setShowCustomize] = useState(false)
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl || '')
  const [logoError, setLogoError] = useState(false)

  const isPage = Boolean(pageId)
  const entityId = pageId || linkId

  const generateQr = useCallback(async () => {
    if (!entityId) return
    setLoading(true)
    setError('')
    try {
      const fetcher = isPage ? getPageQrDataUrl : getLinkQrDataUrl
      const data = await fetcher(entityId, {
        size: 400,
        fg: fgColor,
        bg: bgColor,
      })
      setQrData(data)
    } catch (err) {
      setError('Failed to generate QR code')
    } finally {
      setLoading(false)
    }
  }, [entityId, isPage, fgColor, bgColor])

  useEffect(() => {
    generateQr()
  }, [generateQr])

  // Composite QR + logo on canvas for PNG download
  const compositeWithLogo = (qrDataUrl, callback) => {
    if (!logoUrl || logoError) {
      callback(qrDataUrl)
      return
    }
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const qrImg = new window.Image()
    qrImg.crossOrigin = 'anonymous'
    qrImg.onload = () => {
      canvas.width = qrImg.width
      canvas.height = qrImg.height
      ctx.drawImage(qrImg, 0, 0)
      // Draw logo in center (20% of QR size)
      const logo = new window.Image()
      logo.crossOrigin = 'anonymous'
      logo.onload = () => {
        const logoSize = Math.round(qrImg.width * 0.2)
        const x = Math.round((qrImg.width - logoSize) / 2)
        const y = Math.round((qrImg.height - logoSize) / 2)
        // White background behind logo
        ctx.fillStyle = `#${bgColor}`
        const pad = 4
        ctx.fillRect(x - pad, y - pad, logoSize + pad * 2, logoSize + pad * 2)
        ctx.drawImage(logo, x, y, logoSize, logoSize)
        callback(canvas.toDataURL('image/png'))
      }
      logo.onerror = () => callback(qrDataUrl) // fallback without logo
      logo.src = logoUrl
    }
    qrImg.src = qrDataUrl
  }

  const handleDownloadPng = () => {
    if (!qrData?.dataUrl) return
    const prefix = isPage ? 'qr-page' : 'qr'
    compositeWithLogo(qrData.dataUrl, (finalUrl) => {
      const a = document.createElement('a')
      a.href = finalUrl
      a.download = `${prefix}-${slug}.png`
      a.click()
    })
  }

  const handleDownloadSvg = () => {
    if (!qrData?.svg) return
    const prefix = isPage ? 'qr-page' : 'qr'
    // For SVG with logo, inject a centered image element
    let svgContent = qrData.svg
    if (logoUrl && !logoError) {
      // Parse SVG to inject logo image
      const parser = new DOMParser()
      const doc = parser.parseFromString(svgContent, 'image/svg+xml')
      const svgEl = doc.querySelector('svg')
      if (svgEl) {
        const vb = svgEl.getAttribute('viewBox')?.split(' ').map(Number) || [0, 0, 400, 400]
        const w = vb[2]
        const h = vb[3]
        const logoSize = Math.round(w * 0.2)
        const x = Math.round((w - logoSize) / 2)
        const y = Math.round((h - logoSize) / 2)
        // Background rect behind logo
        const rect = doc.createElementNS('http://www.w3.org/2000/svg', 'rect')
        rect.setAttribute('x', x - 2)
        rect.setAttribute('y', y - 2)
        rect.setAttribute('width', logoSize + 4)
        rect.setAttribute('height', logoSize + 4)
        rect.setAttribute('fill', `#${bgColor}`)
        svgEl.appendChild(rect)
        const img = doc.createElementNS('http://www.w3.org/2000/svg', 'image')
        img.setAttribute('href', logoUrl)
        img.setAttribute('x', x)
        img.setAttribute('y', y)
        img.setAttribute('width', logoSize)
        img.setAttribute('height', logoSize)
        svgEl.appendChild(img)
        svgContent = new XMLSerializer().serializeToString(doc)
      }
    }
    const blob = new Blob([svgContent], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${prefix}-${slug}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  const applyPreset = (preset) => {
    setFgColor(preset.fg)
    setBgColor(preset.bg)
  }

  return (
    <div className="border rounded-lg p-4 bg-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <QrCode size={16} className="text-primary" />
          QR Code
        </h3>
        <button
          onClick={() => setShowCustomize(!showCustomize)}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <Palette size={14} />
          {showCustomize ? 'Hide' : 'Customize'}
        </button>
      </div>

      {/* Customization Panel */}
      {showCustomize && (
        <div className="mb-4 space-y-3 p-3 rounded-md bg-muted/30 border">
          {/* Color Presets */}
          <div>
            <label className="block text-xs font-medium mb-2">Presets</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(preset)}
                  className={`px-2 py-1 text-xs rounded border transition-colors hover:border-primary ${
                    fgColor === preset.fg && bgColor === preset.bg
                      ? 'border-primary bg-primary/10'
                      : 'border-border'
                  }`}
                >
                  <span
                    className="inline-block w-3 h-3 rounded-full mr-1 border"
                    style={{ backgroundColor: `#${preset.fg}` }}
                  />
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Logo Overlay */}
          <div>
            <label className="block text-xs font-medium mb-1 flex items-center gap-1">
              <Image size={12} />
              Center Logo (optional)
            </label>
            <input
              type="text"
              value={logoUrl}
              onChange={(e) => { setLogoUrl(e.target.value); setLogoError(false) }}
              placeholder="https://example.com/logo.png"
              className="w-full px-2 py-1 border rounded text-xs bg-background"
            />
            {logoUrl && !logoError && (
              <div className="mt-1 flex items-center gap-2">
                <img
                  src={logoUrl}
                  alt="Logo preview"
                  className="w-6 h-6 rounded object-contain border"
                  onError={() => setLogoError(true)}
                />
                <span className="text-xs text-muted-foreground">Logo will appear in center</span>
              </div>
            )}
            {logoError && (
              <p className="text-xs text-red-500 mt-1">Failed to load logo image</p>
            )}
          </div>

          {/* Custom Colors */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Foreground</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={`#${fgColor}`}
                  onChange={(e) => setFgColor(e.target.value.replace('#', ''))}
                  className="w-8 h-8 rounded cursor-pointer border"
                />
                <input
                  type="text"
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value.replace('#', ''))}
                  className="flex-1 px-2 py-1 border rounded text-xs bg-background font-mono"
                  maxLength={6}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Background</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={`#${bgColor}`}
                  onChange={(e) => setBgColor(e.target.value.replace('#', ''))}
                  className="w-8 h-8 rounded cursor-pointer border"
                />
                <input
                  type="text"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value.replace('#', ''))}
                  className="flex-1 px-2 py-1 border rounded text-xs bg-background font-mono"
                  maxLength={6}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Display */}
      <div className="flex justify-center mb-4">
        {loading ? (
          <div className="w-48 h-48 flex items-center justify-center bg-muted/30 rounded-lg animate-pulse">
            <RefreshCw size={24} className="text-muted-foreground animate-spin" />
          </div>
        ) : error ? (
          <div className="w-48 h-48 flex items-center justify-center bg-muted/30 rounded-lg">
            <p className="text-xs text-red-500">{error}</p>
          </div>
        ) : qrData?.dataUrl ? (
          <div className="relative w-48 h-48">
            <img
              src={qrData.dataUrl}
              alt={`QR code for ${slug}`}
              className="w-48 h-48 rounded-lg"
            />
            {logoUrl && !logoError && (
              <img
                src={logoUrl}
                alt="Logo"
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded object-contain border-2"
                style={{ backgroundColor: `#${bgColor}`, borderColor: `#${bgColor}` }}
                onError={() => setLogoError(true)}
              />
            )}
          </div>
        ) : null}
      </div>

      {/* URL display */}
      {qrData?.pageUrl && (
        <p className="text-xs text-center text-muted-foreground mb-3 truncate px-2">
          {qrData.pageUrl}
        </p>
      )}
      {qrData?.shortUrl && !qrData?.pageUrl && (
        <p className="text-xs text-center text-muted-foreground mb-3 truncate px-2">
          {qrData.shortUrl}
        </p>
      )}

      {/* Download Buttons */}
      <div className="flex gap-2 justify-center">
        <Button
          size="sm"
          variant="outline"
          onClick={handleDownloadPng}
          disabled={!qrData?.dataUrl || loading}
          className="gap-1.5 text-xs"
        >
          <Download size={14} />
          PNG
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleDownloadSvg}
          disabled={!qrData?.svg || loading}
          className="gap-1.5 text-xs"
        >
          <Download size={14} />
          SVG
        </Button>
      </div>
    </div>
  )
}
