// @custom — product-specific config override
// Override any values from @system/info.ts here.
// This file is NEVER overwritten during template sync.

export const customInfo = {
  name: 'Splice',
  tagline: 'Your product tagline here',
  url: import.meta.env.VITE_APP_URL ?? 'http://localhost:5173',
  supportEmail: 'support@splice.com',
}
