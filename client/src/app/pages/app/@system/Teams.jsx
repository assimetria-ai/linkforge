import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import * as Dialog from '@radix-ui/react-dialog'
import * as Tabs from '@radix-ui/react-tabs'
import {
  Users,
  Plus,
  Trash2,
  UserMinus,
  Mail,
  Crown,
  Shield,
  User,
  X,
  ChevronRight,
  ArrowLeft,
  MoreHorizontal,
  Clock,
} from 'lucide-react'
import { useAuth } from '@/app/store/@system/auth'
import { cn } from '@/app/lib/@system/utils'

// ── Helpers ───────────────────────────────────────────────────────────────────

function authHeaders() {
  const token = localStorage.getItem('app_jwt')
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

async function apiFetch(url, options = {}) {
  const res = await fetch(url, { headers: authHeaders(), ...options })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || 'Request failed')
  return data
}

const ROLE_LABELS = { owner: 'Owner', admin: 'Admin', member: 'Member' }

const ROLE_ICONS = {
  owner: Crown,
  admin: Shield,
  member: User,
}

function RoleBadge({ role }) {
  const Icon = ROLE_ICONS[role] || User
  const colors = {
    owner: 'text-amber-600 dark:text-amber-400 bg-amber-500/10',
    admin: 'text-blue-600 dark:text-blue-400 bg-blue-500/10',
    member: 'text-muted-foreground bg-accent',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium',
        colors[role] || colors.member
      )}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {ROLE_LABELS[role] || role}
    </span>
  )
}

function getInitials(name, email) {
  if (name) {
    const parts = name.trim().split(/\s+/)
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase()
  }
  return email ? email[0].toUpperCase() : '?'
}

function MemberAvatar({ name, email }) {
  return (
    <div
      className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0 select-none"
      aria-hidden="true"
    >
      {getInitials(name, email)}
    </div>
  )
}

// ── Create Team Dialog ────────────────────────────────────────────────────────

