// @system — SPF/DKIM/DMARC setup helpers
// Generates and validates DNS records required for email deliverability.
// Use these helpers to guide users through domain verification or to
// programmatically check that DNS records are correctly configured.
//
// Usage:
//   const dns = require('../lib/@system/Email/dns-helpers')
//   const records = dns.generateRecords({ domain: 'example.com', provider: 'resend' })
//   const validation = await dns.validateDomain('example.com')
//   const report = dns.formatReport(validation)

'use strict'

const { resolve, resolveTxt, resolveCname } = require('dns').promises
const logger = require('../Logger')

// ── SPF Record Helpers ────────────────────────────────────────────────────────

/** SPF include directives for each provider. */
const SPF_INCLUDES = {
  resend: 'include:_spf.resend.com',
  sendgrid: 'include:sendgrid.net',
  ses: 'include:amazonses.com',
  mailgun: 'include:mailgun.org',
  postmark: 'include:spf.mtasv.net',
}

/**
 * Generate the recommended SPF record for a domain.
 * Combines existing SPF includes with the new provider's include.
 *
 * @param {object} opts
 * @param {string} opts.domain     Your sending domain
 * @param {string} opts.provider   Email provider: resend | sendgrid | ses | mailgun | postmark
 * @param {string[]} [opts.extraIncludes] Additional SPF includes
 * @param {boolean} [opts.softFail=false] Use ~all instead of -all
 * @returns {object} { type: 'TXT', host: '@', value: 'v=spf1 ...' }
 */
function generateSPF({ provider, extraIncludes = [], softFail = false }) {
  const includes = [SPF_INCLUDES[provider], ...extraIncludes].filter(Boolean)
  const mechanism = softFail ? '~all' : '-all'
  const value = `v=spf1 ${includes.join(' ')} ${mechanism}`

  return {
    type: 'TXT',
    host: '@',
    value,
    description: `SPF record — authorizes ${provider} to send email on your behalf`,
  }
}

// ── DKIM Record Helpers ───────────────────────────────────────────────────────

/** Default DKIM selectors per provider. */
const DKIM_SELECTORS = {
  resend: ['resend._domainkey'],
  sendgrid: ['s1._domainkey', 's2._domainkey'],
  ses: ['*._domainkey'], // SES uses custom selectors, typically via CNAME
  mailgun: ['smtp._domainkey'],
  postmark: ['20xxxxxx._domainkey'], // Postmark uses date-based selectors
}

/**
 * Generate DKIM DNS record instructions per provider.
 * Since DKIM public keys are provider-specific and generated per-domain,
 * this returns guidance rather than the actual values.
 *
 * @param {object} opts
 * @param {string} opts.provider Provider name
 * @param {string} opts.domain   Sending domain
 * @returns {object[]} Array of { type, host, value, description }
 */
function generateDKIM({ provider, domain }) {
  const records = []

  switch (provider) {
    case 'resend':
      records.push({
        type: 'TXT',
        host: `resend._domainkey.${domain}`,
        value: '<value from Resend dashboard → Domains → DNS Records>',
        description: 'DKIM signing key — get the exact value from your Resend domain settings',
      })
      break

    case 'sendgrid':
      records.push(
        {
          type: 'CNAME',
          host: `s1._domainkey.${domain}`,
          value: `s1.domainkey.u${domain.replace(/\./g, '')}.xxx.sendgrid.net`,
          description: 'DKIM key 1 — get exact CNAME from SendGrid Sender Authentication',
        },
        {
          type: 'CNAME',
          host: `s2._domainkey.${domain}`,
          value: `s2.domainkey.u${domain.replace(/\./g, '')}.xxx.sendgrid.net`,
          description: 'DKIM key 2 — get exact CNAME from SendGrid Sender Authentication',
        }
      )
      break

    case 'ses':
      for (let i = 1; i <= 3; i++) {
        records.push({
          type: 'CNAME',
          host: `<token${i}>._domainkey.${domain}`,
          value: `<token${i}>.dkim.amazonses.com`,
          description: `DKIM CNAME ${i}/3 — get exact tokens from SES console → Verified Identities`,
        })
      }
      break

    default:
      records.push({
        type: 'TXT',
        host: `<selector>._domainkey.${domain}`,
        value: `<DKIM public key from ${provider} dashboard>`,
        description: `DKIM key — check your ${provider} dashboard for DNS records`,
      })
  }

  return records
}

