// @system — product identity config
// @custom values from ../@custom/info.js are merged in and take precedence
import { customInfo } from '../@custom/info.js'

export const info = {
  name: 'ProductTemplate',
  tagline: 'Your product tagline here',
  url: import.meta.env.VITE_APP_URL ?? 'http://localhost:5173',
  supportEmail: 'support@example.com',
  ...customInfo,
}
