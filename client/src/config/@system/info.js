// @system — product identity config
// Base defaults — @custom/info.js overrides these per-product
const defaults = {
  name: 'ProductTemplate',
  tagline: 'Your product tagline here',
  url: import.meta.env.VITE_APP_URL ?? 'http://localhost:5173',
  supportEmail: 'support@example.com',
}

// Merge @custom overrides
import { customInfo } from '../@custom/info.js'

export const info = { ...defaults, ...customInfo }
