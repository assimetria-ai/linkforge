// @system — password validation helper
// Exports: validatePassword(password) → { valid: boolean, message?: string }

const MIN_LENGTH = 8

/**
 * Validate a plaintext password against the application password policy.
 *
 * Rules:
 *   - At least 8 characters
 *   - At least one uppercase letter
 *   - At least one lowercase letter
 *   - At least one digit
 *
 * @param {string} password
 * @returns {{ valid: boolean, message: string }}
 */
function validatePassword(password) {
  if (typeof password !== 'string' || password.length < MIN_LENGTH) {
    return { valid: false, message: `Password must be at least ${MIN_LENGTH} characters long` }
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' }
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' }
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' }
  }
  return { valid: true, message: '' }
}

module.exports = { validatePassword }
