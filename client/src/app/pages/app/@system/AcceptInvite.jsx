import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Users, CheckCircle, XCircle } from 'lucide-react'

function authHeaders() {
  const token = localStorage.getItem('app_jwt')
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

export default function AcceptInvite() {
  const { token } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [accepted, setAccepted] = useState(false)
  const [teamName, setTeamName] = useState(null)

  async function handleAccept() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/invites/${token}/accept`, {
        method: 'POST',
        headers: authHeaders(),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || 'Failed to accept invite')
      setTeamName(data.team?.name)
      setAccepted(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (accepted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="rounded-full bg-emerald-500/10 p-4 mb-4">
          <CheckCircle className="h-8 w-8 text-emerald-500" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold text-foreground mb-2">You're in!</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {teamName ? `You've joined "${teamName}".` : 'Invite accepted successfully.'}
        </p>
        <button
          onClick={() => navigate('/teams')}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Go to Teams
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="rounded-full bg-primary/10 p-4 mb-4">
        <Users className="h-8 w-8 text-primary" aria-hidden="true" />
      </div>
      <h1 className="text-xl font-semibold text-foreground mb-2">Team invite</h1>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs">
        You've been invited to join a team. Accept the invite to get started.
      </p>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 mb-4 max-w-sm w-full text-left">
          <XCircle className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <button
        onClick={handleAccept}
        disabled={loading}
        className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Accepting...' : 'Accept invite'}
      </button>
    </div>
  )
}
