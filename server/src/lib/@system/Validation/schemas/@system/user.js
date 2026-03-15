// @system — user validation schemas
// Provides field-level validation rules for all user API endpoints.

'use strict'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Build a lightweight schema from a rules object.
 *
 * Rule options per field:
 *   required   {boolean}  - field must be present and non-empty
 *   type       {string}   - 'email' triggers format check
 *   minLength  {number}   - minimum string length
 *   maxLength  {number}   - maximum string length
 *   label      {string}   - human-readable name used in error messages
 */
function makeSchema(rules) {
  return {
    validate(data) {
      for (const [field, rule] of Object.entries(rules)) {
        const val     = data?.[field]
        const present = val !== undefined && val !== null && val !== ''

        if (rule.required && !present) {
          return { error: `${rule.label || field} is required` }
        }

        if (!present) continue // skip further checks for optional absent fields

        if (rule.type === 'email' && !EMAIL_RE.test(val)) {
          return { error: `${rule.label || field} must be a valid email address` }
        }

        if (typeof rule.minLength === 'number' && String(val).length < rule.minLength) {
          return { error: `${rule.label || field} must be at least ${rule.minLength} characters` }
        }

        if (typeof rule.maxLength === 'number' && String(val).length > rule.maxLength) {
          return { error: `${rule.label || field} must be at most ${rule.maxLength} characters` }
        }
      }

      return { error: null }
    },
  }
}

// ── Schemas ────────────────────────────────────────────────────────────────────

const RegisterBody = makeSchema({
  email:    { required: true,  type: 'email', label: 'Email' },
  password: { required: true,  minLength: 8,  label: 'Password' },
  name:     { required: false, maxLength: 100, label: 'Name' },
})

const UpdateProfileBody = makeSchema({
  name: { required: false, maxLength: 100, label: 'Name' },
})

const ChangePasswordBody = makeSchema({
  currentPassword: { required: true, label: 'Current password' },
  newPassword:     { required: true, minLength: 8, label: 'New password' },
})

const PasswordResetRequestBody = makeSchema({
  email: { required: true, type: 'email', label: 'Email' },
})

const PasswordResetBody = makeSchema({
  token:    { required: true, label: 'Reset token' },
  password: { required: true, minLength: 8, label: 'Password' },
})

const VerifyEmailBody = makeSchema({
  token: { required: true, label: 'Verification token' },
})

module.exports = {
  RegisterBody,
  UpdateProfileBody,
  ChangePasswordBody,
  PasswordResetRequestBody,
  PasswordResetBody,
  VerifyEmailBody,
}
