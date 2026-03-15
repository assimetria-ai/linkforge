import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/app/components/@system/ui/button'

export default function EmailVerify() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [status, setStatus] = useState('verifying') // 'verifying' | 'success' | 'error'
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Invalid verification link. No token found.')
      return
    }

    fetch('/api/users/email/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ok) {
          setStatus('success')
        } else {
          setStatus('error')
          setMessage(data.message || 'Verification failed. The link may have expired.')
        }
      })
      .catch(() => {
        setStatus('error')
        setMessage('Something went wrong. Please try again.')
      })
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  if (status === 'verifying') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">Verifying your email...</p>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500 mb-4" />
          <h1 className="text-2xl font-semibold text-foreground mb-2">Email verified</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Your email has been verified. You can now sign in to your account.
          </p>
          <Button asChild className="w-full">
            <Link to="/login">Sign in</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm text-center">
        <XCircle className="mx-auto h-10 w-10 text-destructive mb-4" />
        <h1 className="text-2xl font-semibold text-foreground mb-2">Verification failed</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {message}
        </p>
        <Button asChild className="w-full">
          <Link to="/login">Sign in to resend verification</Link>
        </Button>
      </div>
    </div>
  )
}
