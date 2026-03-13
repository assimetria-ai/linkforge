// @custom — Custom domains API for branded short links
// Supports: CRUD, DNS verification, SSL provisioning, workspace scoping,
// health checks, and white-label branding configuration
const express = require('express')
const router = express.Router()
const dns = require('dns').promises
const https = require('https')
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
      const records = await dns.resolveCname(domain)
      const validTargets = ['proxy.linkforge.app', 'cname.linkforge.app', 'links.linkforge.app']
      return records.some((r) => validTargets.includes(r.toLowerCase()))
    } else if (method === 'txt') {
      const records = await dns.resolveTxt(`_linkforge.${domain}`)
      const flat = records.map((r) => r.join('')).map((r) => r.trim())
      return flat.includes(`linkforge-verify=${token}`)
    }
    return false
  } catch (err) {
    return false
  }
}

/**
 * Check domain health: DNS resolution + HTTPS reachability
 */
async function checkDomainHealth(domain) {
  const result = { dns: false, https: false, error: null }

  // Check DNS resolves
  try {
    const addresses = await dns.resolve4(domain)
    result.dns = addresses.length > 0
  } catch (err) {
    try {
      // Fallback: check CNAME
      await dns.resolveCname(domain)
      result.dns = true
    } catch {
      result.error = `DNS resolution failed: ${err.code || err.message}`
      return result
    }
  }

  // Check HTTPS reachability
  try {
    await new Promise((resolve, reject) => {
      const req = https.get(`https://${domain}`, { timeout: 10000, rejectUnauthorized: true }, (res) => {
        result.https = true
        result.statusCode = res.statusCode
        res.destroy()
        resolve()
      })
      req.on('error', (err) => {
        result.error = `HTTPS check failed: ${err.message}`
        resolve()
      })
      req.on('timeout', () => {
        result.error = 'HTTPS check timed out'
        req.destroy()
        resolve()
      })
    })
  } catch (err) {
    result.error = `HTTPS check error: ${err.message}`
  }

  return result
}

/**
 * Validate branding input
 */
function validateBranding(branding) {
  const allowed = ['company_name', 'logo_url', 'favicon_url', 'primary_color', 'background_color', 'custom_css', 'powered_by_hidden']
  const cleaned = {}
  for (const key of allowed) {
    if (branding[key] !== undefined) {
      if (key === 'powered_by_hidden') {
        cleaned[key] = Boolean(branding[key])
      } else if (key === 'primary_color' || key === 'background_color') {
        // Validate hex color
        if (/^#[0-9A-Fa-f]{3,8}$/.test(branding[key])) {
          cleaned[key] = branding[key]
        }
      } else if (key === 'custom_css') {
        // Limit CSS length
        cleaned[key] = String(branding[key]).slice(0, 5000)
      } else {
        cleaned[key] = String(branding[key]).slice(0, 500)
      }
    }
  }
  return cleaned
}

/**
 * Check if user has access to domain (owner, team admin, or site admin)
 */
async function checkDomainAccess(domain, userId, userRole) {
  if (userRole === 'admin') return true
  if (domain.user_id === userId) return true
  if (domain.team_id) {
    const db = require('../../../lib/@system/PostgreSQL')
    const membership = await db.oneOrNone(
      `SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2`,
      [domain.team_id, userId],
    )
    return !!membership
  }
  return false
}

// ─── GET /api/domains ────────────────────────────────────────────────────────
// List domains (user's personal + optionally workspace-scoped)
router.get('/domains', authenticate, async (req, res, next) => {
  try {
    const { team_id } = req.query
    let domains
    if (team_id) {
      domains = await CustomDomainRepo.findByTeamId(parseInt(team_id, 10))
    } else {
      domains = await CustomDomainRepo.findByUserId(req.user.id)
    }
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
    const hasAccess = await checkDomainAccess(domain, req.user.id, req.user.role)
    if (!hasAccess) {
      return res.status(403).json({ message: 'Forbidden' })
    }
    res.json({ domain })
  } catch (err) {
    next(err)
  }
})

