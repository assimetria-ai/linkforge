/**
 * @custom/info.js — Linkforge Configuration
 */

const info = {
  name: 'Linkforge',
  tagline: 'Links engineered to convert',
  slug: 'linkforge',
  navItems: [
    { to: '/dashboard',  label: 'Dashboard',                icon: 'LayoutDashboard' },
    { to: '/links',      label: 'Link Shortening',          icon: 'Link' },
    { to: '/analytics',  label: 'Click Analytics',          icon: 'BarChart3' },
    { to: '/domains',    label: 'Custom Domains',           icon: 'Globe' },
    { to: '/qr',         label: 'QR Code Generation',       icon: 'QrCode' },
    { to: '/manage',     label: 'Link Management Dashboard',icon: 'LayoutList' },
    { to: '/teams',      label: 'Team Workspaces',          icon: 'Users' },
    { to: '/api',        label: 'API Access',               icon: 'Key' },
    { to: '/utm',        label: 'UTM Builder',              icon: 'Tag' },
    { to: '/settings',   label: 'Settings',                 icon: 'Settings' },
  ],
}

export default info
