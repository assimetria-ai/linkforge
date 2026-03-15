// @custom — product-specific config override
// Override any values from @system/info.ts here.
// This file is NEVER overwritten during template sync.

export const customInfo = {
  name: 'Linkforge',
  tagline: 'Links engineered to convert',
  url: import.meta.env.VITE_APP_URL ?? 'https://linkforge-production-0c1e.up.railway.app',
  supportEmail: 'support@linkforge.io',
  theme_color: '#3A8BFD',
}
