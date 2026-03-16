import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Header } from '../../../components/@system/Header/Header'
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/@system/Card/Card'
import { Button } from '../../../components/@system/ui/button'
import { api } from '../../../lib/@system/api'

export function DashboardPage() {
  const [brand, setBrand] = useState(null)
  const [data, setData] = useState(null)

  useEffect(() => {
    api.get('/brands').then((brands) => {
      const active = brands.find((item) => item.is_active) || brands[0] || null
      setBrand(active)
    }).catch(() => setBrand(null))

    api.get('/dashboard').then(setData).catch(() => setData(null))
  }, [])

  const stats = data?.stats || { users: 1, revenue: 0, plan: 'free', team_members: 1 }
  const activity = data?.activity || []

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-xl border bg-card p-6">
          <h1 className="text-2xl font-bold tracking-tight">Welcome to {brand?.name || 'your workspace'}!</h1>
          <p className="mt-1 text-sm text-muted-foreground">Everything is ready. Here is your current workspace overview.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Users</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-semibold">{stats.users}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Revenue</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-semibold">${stats.revenue}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Active plan</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-semibold capitalize">{stats.plan}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Team members</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-semibold">{stats.team_members}</p></CardContent>
          </Card>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Recent activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activity.length === 0 && <p className="text-sm text-muted-foreground">No recent activity yet.</p>}
              {activity.map((item) => (
                <div key={item.id} className="rounded-md border p-3">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{new Date(item.timestamp).toLocaleString()}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link to="/app/settings?tab=team"><Button className="w-full">Invite team</Button></Link>
              <Link to="/app/settings?tab=brand"><Button variant="outline" className="w-full">Customize settings</Button></Link>
              <a href="/docs/SAAS_FEATURES_SETUP.md" target="_blank" rel="noreferrer">
                <Button variant="outline" className="w-full">View docs</Button>
              </a>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
