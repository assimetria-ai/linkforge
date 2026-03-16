import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Loader2, Star, Zap, Building2 } from 'lucide-react'
import { Header } from '../../../components/@system/Header/Header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/@system/Card/Card'
import { Badge } from '../../../components/@system/Badge/Badge'
import { Button } from '../../../components/@system/ui/button'
import { Input } from '../../../components/@system/ui/input'
import { Label } from '../../../components/@system/ui/label'
import { api } from '../../../lib/@system/api'

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    interval: '/mo',
    icon: Zap,
    features: ['Core dashboard', '1 workspace admin', 'Community support'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$29',
    interval: '/mo',
    icon: Star,
    popular: true,
    features: ['Everything in Free', 'Advanced automation', 'Priority support'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$99',
    interval: '/mo',
    icon: Building2,
    features: ['Everything in Pro', 'Custom onboarding', 'Dedicated success manager'],
  },
]

export function PlanSelectionPage() {
  const navigate = useNavigate()
  const [brands, setBrands] = useState([])
  const [loadingPlan, setLoadingPlan] = useState('')
  const [error, setError] = useState('')
  const [payment, setPayment] = useState({
    card_number: '4242 4242 4242 4242',
    expiry: '',
    cvc: '',
  })

  useEffect(() => {
    api.get('/brands').then(setBrands).catch(() => setBrands([]))
  }, [])

  const activeBrand = useMemo(() => brands.find((brand) => brand.is_active) || brands[0] || null, [brands])

  async function handleSubscribe(planId) {
    if (!activeBrand) {
      setError('Create a brand before selecting a plan.')
      return
    }

    setError('')
    setLoadingPlan(planId)

    try {
      if (planId !== 'free') {
        await new Promise((resolve) => setTimeout(resolve, 1200))
      }

      await api.post('/subscriptions', {
        brand_id: activeBrand.id,
        plan: planId,
        payment: planId === 'free' ? undefined : payment,
      })

      navigate('/app/onboarding/setup')
    } catch (err) {
      setError(err.message || 'Failed to create subscription')
    } finally {
      setLoadingPlan('')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12 md:py-16 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Choose your plan</h1>
          <p className="mt-3 text-muted-foreground">Pick a plan for {activeBrand?.name || 'your brand'}.</p>
        </div>

        {error && (
          <div className="mb-6 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {PLANS.map((plan) => {
            const Icon = plan.icon
            const isPaid = plan.id !== 'free'
            const isLoading = loadingPlan === plan.id

            return (
              <Card key={plan.id} className={plan.popular ? 'relative border-primary shadow-md' : ''}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge>Most Popular</Badge>
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                  </div>
                  <CardDescription>
                    <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                    <span className="ml-1 text-muted-foreground">{plan.interval}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <ul className="space-y-2 text-sm">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {isPaid && (
                    <div className="space-y-3 rounded-md border bg-muted/30 p-3">
                      <div className="space-y-1">
                        <Label htmlFor={`card-${plan.id}`}>Card number</Label>
                        <Input
                          id={`card-${plan.id}`}
                          value={payment.card_number}
                          onChange={(e) => setPayment((prev) => ({ ...prev, card_number: e.target.value }))}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label htmlFor={`expiry-${plan.id}`}>Expiry</Label>
                          <Input
                            id={`expiry-${plan.id}`}
                            placeholder="MM/YY"
                            value={payment.expiry}
                            onChange={(e) => setPayment((prev) => ({ ...prev, expiry: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`cvc-${plan.id}`}>CVC</Label>
                          <Input
                            id={`cvc-${plan.id}`}
                            placeholder="CVC"
                            value={payment.cvc}
                            onChange={(e) => setPayment((prev) => ({ ...prev, cvc: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <Button onClick={() => handleSubscribe(plan.id)} disabled={!!loadingPlan} className="w-full">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : isPaid ? 'Subscribe' : 'Start for free'}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </main>
    </div>
  )
}