// ── DMARC Record Helpers ──────────────────────────────────────────────────────

/**
 * Generate a DMARC record for a domain.
 *
 * @param {object} opts
 * @param {string}  opts.domain       Sending domain
 * @param {string}  [opts.policy='none']  Policy: none | quarantine | reject
 * @param {string}  [opts.ruaEmail]   Email to receive aggregate reports
 * @param {string}  [opts.rufEmail]   Email to receive forensic reports
 * @param {number}  [opts.percentage=100] Percentage of messages to apply policy to
 * @returns {object} { type: 'TXT', host: '_dmarc', value: 'v=DMARC1; ...' }
 */
function generateDMARC({ domain, policy = 'none', ruaEmail, rufEmail, percentage = 100 }) {
  const parts = [`v=DMARC1`, `p=${policy}`]

  if (ruaEmail) parts.push(`rua=mailto:${ruaEmail}`)
  if (rufEmail) parts.push(`ruf=mailto:${rufEmail}`)
  if (percentage < 100) parts.push(`pct=${percentage}`)

  // Recommended sub-domain policy matches the main domain policy
  parts.push(`sp=${policy}`)
  parts.push('adkim=r') // relaxed DKIM alignment
  parts.push('aspf=r')  // relaxed SPF alignment

  return {
    type: 'TXT',
    host: `_dmarc.${domain}`,
    value: parts.join('; '),
    description: `DMARC policy — ${policy === 'none' ? 'monitor only (recommended to start)' : policy}`,
  }
}

/**
 * Generate all recommended DNS records for a given domain and provider.
 *
 * @param {object} opts
 * @param {string} opts.domain    Sending domain
 * @param {string} opts.provider  Email provider
 * @param {object} [opts.dmarc]   DMARC options (policy, ruaEmail, etc.)
 * @returns {object} { spf, dkim, dmarc, returnPath }
 */
function generateRecords({ domain, provider, dmarc = {} }) {
  return {
    spf: generateSPF({ provider }),
    dkim: generateDKIM({ provider, domain }),
    dmarc: generateDMARC({ domain, ...dmarc }),
    returnPath: {
      type: 'CNAME',
      host: `bounce.${domain}`,
      value: `<return-path CNAME from ${provider} dashboard>`,
      description: 'Return-Path / bounce subdomain — improves SPF alignment',
    },
  }
}

// ── DNS Validation ────────────────────────────────────────────────────────────

/**
 * Validate email DNS records for a domain.
 * Checks SPF, DKIM (common selectors), and DMARC records.
 *
 * @param {string} domain
 * @param {object} [opts]
 * @param {string} [opts.provider] If set, checks provider-specific DKIM selectors
 * @returns {Promise<object>} Validation result with pass/fail per record type
 */
