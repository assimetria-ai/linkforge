import { useState, useEffect, useRef } from 'react'
import { Upload, Trash2, File, FileText, Image, AlertCircle, X, RefreshCw, Download } from 'lucide-react'
import { cn } from '@/app/lib/@system/utils'
import { getCsrfToken } from '@/app/lib/@system/csrf'

const FOLDERS = ['documents', 'images', 'avatars']
const ACCEPT = 'image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,text/csv'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const UPLOAD_TIMEOUT_MS = 60_000 // 60 seconds

function getToken() {
  return localStorage.getItem('app_jwt')
}

function formatBytes(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function FileTypeIcon({ type }) {
  if (type?.startsWith('image/')) return <Image className="h-4 w-4" aria-hidden="true" />
  if (type === 'application/pdf' || type?.startsWith('text/')) return <FileText className="h-4 w-4" aria-hidden="true" />
  return <File className="h-4 w-4" aria-hidden="true" />
}

function UploadProgress({ progress }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Uploading…</span>
        <span className="font-mono text-foreground">{progress}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-150"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  )
}

export default function Files() {
  const [folder, setFolder] = useState('documents')
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef(null)

  async function loadFiles(f) {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch(`/api/storage/files?folder=${encodeURIComponent(f)}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (!res.ok) throw new Error('Failed to load files.')
      const data = await res.json()
      setFiles(data.files || [])
    } catch (e) {
      setFetchError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadFiles(folder) }, [folder]) // eslint-disable-line react-hooks/exhaustive-deps

  function uploadFile(file) {
    if (file.size > MAX_FILE_SIZE) {
      setUploadError(`File is too large. Maximum size is 10 MB.`)
      return
    }

    setUploading(true)
    setUploadProgress(0)
    setUploadError(null)

    const form = new FormData()
    form.append('file', file)
    form.append('folder', folder)

    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        setUploadProgress(Math.round((e.loaded / e.total) * 100))
      }
    })

    xhr.addEventListener('load', () => {
      setUploading(false)
      setUploadProgress(0)
      if (xhr.status >= 200 && xhr.status < 300) {
        loadFiles(folder)
      } else {
        try {
          const data = JSON.parse(xhr.responseText)
          setUploadError(data.error || data.message || 'Upload failed.')
        } catch {
          setUploadError('Upload failed.')
        }
      }
    })

    xhr.addEventListener('error', () => {
      setUploading(false)
      setUploadProgress(0)
      setUploadError('Network error during upload. Please check your connection and try again.')
    })

    xhr.addEventListener('timeout', () => {
      setUploading(false)
      setUploadProgress(0)
      setUploadError('Upload timed out. Please try again.')
    })

    xhr.addEventListener('abort', () => {
      setUploading(false)
      setUploadProgress(0)
    })

    xhr.timeout = UPLOAD_TIMEOUT_MS
    xhr.open('POST', '/api/storage/upload')
    xhr.setRequestHeader('Authorization', `Bearer ${getToken()}`)
    xhr.send(form)
  }

  function handleInput(e) {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
    e.target.value = ''
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) uploadFile(file)
  }

  async function deleteFile(key) {
    try {
      const res = await fetch(`/api/storage/${encodeURIComponent(key)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (!res.ok) throw new Error('Delete failed.')
      setFiles(prev => prev.filter(f => f.key !== key))
    } catch (e) {
      setFetchError(e.message)
    }
  }

  const [downloadError, setDownloadError] = useState(null)

  async function downloadFile(key, name) {
    setDownloadError(null)
    try {
      const res = await fetch(`/api/storage/download?key=${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (!res.ok) throw new Error('Download failed.')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = name || key.split('/').pop()
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      setDownloadError(e.message)
    }
  }

  const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0)

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Files</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Upload and manage files in your workspace.</p>
      </div>

      {/* Folder tabs */}
      <div className="flex flex-wrap gap-2">
        {FOLDERS.map(f => (
          <button
            key={f}
            onClick={() => setFolder(f)}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-colors',
              folder === f
                ? 'border-primary bg-primary/5 text-foreground'
                : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragEnter={e => { e.preventDefault(); setDragActive(true) }}
        onDragLeave={e => { e.preventDefault(); setDragActive(false) }}
        onDragOver={e => e.preventDefault()}
        onClick={() => !uploading && inputRef.current?.click()}
        onKeyDown={e => e.key === 'Enter' && !uploading && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload file"
        className={cn(
          'flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-6 sm:p-8 text-center cursor-pointer transition-colors',
          dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-accent/30',
          uploading && 'pointer-events-none opacity-60'
        )}
      >
        <Upload
          className={cn('h-7 w-7', dragActive ? 'text-primary' : 'text-muted-foreground')}
          aria-hidden="true"
        />
        <div>
          <p className="text-sm font-medium text-foreground">
            {uploading ? 'Uploading…' : 'Drop a file here or click to browse'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Images, PDF, TXT, CSV — up to 10 MB</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={handleInput}
        />
      </div>

      {uploading && <UploadProgress progress={uploadProgress} />}

      {uploadError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
          <p className="flex-1 text-sm text-destructive">{uploadError}</p>
          <button
            onClick={() => setUploadError(null)}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {downloadError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
          <p className="flex-1 text-sm text-destructive">{downloadError}</p>
          <button
            onClick={() => setDownloadError(null)}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* File list */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold text-foreground capitalize">{folder}</h2>
            {files.length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {files.length} {files.length === 1 ? 'file' : 'files'} · {formatBytes(totalSize)}
              </p>
            )}
          </div>
          <button
            onClick={() => loadFiles(folder)}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
          >
            <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} aria-hidden="true" />
            Refresh
          </button>
        </div>

        {fetchError ? (
          <p className="px-5 py-8 text-center text-sm text-destructive">{fetchError}</p>
        ) : loading && files.length === 0 ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-3 mb-3">
              <File className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-foreground">No files yet</p>
            <p className="text-xs text-muted-foreground mt-1">Upload a file above to get started.</p>
          </div>
        ) : (
          <ul role="list" className="divide-y divide-border">
            {files.map(f => (
              <li
                key={f.key}
                className="flex items-center gap-3 px-4 sm:px-5 py-3.5 hover:bg-accent/30 transition-colors"
              >
                <div className="rounded-lg bg-accent p-2 shrink-0 text-accent-foreground">
                  <FileTypeIcon type={f.mimeType} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {f.name || f.key?.split('/').pop()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[
                      formatBytes(f.size),
                      f.uploadedAt && new Date(f.uploadedAt).toLocaleDateString(),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => downloadFile(f.key, f.name || f.key?.split('/').pop())}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    aria-label={`Download ${f.name || f.key}`}
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => deleteFile(f.key)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    aria-label={`Delete ${f.name || f.key}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
