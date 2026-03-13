// @custom — Linkforge navigation config
// Shared nav items for all dashboard pages
import { LayoutDashboard, Link2, Wand2, Users, BarChart3, Activity, CreditCard, Key, Settings, Globe } from 'lucide-react'

export const LINKFORGE_NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/app' },
  { icon: Link2, label: 'Links', to: '/app/links' },
  { icon: Wand2, label: 'UTM Builder', to: '/app/utm' },
  { icon: Users, label: 'Teams', to: '/app/teams' },
  { icon: Activity, label: 'Activity', to: '/app/activity' },
  { icon: CreditCard, label: 'Billing', to: '/app/billing' },
  { icon: Globe, label: 'Domains', to: '/app/domains' },
  { icon: Key, label: 'API Keys', to: '/app/api-keys' },
  { icon: Settings, label: 'Settings', to: '/app/settings' },
]
