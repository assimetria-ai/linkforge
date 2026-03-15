// @system — teams validation schemas

'use strict'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function makeSchema(rules) {
  return {
    validate(data) {
      for (const [field, rule] of Object.entries(rules)) {
        const val     = data?.[field]
        const present = val !== undefined && val !== null && val !== ''

        if (rule.required && !present) {
          return { error: `${rule.label || field} is required` }
        }

        if (!present) continue

        if (rule.type === 'email' && !EMAIL_RE.test(val)) {
          return { error: `${rule.label || field} must be a valid email address` }
        }

        if (typeof rule.minLength === 'number' && String(val).length < rule.minLength) {
          return { error: `${rule.label || field} must be at least ${rule.minLength} characters` }
        }

        if (typeof rule.maxLength === 'number' && String(val).length > rule.maxLength) {
          return { error: `${rule.label || field} must be at most ${rule.maxLength} characters` }
        }

        if (rule.enum && !rule.enum.includes(val)) {
          return { error: `${rule.label || field} must be one of: ${rule.enum.join(', ')}` }
        }
      }

      return { error: null }
    },
  }
}

const CreateTeamBody = makeSchema({
  name: { required: true, minLength: 1, maxLength: 100, label: 'Team name' },
})

const UpdateTeamBody = makeSchema({
  name: { required: false, minLength: 1, maxLength: 100, label: 'Team name' },
})

const InviteMemberBody = makeSchema({
  email: { required: true, type: 'email', label: 'Email' },
  role:  { required: false, enum: ['admin', 'member'], label: 'Role' },
})

const UpdateMemberRoleBody = makeSchema({
  role: { required: true, enum: ['owner', 'admin', 'member'], label: 'Role' },
})

module.exports = {
  CreateTeamBody,
  UpdateTeamBody,
  InviteMemberBody,
  UpdateMemberRoleBody,
}
