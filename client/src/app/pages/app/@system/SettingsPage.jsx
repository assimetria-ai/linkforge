import { useEffect, useMemo, useState } from 'react'
import { Header } from '../../../components/@system/Header/Header'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/@system/Card/Card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../components/@system/Tabs/Tabs'
import { Input } from '../../../components/@system/ui/input'
import { Label } from '../../../components/@system/ui/label'
import { Switch } from '../../../components/@system/ui/switch'
import { Button } from '../../../components/@system/ui/button'
import { api } from '../../../lib/@system/api'
import { useAuthContext } from '../../../store/@system/auth'

export function SettingsPage() {
  const { user, updateUser } = useAuthContext()
  const [tab, setTab] = useState('profile')
  const [notice, setNotice] = useState('')
  const [members, setMembers] = useState([])
  const [brands, setBrands] = useState([])
  const [subscription, setSubscription] = useState(null)
  const [invite, setInvite] = useState({ email: '', role: 'member' })

  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    avatar: null,
  })

  const [security, setSecurity] = useState({
    currentPassword: '',
    newPassword: '',
    twoFactor: false,
  })

  const activeBrand = useMemo(() => brands.find((item) => item.is_active) || brands[0] || null, [brands])
  const [brandForm, setBrandForm] = useState({ name: '', description: '', primary_color: '#2563eb', logo_url: '' })

  useEffect(() => {
    setProfile({
      name: user?.name || '',
      email: user?.email || '',
      avatar: null,
    })
  }, [user])

  useEffect(() => {
    Promise.all([
      api.get('/teams/members').catch(() => []),
      api.get('/brands').catch(() => []),
      api.get('/subscriptions').catch(() => null),
    ]).then(([membersData, brandsData, subscriptionData]) => {
      setMembers(membersData)
      setBrands(brandsData)
      setSubscription(subscriptionData)
    })
  }, [])

  useEffect(() => {
    if (!activeBrand) return
    setBrandForm({
      name: activeBrand.name || '',
      description: activeBrand.description || '',
      primary_color: activeBrand.primary_color || '#2563eb',
      logo_url: activeBrand.logo_url || '',
    })
  }, [activeBrand])

  async function saveProfile() {
    try {
      await updateUser({ name: profile.name, email: profile.email })
      setNotice('Profile updated.')
    } catch (err) {
      setNotice(err.message || 'Failed to update profile.')
    }
  }

  async function updatePassword() {
    try {
      await api.post('/users/me/password', {
        currentPassword: security.currentPassword,
        newPassword: security.newPassword,
      })
      setSecurity((prev) => ({ ...prev, currentPassword: '', newPassword: '' }))
      setNotice('Password changed.')
    } catch (err) {
      setNotice(err.message || 'Failed to change password.')
    }
  }

  async function sendInvite() {
    try {
      const created = await api.post('/teams/invite', invite)
      setMembers((prev) => [...prev, created])
      setInvite({ email: '', role: 'member' })
      setNotice('Invite sent.')
    } catch (err) {
      setNotice(err.message || 'Failed to invite member.')
    }
  }

  async function saveBrand() {
    if (!activeBrand) return
    try {
      const updated = await api.patch(`/brands/${activeBrand.id}`, brandForm)
      setBrands((prev) => prev.map((item) => item.id === updated.id ? { ...item, ...updated } : item))
      setNotice('Brand updated.')
    } catch (err) {
      setNotice(err.message || 'Failed to update brand.')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage account, billing, team, and brand configuration.</p>
        </div>

        {notice && (
          <div className="mb-4 rounded-md border bg-muted/30 px-3 py-2 text-sm">{notice}</div>
        )}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="brand">Brand</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>Update your personal information and avatar.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={profile.name} onChange={(e) => setProfile((prev) => ({ ...prev, name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={profile.email} onChange={(e) => setProfile((prev) => ({ ...prev, email: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Avatar upload</Label>
                  <Input type="file" accept="image/*" onChange={(e) => setProfile((prev) => ({ ...prev, avatar: e.target.files?.[0] || null }))} />
                </div>
                <Button onClick={saveProfile}>Save profile</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security</CardTitle>
                <CardDescription>Manage password and authentication settings.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Current password</Label>
                  <Input type="password" value={security.currentPassword} onChange={(e) => setSecurity((prev) => ({ ...prev, currentPassword: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>New password</Label>
                  <Input type="password" value={security.newPassword} onChange={(e) => setSecurity((prev) => ({ ...prev, newPassword: e.target.value }))} />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="font-medium">Two-factor authentication</p>
                    <p className="text-sm text-muted-foreground">Mock toggle for 2FA state.</p>
                  </div>
                  <Switch checked={security.twoFactor} onCheckedChange={(checked) => setSecurity((prev) => ({ ...prev, twoFactor: checked }))} />
                </div>
                <Button onClick={updatePassword}>Change password</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing">
            <Card>
              <CardHeader>
                <CardTitle>Billing</CardTitle>
                <CardDescription>View current plan and usage details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-md border p-3">
                  <p className="text-sm text-muted-foreground">Current plan</p>
                  <p className="text-xl font-semibold capitalize">{subscription?.plan || 'free'}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-sm text-muted-foreground">Usage</p>
                  <p className="font-medium">1 user • 0 active automations • 0 API overages</p>
                </div>
                <Button variant="outline">Manage subscription</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team">
            <Card>
              <CardHeader>
                <CardTitle>Team</CardTitle>
                <CardDescription>Invite and manage your team members.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 sm:grid-cols-[1fr_140px_auto]">
                  <Input
                    placeholder="member@company.com"
                    value={invite.email}
                    onChange={(e) => setInvite((prev) => ({ ...prev, email: e.target.value }))}
                  />
                  <select
                    value={invite.role}
                    onChange={(e) => setInvite((prev) => ({ ...prev, role: e.target.value }))}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="admin">admin</option>
                    <option value="member">member</option>
                    <option value="viewer">viewer</option>
                  </select>
                  <Button onClick={sendInvite}>Invite</Button>
                </div>

                <div className="space-y-2">
                  {members.length === 0 && <p className="text-sm text-muted-foreground">No team members yet.</p>}
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                      <div>
                        <p className="font-medium">{member.name || member.email}</p>
                        <p className="text-xs text-muted-foreground">{member.role || 'member'} • {member.status || 'active'}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setMembers((prev) => prev.filter((item) => item.id !== member.id))}>
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="brand">
            <Card>
              <CardHeader>
                <CardTitle>Brand</CardTitle>
                <CardDescription>Edit your brand identity and visuals.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Brand name</Label>
                  <Input value={brandForm.name} onChange={(e) => setBrandForm((prev) => ({ ...prev, name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <textarea
                    value={brandForm.description}
                    onChange={(e) => setBrandForm((prev) => ({ ...prev, description: e.target.value }))}
                    className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Primary color</Label>
                    <Input type="color" value={brandForm.primary_color} onChange={(e) => setBrandForm((prev) => ({ ...prev, primary_color: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Logo URL</Label>
                    <Input value={brandForm.logo_url} onChange={(e) => setBrandForm((prev) => ({ ...prev, logo_url: e.target.value }))} />
                  </div>
                </div>
                <Button onClick={saveBrand} disabled={!activeBrand}>Save brand</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
