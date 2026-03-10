// @custom — product-specific config override
// Override any values from @system/info.ts here.
// This file is NEVER overwritten during template sync.

export const customInfo = {
  name: 'Splice',
  tagline: 'Visual workflow builder and integration platform.',
  url: import.meta.env.VITE_APP_URL ?? 'https://splice.so',
  supportEmail: 'support@splice.com',
}
