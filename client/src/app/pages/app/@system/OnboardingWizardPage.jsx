import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../../../components/@system/Header/Header'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/@system/Card/Card'
import { Input } from '../../../components/@system/ui/input'
import { Label } from '../../../components/@system/ui/label'
import { Button } from '../../../components/@system/ui/button'
import { Switch } from '../../../components/@system/ui/switch'
import { api } from '../../../lib/@system/api'

const TOTAL_STEPS = 4

export function OnboardingWizardPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [inviteInput, setInviteInput] = useState('')
  const [data, setData] = useState({
    role: 'founder',
    company_size: '1-10',
    theme: 'light',
    notifications: true,
    invites: [],
  })

  const completion = useMemo(() => Math.round((step / TOTAL_STEPS) * 100), [step])

  function addInvite() {
    const email = inviteInput.trim().toLowerCase()
    if (!email || data.invites.includes(email)) return
    setData((prev) => ({ ...prev, invites: [...prev.invites, email] }))
    setInviteInput('')
  }

  async function finishOnboarding() {
    setLoading(true)
    setError('')

    try {
      await Promise.all(
        data.invites.map((email) => api.post('/teams/invite', { email, role: 'member' }))
      )

      await api.patch('/users/me', {
        onboarding_completed: true,
        onboarding_data: {
          role: data.role,
          company_size: data.company_size,
          theme: data.theme,
          notifications: data.notifications,
          invites: data.invites,
        },
      })

      navigate('/app')
    } catch (err) {
      setError(err.message || 'Failed to finish onboarding')
    } finally {
      setLoading(false)
    }
  }

  function next() {
    setStep((prev) => Math.min(prev + 1, TOTAL_STEPS))
  }

  function back() {
    setStep((prev) => Math.max(prev - 1, 1))
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Setup wizard</CardTitle>
            <CardDescription>Step {step} of {TOTAL_STEPS} • {completion}% complete</CardDescription>
            <div className="h-2 rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${completion}%` }} />
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>What best describes your role?</Label>
                  <select
                    value={data.role}
                    onChange={(e) => setData((prev) => ({ ...prev, role: e.target.value }))}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="founder">Founder</option>
                    <option value="developer">Developer</option>
                    <option value="marketer">Marketer</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Company size</Label>
                  <select
                    value={data.company_size}
                    onChange={(e) => setData((prev) => ({ ...prev, company_size: e.target.value }))}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="1-10">1-10</option>
                    <option value="11-50">11-50</option>
                    <option value="51-200">51-200</option>
                    <option value="200+">200+</option>
                  </select>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Theme preference</Label>
                  <select
                    value={data.theme}
                    onChange={(e) => setData((prev) => ({ ...prev, theme: e.target.value }))}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="font-medium">Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive onboarding and product tips.</p>
                  </div>
                  <Switch
                    checked={data.notifications}
                    onCheckedChange={(checked) => setData((prev) => ({ ...prev, notifications: checked }))}
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <Label>Invite your team</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="teammate@company.com"
                    value={inviteInput}
                    onChange={(e) => setInviteInput(e.target.value)}
                  />
                  <Button type="button" variant="outline" onClick={addInvite}>Add</Button>
                </div>
                <div className="space-y-2">
                  {data.invites.length === 0 && <p className="text-sm text-muted-foreground">No invites added yet.</p>}
                  {data.invites.map((email) => (
                    <div key={email} className="rounded-md border px-3 py-2 text-sm">{email}</div>
                  ))}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">You're all set!</h3>
                <p className="text-sm text-muted-foreground">Your workspace is configured and ready to use.</p>
                <ul className="space-y-2 text-sm">
                  <li>Role: {data.role}</li>
                  <li>Company size: {data.company_size}</li>
                  <li>Theme: {data.theme}</li>
                  <li>Invites: {data.invites.length}</li>
                </ul>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex items-center justify-between">
              <Button type="button" variant="outline" onClick={back} disabled={step === 1 || loading}>Back</Button>
              {step < TOTAL_STEPS ? (
                <Button type="button" onClick={next}>Continue</Button>
              ) : (
                <Button type="button" onClick={finishOnboarding} disabled={loading}>
                  {loading ? 'Finishing...' : 'Go to Dashboard'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
