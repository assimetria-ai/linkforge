// @custom — accept workspace invitation page
// Handles JWT token validation and workspace join flow
import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { CheckCircle, XCircle, Loader2, Users } from 'lucide-react'
import { Button } from '../../../components/@system/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/@system/Card/Card'
import { useAuthContext } from '../../../store/@system/auth'
import { workspacesApi } from '../../../lib/@custom/workspaces'

export function AcceptInvitePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuthContext()

  const [status, setStatus] = useState('loading') // loading | accepting | success | error | auth-required
  const [error, setError] = useState('')
  const [workspace, setWorkspace] = useState(null)
  const [role, setRole] = useState('')

  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setError('No invitation token provided')
      return
    }

    if (!isAuthenticated) {
      setStatus('auth-required')
      return
    }

    acceptInvitation()
  }, [token, isAuthenticated])

  async function acceptInvitation() {
    setStatus('accepting')
    try {
      const result = await workspacesApi.acceptInvite(token)
      setWorkspace(result.workspace)
      setRole(result.role)
      setStatus('success')
    } catch (err) {
      setStatus('error')
      setError(err?.message || err?.data?.message || 'Failed to accept invitation')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Workspace Invitation</CardTitle>
          <CardDescription>
            {status === 'loading' && 'Processing your invitation...'}
            {status === 'accepting' && 'Joining workspace...'}
            {status === 'auth-required' && 'Sign in to accept this invitation'}
            {status === 'success' && 'You have joined the workspace'}
            {status === 'error' && 'Unable to process invitation'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {(status === 'loading' || status === 'accepting') && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {status === 'auth-required' && (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                You need to sign in or create an account to accept this invitation.
              </p>
              <div className="flex flex-col gap-2">
                <Button onClick={() => navigate(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)}>
                  Sign In
                </Button>
                <Button variant="outline" onClick={() => navigate(`/register?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)}>
                  Create Account
                </Button>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4 text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
              <div>
                <p className="font-medium">{workspace?.name}</p>
                <p className="text-sm text-muted-foreground capitalize">
                  Joined as {role}
                </p>
              </div>
              <Button onClick={() => navigate(`/app/teams/${workspace?.id}`)} className="w-full">
                Go to Workspace
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4 text-center">
              <XCircle className="mx-auto h-12 w-12 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
              <div className="flex flex-col gap-2">
                <Button variant="outline" onClick={() => navigate('/app/teams')}>
                  Go to Workspaces
                </Button>
                <Link to="/" className="text-sm text-muted-foreground underline hover:no-underline">
                  Back to Home
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