// ─── POST /api/domains ──────────────────────────────────────────────────────
// Add a new custom domain (optionally scoped to a workspace)
router.post('/domains', authenticate, async (req, res, next) => {
  try {
    const { domain, verification_method, team_id } = req.body

    if (!domain || !isValidDomain(domain)) {
      return res.status(400).json({ message: 'Invalid domain format' })
    }

    const normalizedDomain = domain.toLowerCase().trim()

    const exists = await CustomDomainRepo.domainExists(normalizedDomain)
    if (exists) {
      return res.status(409).json({ message: 'Domain already registered' })
    }

    const method = verification_method === 'txt' ? 'txt' : 'cname'
    const newDomain = await CustomDomainRepo.create({
      domain: normalizedDomain,
      userId: req.user.id,
      teamId: team_id ? parseInt(team_id, 10) : null,
      verificationMethod: method,
    })

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
    const hasAccess = await checkDomainAccess(domain, req.user.id, req.user.role)
    if (!hasAccess) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    if (domain.verified_at) {
      return res.json({ verified: true, message: 'Domain already verified', domain })
    }

    const verified = await verifyDns(domain.domain, domain.verification_token, domain.verification_method)

    if (verified) {
      const updated = await CustomDomainRepo.markVerified(domain.id)
      await CustomDomainRepo.updateSslStatus(domain.id, 'provisioning')
      // Simulate SSL provisioning (in production: trigger Let's Encrypt cert manager)
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

// ─── POST /api/domains/:id/health-check ────────────────────────────────────
// Run a health check on a verified domain
router.post('/domains/:id/health-check', authenticate, async (req, res, next) => {
  try {
    const domain = await CustomDomainRepo.findById(req.params.id)
    if (!domain) {
      return res.status(404).json({ message: 'Domain not found' })
    }
    const hasAccess = await checkDomainAccess(domain, req.user.id, req.user.role)
    if (!hasAccess) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    if (!domain.verified_at) {
      return res.status(400).json({ message: 'Domain must be verified before health checks' })
    }

    const health = await checkDomainHealth(domain.domain)
    const status = health.dns && health.https ? 'healthy' : 'unhealthy'

    const updated = await CustomDomainRepo.updateHealthStatus(domain.id, {
      status,
      error: health.error,
      resetFailures: status === 'healthy',
    })

    res.json({
      health: {
        status,
        dns_resolving: health.dns,
        https_reachable: health.https,
        ssl_valid: health.https,
        error: health.error,
        checked_at: updated?.last_health_check_at,
        consecutive_failures: updated?.consecutive_failures || 0,
      },
    })
  } catch (err) {
    next(err)
  }
})

// ─── PATCH /api/domains/:id/branding ────────────────────────────────────────
// Update white-label branding configuration for a domain
router.patch('/domains/:id/branding', authenticate, async (req, res, next) => {
  try {
    const domain = await CustomDomainRepo.findById(req.params.id)
    if (!domain) {
      return res.status(404).json({ message: 'Domain not found' })
    }
    const hasAccess = await checkDomainAccess(domain, req.user.id, req.user.role)
    if (!hasAccess) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    if (!domain.verified_at) {
      return res.status(400).json({ message: 'Domain must be verified before configuring branding' })
    }

    const currentBranding = domain.branding || {}
    const newBranding = validateBranding(req.body.branding || req.body)
    const mergedBranding = { ...currentBranding, ...newBranding }

    const updated = await CustomDomainRepo.updateBranding(domain.id, mergedBranding)
    res.json({ domain: updated })
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/domains/:id/branding ──────────────────────────────────────────
// Get branding configuration for a domain (public — used by redirect pages)
router.get('/domains/:id/branding', async (req, res, next) => {
  try {
    const domain = await CustomDomainRepo.findById(req.params.id)
    if (!domain || !domain.verified_at) {
      return res.status(404).json({ message: 'Domain not found' })
    }
    res.json({ branding: domain.branding || {} })
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/domains/resolve/:hostname ─────────────────────────────────────
// Public endpoint: resolve domain hostname to branding config (for redirect pages)
router.get('/domains/resolve/:hostname', async (req, res, next) => {
  try {
    const domain = await CustomDomainRepo.findByDomain(req.params.hostname.toLowerCase())
    if (!domain) {
      return res.status(404).json({ message: 'Domain not configured' })
    }
    res.json({
      domain_id: domain.id,
      branding: domain.branding || {},
      is_primary: domain.is_primary,
    })
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
    const hasAccess = await checkDomainAccess(domain, req.user.id, req.user.role)
    if (!hasAccess) {
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
    const hasAccess = await checkDomainAccess(domain, req.user.id, req.user.role)
    if (!hasAccess) {
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
    const hasAccess = await checkDomainAccess(domain, req.user.id, req.user.role)
    if (!hasAccess) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    await CustomDomainRepo.delete(domain.id, req.user.id)
    res.status(204).send()
  } catch (err) {
    next(err)
  }
})

module.exports = router
