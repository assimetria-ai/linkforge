import { useState, useEffect } from 'react'
import { Mail, CheckCircle, AlertCircle, Send, RefreshCw } from 'lucide-react'
import { cn } from '@/app/lib/@system/utils'
import { getCsrfToken } from '@/app/lib/@system/csrf'

function getToken() {
  return localStorage.getItem('app_jwt')
}

function ProviderBadge({ provider }) {
  const isConfigured = provider && provider !== 'console'
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium',
        isConfigured
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
      )}
    >
      <span
        className={cn('h-1.5 w-1.5 rounded-full', isConfigured ? 'bg-emerald-500' : 'bg-amber-500')}
        aria-hidden="true"
      />
      {isConfigured ? `${provider} — active` : 'Console fallback'}
    </div>
  )
}

const CONFIG_GUIDES = [
  {
    provider: 'Resend (recommended)',
    vars: 'RESEND_API_KEY, EMAIL_FROM',
  },
  {
    provider: 'SMTP (SendGrid, Mailgun, Postmark…)',
    vars: 'SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM',
  },
  {
    provider: 'Amazon SES',
    vars: 'AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, SES_FROM_EMAIL',
  },
]

export default function Email() {
  const [status, setStatus] = useState(null)
  const [statusLoading, setStatusLoading] = useState(false)
  const [statusError, setStatusError] = useState(null)
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState(null)

  async function loadStatus() {
    setStatusLoading(true)
    setStatusError(null)
    try {
      const res = await fetch('/api/email/status', {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (!res.ok) throw new Error('Failed to load email status.')
      const data = await res.json()
      setStatus(data)
    } catch (e) {
      setStatusError(e.message)
    } finally {
      setStatusLoading(false)
    }
  }

  async function sendTestEmail() {
    setSending(true)
    setSendResult(null)
    try {
      const csrfToken = await getCsrfToken()
      const res = await fetch('/api/email/test', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getToken()}`,
          'X-CSRF-Token': csrfToken,
        },
      })
      const data = await res.json()
      setSendResult({
        ok: res.ok,
        message: data.message || (res.ok ? 'Test email sent successfully.' : 'Failed to send test email.'),
      })
    } catch (e) {
      setSendResult({ ok: false, message: e.message })
    } finally {
      setSending(false)
    }
  }

  useEffect(() => { loadStatus() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const isConfigured = status?.provider && status.provider !== 'console'

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Email</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Manage email delivery configuration and verify sending works.
        </p>
      </div>

      {/* Provider status */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-accent p-2">
              <Mail className="h-4 w-4 text-accent-foreground" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Email provider</p>
              <p className="text-xs text-muted-foreground mt-0.5">Current delivery configuration</p>
            </div>
          </div>
          <button
            onClick={loadStatus}
            disabled={statusLoading}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
          >
            <RefreshCw className={cn('h-3 w-3', statusLoading && 'animate-spin')} aria-hidden="true" />
            Refresh
          </button>
        </div>

        {statusError ? (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
            <p className="text-sm text-destructive">{statusError}</p>
          </div>
        ) : statusLoading ? (
          <div className="h-7 w-40 rounded-full bg-muted animate-pulse" />
        ) : status ? (
          <div className="space-y-3">
            <ProviderBadge provider={status.provider} />
            {(status.from || (status.provider && status.provider !== 'console')) && (
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm max-w-sm">
                {status.from && (
                  <>
                    <dt className="text-muted-foreground">From</dt>
                    <dd className="text-foreground font-mono text-xs">{status.from}</dd>
                  </>
                )}
                {status.provider && status.provider !== 'console' && (
                  <>
                    <dt className="text-muted-foreground">Provider</dt>
                    <dd className="text-foreground capitalize">{status.provider}</dd>
                  </>
                )}
              </dl>
            )}
            {!isConfigured && (
              <p className="text-xs text-muted-foreground">
                No email provider configured — emails are printed to the console.
                Set <code className="font-mono bg-muted px-1 py-0.5 rounded">EMAIL_PROVIDER</code> in your{' '}
                <code className="font-mono bg-muted px-1 py-0.5 rounded">.env</code> file.
              </p>
            )}
          </div>
        ) : null}
      </div>

      {/* Test email */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Send test email</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Sends a test email to your account address to verify delivery is working.
          </p>
        </div>

        {sendResult && (
          <div
            className={cn(
              'flex items-center gap-2 rounded-lg border px-4 py-3',
              sendResult.ok
                ? 'border-emerald-500/30 bg-emerald-500/5'
                : 'border-destructive/30 bg-destructive/5'
            )}
          >
            {sendResult.ok ? (
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
            )}
            <p
              className={cn(
                'text-sm',
                sendResult.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-destructive'
              )}
            >
              {sendResult.message}
            </p>
          </div>
        )}

        <button
          onClick={sendTestEmail}
          disabled={sending}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          {sending ? 'Sending...' : 'Send test email'}
        </button>
      </div>

      {/* Setup guide */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <p className="text-sm font-semibold text-foreground">Configuration guide</p>
        <div className="space-y-3">
          {CONFIG_GUIDES.map(({ provider, vars }) => (
            <div key={provider} className="rounded-lg border border-border bg-muted/30 p-4 space-y-1.5">
              <p className="text-xs font-medium text-foreground">{provider}</p>
              <p className="text-xs text-muted-foreground font-mono break-all">{vars}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Set these variables in your{' '}
          <code className="font-mono bg-muted px-1 py-0.5 rounded">.env</code> file and restart the server.
          The provider is detected automatically from your environment.
        </p>
      </div>
    </div>
  )
}
