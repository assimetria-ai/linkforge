const express = require('express')
const { formidable } = require('formidable')
const db = require('../../lib/@system/PostgreSQL')
const logger = require('../../lib/@system/Logger')
const { authenticate } = require('../../lib/@system/Helpers/auth')
const BrandRepo = require('../../db/repos/@system/BrandRepo')
const SubscriptionRepo = require('../../db/repos/@system/SubscriptionRepo')

const router = express.Router()

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function getActiveBrand(userId) {
  const user = await db.oneOrNone('SELECT active_brand_id FROM users WHERE id = $1', [userId])
  if (user?.active_brand_id) {
    const brand = await BrandRepo.findById(user.active_brand_id)
    if (brand && brand.user_id === userId) return brand
  }

  const brands = await BrandRepo.findAll({ user_id: userId, limit: 1, offset: 0 })
  return brands[0] ?? null
}

async function parseMultipart(req) {
  const form = formidable({
    multiples: false,
    keepExtensions: true,
  })

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err)
      resolve({ fields, files })
    })
  })
}

router.post('/brands', authenticate, async (req, res, next) => {
  try {
    let payload = req.body || {}

    if (req.headers['content-type']?.includes('multipart/form-data')) {
      const { fields, files } = await parseMultipart(req)
      const logoFile = files.logo
      const uploaded = Array.isArray(logoFile) ? logoFile[0] : logoFile

      payload = {
        ...fields,
        logo_url: uploaded?.originalFilename
          ? `/uploads/logos/${Date.now()}-${uploaded.originalFilename.replace(/\s+/g, '-')}`
          : fields.logo_url,
      }
    }

    const name = String(payload.name || '').trim()
    const description = payload.description ? String(payload.description).trim() : null
    const primaryColor = payload.primary_color || payload.color || '#2563eb'
    const logoUrl = payload.logo_url || payload.logo || null

    if (!name) return res.status(400).json({ message: 'name is required' })

    const baseSlug = slugify(name)
    const existing = await BrandRepo.findBySlug(baseSlug)
    const slug = existing ? `${baseSlug}-${Date.now()}` : baseSlug

    const brand = await BrandRepo.create({
      name,
      slug,
      description,
      primary_color: primaryColor,
      logo_url: logoUrl,
      user_id: req.user.id,
      status: 'active',
    })

    await db.none(
      `UPDATE users
       SET active_brand_id = COALESCE(active_brand_id, $2), updated_at = now()
       WHERE id = $1`,
      [req.user.id, brand.id]
    )

    res.status(201).json(brand)
  } catch (err) {
    next(err)
  }
})

router.get('/brands', authenticate, async (req, res, next) => {
  try {
    const brands = await BrandRepo.findAll({ user_id: req.user.id, limit: 100, offset: 0 })
    const user = await db.oneOrNone('SELECT active_brand_id FROM users WHERE id = $1', [req.user.id])

    const items = brands.map((brand) => ({
      ...brand,
      is_active: user?.active_brand_id === brand.id,
    }))

    res.json(items)
  } catch (err) {
    next(err)
  }
})

