// @system: Validate required VITE_ env vars at startup.
// Add your required env vars to the list below.
const REQUIRED_ENV_VARS = [
  // 'VITE_STRIPE_PUBLISHABLE_KEY',
]

export function validateEnv() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !import.meta.env[key])
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`)
  }
}