async function validateDomain(domain, { provider } = {}) {
  const result = {
    domain,
    spf: { found: false, valid: false, record: null, errors: [] },
    dkim: { found: false, selectors: [] },
    dmarc: { found: false, valid: false, record: null, errors: [] },
  }

  // ── SPF ──
  try {
    const txtRecords = await resolveTxt(domain)
    const spfRecords = txtRecords.map(r => r.join('')).filter(r => r.startsWith('v=spf1'))

    if (spfRecords.length === 0) {
      result.spf.errors.push('No SPF record found')
    } else if (spfRecords.length > 1) {
      result.spf.found = true
      result.spf.record = spfRecords[0]
      result.spf.errors.push(`Multiple SPF records found (${spfRecords.length}) — only 1 allowed`)
    } else {
      result.spf.found = true
      result.spf.record = spfRecords[0]
      result.spf.valid = true

      // Check for common issues
      if (spfRecords[0].includes('+all')) {
        result.spf.errors.push('SPF uses +all (allows anyone) — use ~all or -all')
        result.spf.valid = false
      }

      // Check for provider include
      if (provider && SPF_INCLUDES[provider]) {
        const include = SPF_INCLUDES[provider]
        if (!spfRecords[0].includes(include)) {
          result.spf.errors.push(`Missing ${include} — required for ${provider}`)
        }
      }
    }
  } catch (err) {
    if (err.code !== 'ENODATA' && err.code !== 'ENOTFOUND') {
      result.spf.errors.push(`DNS query failed: ${err.message}`)
    }
  }

  // ── DKIM ──
  const selectors = provider ? (DKIM_SELECTORS[provider] || []) : []
  const commonSelectors = ['default._domainkey', 'google._domainkey', 'k1._domainkey']
  const allSelectors = [...new Set([...selectors, ...commonSelectors])].filter(s => !s.includes('*'))

  for (const selector of allSelectors) {
    const host = selector.includes('.') ? `${selector}.${domain}` : `${selector}._domainkey.${domain}`
    try {
      const records = await resolveTxt(host)
      const value = records.map(r => r.join('')).join('')
      if (value) {
        result.dkim.found = true
        result.dkim.selectors.push({ selector, host, valid: value.includes('p=') })
      }
    } catch {
      // Try CNAME lookup (SendGrid, SES use CNAMEs)
      try {
        const cnames = await resolveCname(host)
        if (cnames.length > 0) {
          result.dkim.found = true
          result.dkim.selectors.push({ selector, host, cname: cnames[0], valid: true })
        }
      } catch {
        // Selector not found — that's OK
      }
    }
  }

  // ── DMARC ──
  try {
    const dmarcRecords = await resolveTxt(`_dmarc.${domain}`)
    const dmarc = dmarcRecords.map(r => r.join('')).filter(r => r.startsWith('v=DMARC1'))

    if (dmarc.length > 0) {
      result.dmarc.found = true
      result.dmarc.record = dmarc[0]
      result.dmarc.valid = true

      // Parse policy
      const policyMatch = dmarc[0].match(/p=(\w+)/)
      result.dmarc.policy = policyMatch ? policyMatch[1] : 'unknown'

      if (result.dmarc.policy === 'none') {
        result.dmarc.errors.push('DMARC policy is "none" (monitoring only) — consider upgrading to quarantine/reject')
      }
    } else {
      result.dmarc.errors.push('No DMARC record found — recommended for deliverability')
    }
  } catch (err) {
    if (err.code !== 'ENODATA' && err.code !== 'ENOTFOUND') {
      result.dmarc.errors.push(`DNS query failed: ${err.message}`)
    } else {
      result.dmarc.errors.push('No DMARC record found')
    }
  }

  return result
}

/**
 * Format a validation result into a human-readable report.
 *
 * @param {object} validation Result from validateDomain()
 * @returns {string} Formatted text report
 */
function formatReport(validation) {
  const lines = [`Email DNS Report: ${validation.domain}`, '='.repeat(50)]

  // SPF
  const spfStatus = validation.spf.valid ? 'PASS' : validation.spf.found ? 'WARN' : 'FAIL'
  lines.push(`\nSPF: ${spfStatus}`)
  if (validation.spf.record) lines.push(`  Record: ${validation.spf.record}`)
  for (const err of validation.spf.errors) lines.push(`  Issue: ${err}`)

  // DKIM
  const dkimStatus = validation.dkim.found ? 'PASS' : 'WARN'
  lines.push(`\nDKIM: ${dkimStatus}`)
  if (validation.dkim.selectors.length > 0) {
    for (const sel of validation.dkim.selectors) {
      lines.push(`  Selector: ${sel.selector} ${sel.valid ? '(valid)' : '(invalid)'}`)
    }
  } else {
    lines.push('  No DKIM selectors found (check provider-specific selectors)')
  }

  // DMARC
  const dmarcStatus = validation.dmarc.valid ? 'PASS' : validation.dmarc.found ? 'WARN' : 'FAIL'
  lines.push(`\nDMARC: ${dmarcStatus}`)
  if (validation.dmarc.record) lines.push(`  Record: ${validation.dmarc.record}`)
  if (validation.dmarc.policy) lines.push(`  Policy: ${validation.dmarc.policy}`)
  for (const err of validation.dmarc.errors) lines.push(`  Issue: ${err}`)

  return lines.join('\n')
}