function CreateTeamDialog({ onCreated }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch('/api/teams', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim() }),
      })
      onCreated(data.team)
      setName('')
      setOpen(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={v => { setOpen(v); if (!v) { setName(''); setError(null) } }}>
      <Dialog.Trigger asChild>
        <button
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New team
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 animate-in fade-in-0 duration-150" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-6 shadow-xl animate-in fade-in-0 zoom-in-95 duration-150 focus:outline-none">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-base font-semibold text-foreground">Create a team</Dialog.Title>
            <Dialog.Close className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="team-name" className="text-sm font-medium text-foreground">
                Team name
              </label>
              <input
                id="team-name"
                type="text"
                required
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Engineering, Design..."
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <Dialog.Close
                type="button"
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
              >
                Cancel
              </Dialog.Close>
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Creating...' : 'Create team'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ── Invite Member Dialog ──────────────────────────────────────────────────────

function InviteMemberDialog({ teamId, onInvited }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('member')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [inviteToken, setInviteToken] = useState(null)

  function reset() {
    setEmail('')
    setRole('member')
    setError(null)
    setInviteToken(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch(`/api/teams/${teamId}/invites`, {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), role }),
      })
      setInviteToken(data.invite.token)
      onInvited(data.invite)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inviteLink = inviteToken
    ? `${window.location.origin}/invites/${inviteToken}/accept`
    : null

  return (
    <Dialog.Root open={open} onOpenChange={v => { setOpen(v); if (!v) reset() }}>
      <Dialog.Trigger asChild>
        <button
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <Mail className="h-4 w-4" aria-hidden="true" />
          Invite member
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 animate-in fade-in-0 duration-150" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-6 shadow-xl animate-in fade-in-0 zoom-in-95 duration-150 focus:outline-none">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-base font-semibold text-foreground">Invite a member</Dialog.Title>
            <Dialog.Close className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          {inviteLink ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Invite sent. Share this link with the recipient (expires in 7 days):
              </p>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2">
                <p className="flex-1 text-xs font-mono text-foreground truncate">{inviteLink}</p>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(inviteLink)}
                  className="shrink-0 rounded px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Copy
                </button>
              </div>
              <div className="flex justify-end">
                <Dialog.Close className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                  Done
                </Dialog.Close>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="invite-email" className="text-sm font-medium text-foreground">
                  Email address
                </label>
                <input
                  id="invite-email"
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="invite-role" className="text-sm font-medium text-foreground">
                  Role
                </label>
                <select
                  id="invite-role"
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="member">Member — read and collaborate</option>
                  <option value="admin">Admin — manage team settings and members</option>
                </select>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex justify-end gap-2 pt-1">
                <Dialog.Close
                  type="button"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
                >
                  Cancel
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Sending...' : 'Send invite'}
                </button>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ── Rename Team Dialog ────────────────────────────────────────────────────────

function RenameTeamDialog({ team, onRenamed }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(team.name)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim() || name.trim() === team.name) return
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch(`/api/teams/${team.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: name.trim() }),
      })
      onRenamed(data.team)
      setOpen(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={v => { setOpen(v); if (!v) { setName(team.name); setError(null) } }}>
      <Dialog.Trigger asChild>
        <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Rename
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 animate-in fade-in-0 duration-150" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-6 shadow-xl animate-in fade-in-0 zoom-in-95 duration-150 focus:outline-none">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-base font-semibold text-foreground">Rename team</Dialog.Title>
            <Dialog.Close className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Dialog.Close
                type="button"
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
              >
                Cancel
              </Dialog.Close>
              <button
                type="submit"
                disabled={loading || !name.trim() || name.trim() === team.name}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ── Team Detail ───────────────────────────────────────────────────────────────

function TeamDetail({ teamId, onBack, currentUserId }) {
  const [team, setTeam] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchTeam = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch(`/api/teams/${teamId}`)
      setTeam(data.team)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [teamId])

  useEffect(() => { fetchTeam() }, [fetchTeam])

  async function handleDeleteTeam() {
    setDeleting(true)
    try {
      await apiFetch(`/api/teams/${teamId}`, { method: 'DELETE' })
      onBack(true) // signal that a team was deleted
    } catch (err) {
      setError(err.message)
      setDeleting(false)
    }
  }

  async function handleRemoveMember(memberId) {
    try {
      await apiFetch(`/api/teams/${teamId}/members/${memberId}`, { method: 'DELETE' })
      fetchTeam()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleChangeRole(memberId, role) {
    try {
      await apiFetch(`/api/teams/${teamId}/members/${memberId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      })
      fetchTeam()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleCancelInvite(inviteId) {
    try {
      await apiFetch(`/api/teams/${teamId}/invites/${inviteId}`, { method: 'DELETE' })
      fetchTeam()
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-accent" />
        ))}
      </div>
    )
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>
  }

  if (!team) return null

  const userRole = team.user_role
  const canManage = ['owner', 'admin'].includes(userRole)
  const isOwner = userRole === 'owner'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => onBack(false)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors shrink-0"
            aria-label="Back to teams"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground truncate">{team.name}</h2>
              {canManage && (
                <RenameTeamDialog
                  team={team}
                  onRenamed={updated => setTeam(t => ({ ...t, name: updated.name }))}
                />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {team.members?.length ?? 0} member{team.members?.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {canManage && (
          <InviteMemberDialog
            teamId={teamId}
            onInvited={() => fetchTeam()}
          />
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Tabs.Root defaultValue="members">
        <Tabs.List
          className="flex overflow-x-auto scrollbar-hide border-b border-border mb-5"
          aria-label="Team sections"
        >
          {[
            { value: 'members', label: `Members (${team.members?.length ?? 0})` },
            ...(canManage ? [{ value: 'invites', label: `Pending invites (${team.pending_invites?.length ?? 0})` }] : []),
            ...(isOwner ? [{ value: 'settings', label: 'Settings' }] : []),
          ].map(tab => (
            <Tabs.Trigger
              key={tab.value}
              value={tab.value}
              className={cn(
                'shrink-0 whitespace-nowrap px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors border-b-2 border-transparent -mb-px',
                'hover:text-foreground',
                'data-[state=active]:border-primary data-[state=active]:text-foreground'
              )}
            >
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {/* Members tab */}
        <Tabs.Content value="members">
          <div className="space-y-2">
            {team.members?.map(member => {
              const isSelf = member.user_id === currentUserId
              const isOwnerRow = member.role === 'owner'
              return (
                <div
                  key={member.id}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <MemberAvatar name={member.name} email={member.email} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-foreground truncate">
                          {member.name || member.email}
                          {isSelf && (
                            <span className="ml-1.5 text-xs text-muted-foreground font-normal">(you)</span>
                          )}
                        </p>
                        <RoleBadge role={member.role} />
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    </div>
                  </div>

                  {/* Role change / remove — owner only, not on self (unless leaving) */}
                  {(isOwner && !isSelf) && (
                    <div className="flex items-center gap-2 sm:shrink-0">
                      <select
                        value={member.role}
                        onChange={e => handleChangeRole(member.id, e.target.value)}
                        className="flex-1 sm:flex-none rounded-md border border-input bg-background px-2 py-1.5 sm:py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        aria-label={`Change role for ${member.name || member.email}`}
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                        <option value="owner">Owner</option>
                      </select>
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
                        aria-label={`Remove ${member.name || member.email}`}
                      >
                        <UserMinus className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  {/* Admin can remove non-owner members (but not owner) */}
                  {(userRole === 'admin' && !isOwnerRow && !isSelf) && (
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="self-start sm:shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      aria-label={`Remove ${member.name || member.email}`}
                    >
                      <UserMinus className="h-4 w-4" />
                    </button>
                  )}
                  {/* Self — leave button (unless last owner) */}
                  {isSelf && !isOwnerRow && (
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="self-start sm:shrink-0 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                      Leave
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </Tabs.Content>

        {/* Pending invites tab */}
        {canManage && (
          <Tabs.Content value="invites">
            {team.pending_invites?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Mail className="h-8 w-8 text-muted-foreground mb-3" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">No pending invites</p>
              </div>
            ) : (
              <div className="space-y-2">
                {team.pending_invites?.map(invite => (
                  <div
                    key={invite.id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent shrink-0">
                      <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{invite.email}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        <RoleBadge role={invite.role} />
                        <span className="text-xs text-muted-foreground">
                          Expires {new Date(invite.expires_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCancelInvite(invite.id)}
                      className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      aria-label={`Cancel invite for ${invite.email}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Tabs.Content>
        )}

        {/* Settings tab */}
        {isOwner && (
          <Tabs.Content value="settings">
            <div className="max-w-md space-y-4 pt-2">
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-destructive">Delete team</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Permanently removes the team and all its members. This cannot be undone.
                  </p>
                </div>
                {!deleteConfirm ? (
                  <button
                    onClick={() => setDeleteConfirm(true)}
                    className="rounded-lg border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  >
                    Delete team
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-destructive">Are you sure?</p>
                    <button
                      onClick={() => setDeleteConfirm(false)}
                      className="rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-accent transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteTeam}
                      disabled={deleting}
                      className="rounded-lg bg-destructive px-3 py-1 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 transition-colors"
                    >
                      {deleting ? 'Deleting...' : 'Yes, delete'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </Tabs.Content>
        )}
      </Tabs.Root>
    </div>
  )
}

// ── Accept Invite Banner ──────────────────────────────────────────────────────

function AcceptInviteBanner({ token, onAccepted }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)
  const [teamName, setTeamName] = useState(null)

  async function handleAccept() {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch(`/api/invites/${token}/accept`, { method: 'POST' })
      setTeamName(data.team?.name)
      setDone(true)
      onAccepted()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
        You have joined{teamName ? ` "${teamName}"` : ' the team'}.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 space-y-2">
      <p className="text-sm font-medium text-foreground">You have a pending team invite</p>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <button
        onClick={handleAccept}
        disabled={loading}
        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Accepting...' : 'Accept invite'}
      </button>
    </div>
  )
}

// ── Teams List ────────────────────────────────────────────────────────────────

function TeamsList({ teams, onSelect, onCreated }) {
  if (teams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-accent p-4 mb-4">
          <Users className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        </div>
        <h3 className="text-sm font-semibold text-foreground mb-1">No teams yet</h3>
        <p className="text-xs text-muted-foreground mb-4 max-w-xs">
          Create a team to collaborate with others and manage shared resources.
        </p>
        <CreateTeamDialog onCreated={team => { onCreated(team); onSelect(team.id) }} />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {teams.map(team => (
        <button
          key={team.id}
          onClick={() => onSelect(team.id)}
          className="w-full flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:bg-accent/50 transition-colors text-left"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <Users className="h-4 w-4 text-primary" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{team.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground">
                {team.member_count} member{team.member_count !== 1 ? 's' : ''}
              </span>
              <span className="text-muted-foreground/40">·</span>
              <RoleBadge role={team.user_role} />
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
        </button>
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Teams() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedTeamId, setSelectedTeamId] = useState(null)

  // Invite token from ?invite=<token> query param
  const inviteToken = searchParams.get('invite')

  const fetchTeams = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch('/api/teams')
      setTeams(data.teams)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTeams() }, [fetchTeams])

  function handleSelectTeam(teamId) {
    setSelectedTeamId(teamId)
  }

  function handleBack(teamDeleted) {
    setSelectedTeamId(null)
    if (teamDeleted) fetchTeams()
  }

  function handleTeamCreated(team) {
    setTeams(prev => [{ ...team }, ...prev])
  }

  function handleInviteAccepted() {
    // Clear the invite param and refresh teams
    setSearchParams(params => { params.delete('invite'); return params })
    fetchTeams()
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Page header */}
      {!selectedTeamId && (
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Teams</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Manage your teams and collaborate with others.
            </p>
          </div>
          {teams.length > 0 && (
            <CreateTeamDialog onCreated={team => { handleTeamCreated(team); handleSelectTeam(team.id) }} />
          )}
        </div>
      )}

      {/* Pending invite */}
      {inviteToken && !selectedTeamId && (
        <AcceptInviteBanner token={inviteToken} onAccepted={handleInviteAccepted} />
      )}

      {/* Error */}
      {error && !selectedTeamId && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Loading skeleton */}
      {loading && !selectedTeamId && (
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-accent" />
          ))}
        </div>
      )}

      {/* Team detail */}
      {selectedTeamId && (
        <TeamDetail
          teamId={selectedTeamId}
          onBack={handleBack}
          currentUserId={user?.id}
        />
      )}

      {/* Teams list */}
      {!loading && !selectedTeamId && (
        <TeamsList
          teams={teams}
          onSelect={handleSelectTeam}
          onCreated={handleTeamCreated}
        />
      )}
    </div>
  )
}
