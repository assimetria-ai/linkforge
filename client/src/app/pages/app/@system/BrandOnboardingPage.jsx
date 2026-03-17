import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../../../components/@system/Header/Header'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/@system/Card/Card'
import { Label } from '../../../components/@system/ui/label'
import { Input } from '../../../components/@system/ui/input'
import { Button } from '../../../components/@system/ui/button'
import { api } from '../../../lib/@system/api'

export function BrandOnboardingPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    description: '',
    color: '#2563eb',
    logo: null,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (form.logo) {
        const data = new FormData()
        data.append('name', form.name)
        data.append('description', form.description)
        data.append('color', form.color)
        data.append('logo', form.logo)

        const res = await fetch('/api/brands', {
          method: 'POST',
          body: data,
          credentials: 'include',
        })

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}))
          throw new Error(payload.message || 'Failed to create brand')
        }
      } else {
        await api.post('/brands', {
          name: form.name,
          description: form.description,
          color: form.color,
        })
      }

      navigate('/app/onboarding/plan')
    } catch (err) {
      setError(err.message || 'Failed to create brand')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Create your brand</CardTitle>
            <CardDescription>Set up your workspace identity before selecting a plan.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="brand-name">Brand name</Label>
                <Input
                  id="brand-name"
                  required
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Acme Labs"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="brand-description">Description</Label>
                <textarea
                  id="brand-description"
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="What are you building?"
                  className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="brand-color">Primary color</Label>
                  <Input
                    id="brand-color"
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm((prev) => ({ ...prev, color: e.target.value }))}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand-logo">Logo (optional)</Label>
                  <Input
                    id="brand-logo"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setForm((prev) => ({ ...prev, logo: e.target.files?.[0] || null }))}
                  />
                </div>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" disabled={loading || !form.name.trim()} className="w-full sm:w-auto">
                {loading ? 'Creating brand...' : 'Continue to plan selection'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