// ── Simplified positional-argument API ───────────────────────────────────────
// Wrappers that match the documented function signatures expected by callers.

/**
 * Generate an SPF TXT record string for a domain.
 *
 * @param {string}   domain                        Sending domain (informational)
 * @param {string[]} providers                     Provider names: resend | sendgrid | ses | mailgun | postmark
 * @param {object}   [opts]
 * @param {string[]} [opts.extraIncludes=[]]       Additional raw SPF include directives
 * @param {boolean}  [opts.softFail=false]         Use ~all instead of -all
 * @returns {string} SPF TXT record value, e.g. "v=spf1 include:_spf.resend.com -all"
 */
function generateSpfRecord(domain, providers = [], { extraIncludes = [], softFail = false } = {}) {
  const includes = [
    ...providers.map(p => SPF_INCLUDES[p]).filter(Boolean),
    ...extraIncludes,
  ]
  const mechanism = softFail ? '~all' : '-all'
  return ['v=spf1', ...includes, mechanism].join(' ')
}

/**
 * Generate a DKIM TXT record value from a raw public key.
 * Place the returned string at <selector>._domainkey.<domain> in DNS.
 *
 * @param {string} selector  DKIM selector (e.g. "default", "resend", "s1")
 * @param {string} publicKey Base64-encoded RSA or Ed25519 public key (no PEM headers)
 * @returns {string} DKIM TXT record value, e.g. "v=DKIM1; k=rsa; p=MIIBIjAN..."
 */
function generateDkimRecord(selector, publicKey) {
  // selector is informational — callers must publish this at <selector>._domainkey.<domain>
  return `v=DKIM1; k=rsa; p=${publicKey}`
}

/**
 * Generate a DMARC TXT record string for a domain.
 *
 * @param {string}  domain
 * @param {object}  [opts]
 * @param {string}  [opts.policy='none']       none | quarantine | reject
 * @param {string}  [opts.ruaEmail]            Aggregate report recipient email
 * @param {string}  [opts.rufEmail]            Forensic report recipient email
 * @param {number}  [opts.percentage=100]      Percentage of messages to apply policy to
 * @returns {string} DMARC TXT record value, e.g. "v=DMARC1; p=none; ..."
 */
function generateDmarcRecord(domain, opts = {}) {
  return generateDMARC({ domain, ...opts }).value
}

/**
 * Verify SPF, DKIM, and DMARC DNS records for a domain using live DNS lookups.
 *
 * @param {string} domain
 * @returns {Promise<{
 *   spf:   { found: boolean, valid: boolean, record: string|null },
 *   dkim:  { found: boolean, valid: boolean, record: string|null },
 *   dmarc: { found: boolean, valid: boolean, record: string|null },
 * }>}
 */
async function verifyDnsRecords(domain) {
  const v = await validateDomain(domain)
  return {
    spf: {
      found:  v.spf.found,
      valid:  v.spf.valid,
      record: v.spf.record,
    },
    dkim: {
      found:  v.dkim.found,
      valid:  v.dkim.found && v.dkim.selectors.some(s => s.valid),
      record: v.dkim.selectors.length > 0 ? v.dkim.selectors[0].selector : null,
    },
    dmarc: {
      found:  v.dmarc.found,
      valid:  v.dmarc.valid,
      record: v.dmarc.record,
    },
  }
}

module.exports = {
  // Simplified positional-argument API
  generateSpfRecord,
  generateDkimRecord,
  generateDmarcRecord,
  verifyDnsRecords,
  // Rich options-object API
  generateSPF,
  generateDKIM,
  generateDMARC,
  generateRecords,
  // Validation
  validateDomain,
  formatReport,
  // Constants
  SPF_INCLUDES,
  DKIM_SELECTORS,
}
