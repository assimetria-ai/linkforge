// @custom — Custom domains API for branded short links
const express = require('express')
const router = express.Router()
const dns = require('dns').promises
const { authenticate } = require('../../../lib/@system/Helpers/auth')
const CustomDomainRepo = require('../../../db/repos/@custom/CustomDomainRepo')

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Validate domain format
 */
function isValidDomain(domain) {
  return /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(domain)
}

/**
 * Verify DNS configuration for a domain
 * Checks CNAME or TXT record depending on method
 */
async function verifyDns(domain, token, method) {
  try {
    if (method === 'cname') {
      // Check if CNAME points to our service
      const records = await dns.resolveCname(domain)
      // Accept if pointing to any of our expected targets
      const validTargets = ['proxy.linkforge.app', 'cname.linkforge.app', 'links.linkforge.app']
      return records.some((r) => validTargets.includes(r.toLowerCase()))
    } else if (method === 'txt') {
      // Check for TXT verification record on _linkforge subdomain
      const records = await dns.resolveTxt(`_linkforge.${domain}`)
      const flat = records.map((r) => r.join('')).map((r) => r.trim())
      return flat.includes(`linkforge-verify=${token}`)
    }
    return false
  } catch (err) {
    // DNS lookup failures mean not yet configured
    return false
  }
}

// ─── GET /api/domains ────────────────────────────────────────────────────────
// List user's custom domains
router.get('/domains', authenticate, async (req, res, next) => {
  try {
    const domains = await CustomDomainRepo.findByUserId(req.user.id)
    res.json({ domains })
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/domains/:id ────────────────────────────────────────────────────
// Get single domain details
router.get('/domains/:id', authenticate, async (req, res, next) => {
  try {
    const domain = await CustomDomainRepo.findById(req.params.id)
    if (!domain) {
      return res.status(404).json({ message: 'Domain not found' })
    }
    if (domain.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' })
    }
    res.json({ domain })
  } catch (err) {
    next(err)
  }
})

// ─── POST /api/domains ──────────────────────────────────────────────────────
// Add a new custom domain
router.post('/domains', authenticate, async (req, res, next) => {
  try {
    const { domain, verification_method } = req.body

    if (!domain || !isValidDomain(domain)) {
      return res.status(400).json({ message: 'Invalid domain format' })
    }

    // Normalize domain
    const normalizedDomain = domain.toLowerCase().trim()

    // Check for duplicates
    const exists = await CustomDomainRepo.domainExists(normalizedDomain)
    if (exists) {
      return res.status(409).json({ message: 'Domain already registered' })
    }

    const method = verification_method === 'txt' ? 'txt' : 'cname'
    const newDomain = await CustomDomainRepo.create({
      domain: normalizedDomain,
      userId: req.user.id,
      verificationMethod: method,
    })

    // Return DNS setup instructions
    const instructions =
      method === 'cname'
        ? {
            type: 'CNAME',
            host: normalizedDomain,
            value: 'cname.linkforge.app',
            description: `Add a CNAME record pointing ${normalizedDomain} to cname.linkforge.app`,
          }
        : {
            type: 'TXT',
            host: `_linkforge.${normalizedDomain}`,
            value: `linkforge-verify=${newDomain.verification_token}`,
            description: `Add a TXT record at _linkforge.${normalizedDomain} with the verification value`,
          }

    res.status(201).json({ domain: newDomain, dns_instructions: instructions })
  } catch (err) {
    next(err)
  }
})

// ─── POST /api/domains/:id/verify ───────────────────────────────────────────
// Verify DNS configuration for a domain
router.post('/domains/:id/verify', authenticate, async (req, res, next) => {
  try {
    const domain = await CustomDomainRepo.findById(req.params.id)
    if (!domain) {
      return res.status(404).json({ message: 'Domain not found' })
    }
    if (domain.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' })
    }

    if (domain.verified_at) {
      return res.json({ verified: true, message: 'Domain already verified', domain })
    }

    const verified = await verifyDns(domain.domain, domain.verification_token, domain.verification_method)

    if (verified) {
      const updated = await CustomDomainRepo.markVerified(domain.id)
      // Start SSL provisioning (simulated — in production would trigger cert manager)
      await CustomDomainRepo.updateSslStatus(domain.id, 'provisioning')
      // Simulate SSL provisioning completing quickly
      setTimeout(async () => {
        try {
          await CustomDomainRepo.updateSslStatus(domain.id, 'active')
        } catch {
          // Best-effort SSL status update
        }
      }, 5000)

      res.json({ verified: true, message: 'Domain verified successfully', domain: updated })
    } else {
      const instructions =
        domain.verification_method === 'cname'
          ? `Set a CNAME record for ${domain.domain} pointing to cname.linkforge.app`
          : `Set a TXT record at _linkforge.${domain.domain} with value: linkforge-verify=${domain.verification_token}`

      res.json({
        verified: false,
        message: 'DNS records not found. Please configure your DNS and try again.',
        instructions,
      })
    }
  } catch (err) {
    next(err)
  }
})

// ─── PATCH /api/domains/:id/primary ─────────────────────────────────────────
// Set domain as primary
router.patch('/domains/:id/primary', authenticate, async (req, res, next) => {
  try {
    const domain = await CustomDomainRepo.findById(req.params.id)
    if (!domain) {
      return res.status(404).json({ message: 'Domain not found' })
    }
    if (domain.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' })
    }
    if (!domain.verified_at) {
      return res.status(400).json({ message: 'Domain must be verified before setting as primary' })
    }

    const updated = await CustomDomainRepo.setPrimary(domain.id, req.user.id)
    res.json({ domain: updated })
  } catch (err) {
    next(err)
  }
})

// ─── POST /api/domains/:id/regenerate-token ─────────────────────────────────
// Regenerate verification token
router.post('/domains/:id/regenerate-token', authenticate, async (req, res, next) => {
  try {
    const domain = await CustomDomainRepo.findById(req.params.id)
    if (!domain) {
      return res.status(404).json({ message: 'Domain not found' })
    }
    if (domain.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const updated = await CustomDomainRepo.regenerateToken(domain.id, req.user.id)
    res.json({ domain: updated })
  } catch (err) {
    next(err)
  }
})

// ─── DELETE /api/domains/:id ────────────────────────────────────────────────
// Remove a custom domain
router.delete('/domains/:id', authenticate, async (req, res, next) => {
  try {
    const domain = await CustomDomainRepo.findById(req.params.id)
    if (!domain) {
      return res.status(404).json({ message: 'Domain not found' })
    }
    if (domain.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' })
    }

    await CustomDomainRepo.delete(domain.id, req.user.id)
    res.status(204).send()
  } catch (err) {
    next(err)
  }
})

module.exports = router