router.patch('/brands/:id', authenticate, async (req, res, next) => {
  try {
    const brandId = Number(req.params.id)
    if (!Number.isInteger(brandId)) return res.status(400).json({ message: 'Invalid brand id' })

    const brand = await BrandRepo.findById(brandId)
    if (!brand) return res.status(404).json({ message: 'Brand not found' })
    if (brand.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const updates = {}
    if (req.body.name !== undefined) updates.name = String(req.body.name).trim()
    if (req.body.description !== undefined) updates.description = req.body.description
    if (req.body.primary_color !== undefined) updates.primary_color = req.body.primary_color
    if (req.body.color !== undefined) updates.primary_color = req.body.color
    if (req.body.logo_url !== undefined) updates.logo_url = req.body.logo_url

    const updated = await BrandRepo.update(brandId, updates)
    res.json(updated)
  } catch (err) {
    next(err)
  }
})

router.post('/brands/:id/switch', authenticate, async (req, res, next) => {
  try {
    const brandId = Number(req.params.id)
    if (!Number.isInteger(brandId)) return res.status(400).json({ message: 'Invalid brand id' })

    const brand = await BrandRepo.findById(brandId)
    if (!brand) return res.status(404).json({ message: 'Brand not found' })
    if (brand.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' })
    }

    await db.none('UPDATE users SET active_brand_id = $2, updated_at = now() WHERE id = $1', [req.user.id, brandId])
    res.json({ success: true, active_brand_id: brandId })
  } catch (err) {
    next(err)
  }
})

router.post('/subscriptions', authenticate, async (req, res, next) => {
  try {
    const { brand_id, plan, payment } = req.body || {}
    const validPlans = ['free', 'pro', 'enterprise']

    if (!brand_id) return res.status(400).json({ message: 'brand_id is required' })
    if (!validPlans.includes(plan)) return res.status(400).json({ message: 'plan must be free, pro, or enterprise' })

    const brand = await BrandRepo.findById(Number(brand_id))
    if (!brand || brand.user_id !== req.user.id) return res.status(404).json({ message: 'Brand not found' })

    if (plan !== 'free') {
      if (!payment || !payment.card_number) {
        return res.status(400).json({ message: 'payment is required for paid plans' })
      }
    }

    await db.none(
      `UPDATE subscriptions
       SET status = 'inactive', updated_at = now()
       WHERE user_id = $1 AND brand_id = $2 AND status IN ('active', 'trialing')`,
      [req.user.id, brand.id]
    )

    const priceByPlan = { free: 0, pro: 2900, enterprise: 9900 }
    const subscription = await SubscriptionRepo.create({
      user_id: req.user.id,
      brand_id: brand.id,
      plan,
      status: 'active',
      price: priceByPlan[plan],
      periodicity: 'month',
      payment_provider: plan === 'free' ? 'internal' : 'stripe',
      metadata: {
        source: 'onboarding',
        payment: plan === 'free'
          ? null
          : {
              card_last4: String(payment.card_number).slice(-4),
              expiry: payment.expiry || null,
            },
      },
    })

    await db.none('UPDATE brands SET subscription_id = $2, updated_at = now() WHERE id = $1', [brand.id, subscription.id])

    res.status(201).json(subscription)
  } catch (err) {
    next(err)
  }
})

router.get('/subscriptions', authenticate, async (req, res, next) => {
  try {
    const activeBrand = await getActiveBrand(req.user.id)
    if (!activeBrand) return res.json(null)

    const subscription = await db.oneOrNone(
      `SELECT *
       FROM subscriptions
       WHERE user_id = $1
         AND brand_id = $2
         AND status IN ('active', 'trialing')
       ORDER BY created_at DESC
       LIMIT 1`,
      [req.user.id, activeBrand.id]
    )

    res.json(subscription)
  } catch (err) {
    next(err)
  }
})

router.post('/webhooks/stripe', async (req, res, next) => {
  try {
    const event = req.body || {}
    const eventType = event.type
    const supported = new Set([
      'checkout.session.completed',
      'invoice.paid',
      'customer.subscription.updated',
    ])

    if (!supported.has(eventType)) {
      return res.status(400).json({ message: 'Unsupported event type' })
    }

    logger.info({ eventType, payload: event }, 'mock stripe webhook received')

    const obj = event.data?.object || {}
    const externalId = obj.subscription || obj.id || obj.stripe_subscription_id
    const internalSubscriptionId = obj.metadata?.subscription_id ? Number(obj.metadata.subscription_id) : null
    let subscription = null

    if (internalSubscriptionId) {
      subscription = await SubscriptionRepo.findById(internalSubscriptionId)
    } else if (externalId) {
      subscription = await SubscriptionRepo.findByStripeSubscriptionId(String(externalId))
    }

    if (subscription) {
      if (eventType === 'checkout.session.completed') {
        await SubscriptionRepo.update(subscription.id, { status: 'active' })
      }
      if (eventType === 'invoice.paid') {
        await SubscriptionRepo.update(subscription.id, { status: 'active', last_renew: new Date() })
      }
      if (eventType === 'customer.subscription.updated') {
        const incomingStatus = String(obj.status || 'inactive')
        await SubscriptionRepo.update(subscription.id, { status: incomingStatus })
      }
    }

    res.json({ received: true })
  } catch (err) {
    next(err)
  }
})

router.get('/onboarding/status', authenticate, async (req, res, next) => {
  try {
    const user = await db.one(
      `SELECT onboarding_completed, active_brand_id
       FROM users
       WHERE id = $1`,
      [req.user.id]
    )

    const hasBrand = !!(await getActiveBrand(req.user.id))
    const hasSubscription = hasBrand
      ? !!(await db.oneOrNone(
          `SELECT id
           FROM subscriptions
           WHERE user_id = $1
             AND brand_id = COALESCE($2, brand_id)
             AND status IN ('active', 'trialing')
           ORDER BY created_at DESC
           LIMIT 1`,
          [req.user.id, user.active_brand_id]
        ))
      : false

    res.json({
      completed: Boolean(user.onboarding_completed),
      has_brand: hasBrand,
      has_subscription: hasSubscription,
    })
  } catch (err) {
    next(err)
  }
})

router.patch('/users/me', authenticate, async (req, res, next) => {
  try {
    const { name, email, onboarding_completed, onboarding_data } = req.body || {}
    const sets = []
    const values = [req.user.id]
    let idx = 2

    if (name !== undefined) {
      sets.push(`name = $${idx++}`)
      values.push(String(name).trim())
    }

    if (email !== undefined) {
      const normalizedEmail = String(email).toLowerCase().trim()
      const existing = await db.oneOrNone('SELECT id FROM users WHERE email = $1 AND id <> $2', [normalizedEmail, req.user.id])
      if (existing) return res.status(409).json({ message: 'Email already in use' })
      sets.push(`email = $${idx++}`)
      values.push(normalizedEmail)
    }

    if (onboarding_completed !== undefined) {
      const completed = Boolean(onboarding_completed)
      sets.push(`onboarding_completed = $${idx++}`)
      values.push(completed)
      if (completed) {
        sets.push('onboarding_completed_at = now()')
      }
    }

    if (onboarding_data !== undefined) {
      sets.push(`onboarding_data = $${idx++}::jsonb`)
      values.push(JSON.stringify(onboarding_data || {}))
    }

    if (!sets.length) {
      const current = await db.one(
        `SELECT id, email, name, role, onboarding_completed, onboarding_data, active_brand_id
         FROM users WHERE id = $1`,
        [req.user.id]
      )
      return res.json({ user: current })
    }

    sets.push('updated_at = now()')
    const user = await db.one(
      `UPDATE users
       SET ${sets.join(', ')}
       WHERE id = $1
       RETURNING id, email, name, role, onboarding_completed, onboarding_data, active_brand_id`,
      values
    )

    res.json({ user })
  } catch (err) {
    next(err)
  }
})

router.get('/dashboard', authenticate, async (req, res, next) => {
  try {
    const brand = await getActiveBrand(req.user.id)
    const subscription = brand
      ? await db.oneOrNone(
          `SELECT plan
           FROM subscriptions
           WHERE user_id = $1 AND brand_id = $2 AND status IN ('active', 'trialing')
           ORDER BY created_at DESC
           LIMIT 1`,
          [req.user.id, brand.id]
        )
      : null

    const teamMembersCount = brand
      ? await db.one('SELECT COUNT(*)::int AS count FROM team_invites WHERE brand_id = $1', [brand.id]).then((r) => r.count + 1)
      : 1

    const activity = [
      {
        id: 'act_1',
        type: 'brand.created',
        title: `Brand ${brand?.name || 'workspace'} configured`,
        timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
      },
      {
        id: 'act_2',
        type: 'subscription.active',
        title: `Plan set to ${(subscription?.plan || 'free').toUpperCase()}`,
        timestamp: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
      },
      {
        id: 'act_3',
        type: 'team.invite',
        title: 'Team invitation flow ready',
        timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
      },
    ]

    res.json({
      stats: {
        users: 1,
        revenue: 0,
        plan: subscription?.plan || 'free',
        team_members: teamMembersCount,
      },
      activity,
    })
  } catch (err) {
    next(err)
  }
})

router.post('/teams/invite', authenticate, async (req, res, next) => {
  try {
    const { email, role } = req.body || {}
    const normalizedEmail = String(email || '').toLowerCase().trim()
    const validRoles = ['admin', 'member', 'viewer']

    if (!normalizedEmail) return res.status(400).json({ message: 'email is required' })
    if (!validRoles.includes(role)) return res.status(400).json({ message: 'role must be admin, member, or viewer' })

    const brand = await getActiveBrand(req.user.id)
    if (!brand) return res.status(400).json({ message: 'No active brand selected' })

    const invite = await db.one(
      `INSERT INTO team_invites (brand_id, email, invited_by)
       VALUES ($1, $2, $3)
       RETURNING id, brand_id, email, invited_by, created_at`,
      [brand.id, normalizedEmail, req.user.id]
    )

    res.status(201).json({ ...invite, role })
  } catch (err) {
    next(err)
  }
})

router.get('/teams/members', authenticate, async (req, res, next) => {
  try {
    const brand = await getActiveBrand(req.user.id)
    if (!brand) return res.json([])

    const invites = await db.any(
      `SELECT id, email, invited_by, created_at
       FROM team_invites
       WHERE brand_id = $1
       ORDER BY created_at DESC`,
      [brand.id]
    )

    const members = [
      {
        id: `owner-${req.user.id}`,
        email: req.user.email,
        name: req.user.name || 'Owner',
        role: 'owner',
        status: 'active',
      },
      ...invites.map((invite) => ({
        id: `invite-${invite.id}`,
        email: invite.email,
        role: 'member',
        status: 'pending',
        invited_at: invite.created_at,
      })),
    ]

    res.json(members)
  } catch (err) {
    next(err)
  }
})

module.exports = router
