// @system — email API
// GET  /api/email/status  — return current provider and config status (authenticated)
// POST /api/email/test    — send a test email to the authenticated user (authenticated)

const express = require('express')
const router  = express.Router()
const { authenticate } = require('../../lib/@system/Helpers/auth')
const { createLimiter } = require('../../lib/@system/RateLimit')
const logger  = require('../../lib/@system/Logger')
const email   = require('../../lib/@system/Email')

// Rate-limit test sends: 5 per 10 minutes per IP to prevent abuse
const emailTestLimiter = createLimiter({
  windowMs: 10 * 60 * 1000,
  max: 5,
  prefix: 'rl:email-test:',
  message: 'Too many test email requests. Please wait before trying again.',
})

function detectProvider() {
  const explicit = process.env.EMAIL_PROVIDER
  if (explicit) return explicit
  if (process.env.RESEND_API_KEY) return 'resend'
  if (process.env.AWS_ACCESS_KEY_ID && process.env.SES_FROM_EMAIL) return 'ses'
  if (process.env.SMTP_HOST) return 'smtp'
  return 'console'
}

// GET /api/email/status
router.get('/email/status', authenticate, (req, res) => {
  const provider = detectProvider()

  const config = {
    provider,
    from: process.env.EMAIL_FROM || null,
    appName: process.env.APP_NAME || 'App',
    configured: provider !== 'console',
  }

  if (provider === 'resend') {
    config.resendConfigured = !!process.env.RESEND_API_KEY
  }

  if (provider === 'ses') {
    config.region = process.env.AWS_REGION || 'eu-west-1'
    config.sesFrom = process.env.SES_FROM_EMAIL || null
  }

  if (provider === 'smtp') {
    config.smtpHost = process.env.SMTP_HOST || null
    config.smtpPort = process.env.SMTP_PORT || '587'
    config.smtpUser = process.env.SMTP_USER ? '••••••' : null
  }

  res.json(config)
})

// POST /api/email/test
// Sends a test email to the currently authenticated user's address.
router.post('/email/test', emailTestLimiter, authenticate, async (req, res, next) => {
  try {
    const to = req.user?.email
    if (!to) {
      return res.status(400).json({ message: 'No email address on your account.' })
    }

    const provider = detectProvider()
    const appName  = process.env.APP_NAME || 'App'

    await email.send({
      to,
      subject: `Test email from ${appName}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f4f4f5;border-radius:8px;">
          <h2 style="margin:0 0 12px;color:#18181b;font-size:18px;">Email delivery is working</h2>
          <p style="margin:0 0 16px;color:#3f3f46;font-size:14px;line-height:1.6;">
            This test email was sent from <strong>${appName}</strong> using the <strong>${provider}</strong> provider.
          </p>
          <p style="margin:0;color:#71717a;font-size:12px;">
            If you received this, your email system is configured correctly.
          </p>
        </div>
      `,
      text: `Email delivery is working.\n\nThis test was sent from ${appName} using the ${provider} provider.`,
    })

    logger.info({ to, provider, userId: req.user.id }, 'test email sent')
    res.json({ message: `Test email sent to ${to} via ${provider}.`, provider })
  } catch (err) {
    logger.error({ err, userId: req.user?.id }, 'test email failed')
    next(err)
  }
})

module.exports = router
