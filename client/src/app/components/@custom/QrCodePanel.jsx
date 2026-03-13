// @custom — QR Code generation panel for link detail view
import { useState, useEffect, useCallback } from 'react'
import { QrCode, Download, Palette, RefreshCw } from 'lucide-react'
import { Button } from '../@system/ui/button'
import { getLinkQrDataUrl } from '../../api/@custom/links'

const COLOR_PRESETS = [
  { label: 'Classic', fg: '000000', bg: 'ffffff' },
  { label: 'Ocean', fg: '1e40af', bg: 'eff6ff' },
  { label: 'Forest', fg: '166534', bg: 'f0fdf4' },
  { label: 'Berry', fg: '9333ea', bg: 'faf5ff' },
  { label: 'Sunset', fg: 'ea580c', bg: 'fff7ed' },
  { label: 'Slate', fg: '334155', bg: 'f8fafc' },
]

export function QrCodePanel({ linkId, slug }) {
  const [qrData, setQrData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fgColor, setFgColor] = useState('000000')
  const [bgColor, setBgColor] = useState('ffffff')
  const [showCustomize, setShowCustomize] = useState(false)

  const generateQr = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getLinkQrDataUrl(linkId, {
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
  }, [linkId, fgColor, bgColor])

  useEffect(() => {
    generateQr()
  }, [generateQr])

  const handleDownloadPng = () => {
    if (!qrData?.dataUrl) return
    const a = document.createElement('a')
    a.href = qrData.dataUrl
    a.download = `qr-${slug}.png`
    a.click()
  }

  const handleDownloadSvg = () => {
    if (!qrData?.svg) return
    const blob = new Blob([qrData.svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `qr-${slug}.svg`
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
          <img
            src={qrData.dataUrl}
            alt={`QR code for ${slug}`}
            className="w-48 h-48 rounded-lg"
          />
        ) : null}
      </div>

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
