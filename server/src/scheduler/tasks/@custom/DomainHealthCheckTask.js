'use strict'

const BaseTask = require('../@system/base/BaseTask')
const CustomDomainRepo = require('../../../db/repos/@custom/CustomDomainRepo')
const dns = require('dns').promises
const https = require('https')
const logger = require('../../../lib/@system/Logger')

/**
 * DomainHealthCheckTask — Periodic health check for verified custom domains
 * Checks DNS resolution and HTTPS reachability every 30 minutes.
 * Logs consecutive failures and marks domains unhealthy after 3+ failures.
 */
class DomainHealthCheckTask extends BaseTask {
  constructor() {
    super({
      name: 'domain-health-check',
      interval: 30 * 60 * 1000, // 30 minutes
      description: 'Checks DNS and HTTPS health for all verified custom domains',
    })
  }

  async checkDomain(domain) {
    const result = { dns: false, https: false, error: null }

    // Check DNS
    try {
      const addresses = await dns.resolve4(domain)
      result.dns = addresses.length > 0
    } catch {
      try {
        await dns.resolveCname(domain)
        result.dns = true
      } catch (err) {
        result.error = `DNS: ${err.code || err.message}`
        return result
      }
    }

    // Check HTTPS
    try {
      await new Promise((resolve, reject) => {
        const req = https.get(`https://${domain}`, { timeout: 10000, rejectUnauthorized: true }, (res) => {
          result.https = true
          res.destroy()
          resolve()
        })
        req.on('error', (err) => {
          result.error = `HTTPS: ${err.message}`
          resolve()
        })
        req.on('timeout', () => {
          result.error = 'HTTPS timeout'
          req.destroy()
          resolve()
        })
      })
    } catch (err) {
      result.error = `HTTPS error: ${err.message}`
    }

    return result
  }

  async run() {
    const domains = await CustomDomainRepo.getDomainsForHealthCheck(30)
    if (domains.length === 0) {
      logger.debug('[DomainHealthCheck] No domains need checking')
      return { checked: 0 }
    }

    logger.info(`[DomainHealthCheck] Checking ${domains.length} domains`)
    let healthy = 0
    let unhealthy = 0

    for (const domain of domains) {
      try {
        const health = await this.checkDomain(domain.domain)
        const status = health.dns && health.https ? 'healthy' : 'unhealthy'

        await CustomDomainRepo.updateHealthStatus(domain.id, {
          status,
          error: health.error,
          resetFailures: status === 'healthy',
        })

        if (status === 'healthy') {
          healthy++
        } else {
          unhealthy++
          // Log warning for domains with consecutive failures
          const newFailures = (domain.consecutive_failures || 0) + 1
          if (newFailures >= 3) {
            logger.warn(`[DomainHealthCheck] ${domain.domain} has ${newFailures} consecutive failures: ${health.error}`)
          }
        }
      } catch (err) {
        logger.error(`[DomainHealthCheck] Error checking ${domain.domain}: ${err.message}`)
      }
    }

    logger.info(`[DomainHealthCheck] Done: ${healthy} healthy, ${unhealthy} unhealthy out of ${domains.length}`)
    return { checked: domains.length, healthy, unhealthy }
  }
}

module.exports = DomainHealthCheckTask
