// @custom — Linkforge landing page with product-specific features, pricing, and CTAs
import { Link } from 'react-router-dom'
import { ArrowRight, Check, Link2, BarChart3, Globe, QrCode, LayoutDashboard, Users, Webhook, Tag } from 'lucide-react'
import { Button } from '../../../components/@system/ui/button'
import { Header } from '../../../components/@system/Header/Header'
import { Footer } from '../../../components/@system/Footer/Footer'
import { Card, CardContent } from '../../../components/@system/Card/Card'
import { FeaturesSection } from '../../../components/@system/FeaturesSection'
import { OgMeta } from '../../../components/@system/OgMeta/OgMeta'
import { info } from '../../../../config/@system/info'

const PRODUCT_FEATURES = [
  {
    icon: Link2,
    title: 'Link Shortening',
    description: 'Create short links with custom slugs. Automatic slug generation, bulk creation, expiration dates, password protection, and redirect rules.',
  },
  {
    icon: BarChart3,
    title: 'Click Analytics',
    description: 'Real-time click tracking with geographic breakdown, device/browser/OS detection, referrer attribution, and time-series charts.',
  },
  {
    icon: Globe,
    title: 'Custom Domains',
    description: 'Connect your own domain for branded short links. DNS verification, SSL provisioning, and default domain fallback.',
  },
  {
    icon: QrCode,
    title: 'QR Code Generation',
    description: 'Auto-generate customizable QR codes for each link. Download as PNG/SVG, customize colors and logo overlay.',
  },
  {
    icon: LayoutDashboard,
    title: 'Link Management Dashboard',
    description: 'Central dashboard to view, search, filter, sort, and bulk-manage all links. Tags, folders, favorites, and archive.',
  },
  {
    icon: Users,
    title: 'Team Workspaces',
    description: 'Multi-user workspaces with role-based access. Shared link collections, activity logs, and workspace-level analytics.',
  },
  {
    icon: Webhook,
    title: 'API Access',
    description: 'RESTful API for programmatic link creation, management, and analytics. API keys with scoped permissions and webhook support.',
  },
  {
    icon: Tag,
    title: 'UTM Builder',
    description: 'Build, save, and reuse UTM parameter templates. Auto-append UTM tags to links with preset templates for Google Analytics, Meta Ads, etc.',
  },
]

const PLANS = [
  {
    name: 'Starter',
    price: '$0',
    period: 'forever',
    features: [
      'Up to 100 links',
      'Basic click analytics',
      'QR codes',
      'Community support',
    ],
    cta: 'Get Started Free',
    ctaLink: '/auth?tab=register',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$24',
    period: '/month',
    features: [
      'Unlimited links',
      'Custom domains',
      'Advanced analytics',
      'Team workspaces',
      'UTM builder',
      'API access',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    ctaLink: '/auth?tab=register',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    features: [
      'Everything in Pro',
      'SLA guarantee',
      'Dedicated support',
      'SSO & audit logs',
      'Custom integrations',
    ],
    cta: 'Contact Sales',
    ctaLink: `mailto:${info.supportEmail}`,
    highlighted: false,
  },
]

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <OgMeta
        title={`${info.name} — Links engineered to convert`}
        description="Shorten, brand, and track every link. Custom domains, QR codes, click analytics, UTM builder, and team workspaces — all in one platform."
        url={info.url}
      />
      <Header />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="container mx-auto px-4 py-14 sm:py-20 md:py-28 text-center">
        <div className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs sm:text-sm font-medium text-primary mb-6">
          Link management platform
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight max-w-3xl mx-auto leading-tight">
          Links engineered to convert
        </h1>
        <p className="mt-5 sm:mt-6 text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Shorten, brand, and track every link your team shares. Custom domains, QR codes, click analytics, and UTM builder — all in one platform.
        </p>
        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 max-w-sm sm:max-w-none mx-auto">
          <Link to="/auth?tab=register" className="w-full sm:w-auto">
            <Button size="lg" className="gap-2 w-full sm:w-auto sm:min-w-[200px]">
              Start Shortening Free <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/docs" className="w-full sm:w-auto">
            <Button size="lg" variant="outline" className="w-full sm:w-auto sm:min-w-[200px]">
              API Documentation
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Social Proof ─────────────────────────────────────────────────── */}
      <section className="border-y bg-muted/20">
        <div className="container mx-auto px-4 py-8 sm:py-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-2xl sm:text-3xl font-bold">10M+</div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">Links created</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold">500M+</div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">Clicks tracked</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold">99.99%</div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">Redirect uptime</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold">&lt;50ms</div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">Redirect latency</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <FeaturesSection
        features={PRODUCT_FEATURES}
        heading="Everything you need for link management"
        subheading="From shortening to analytics — a complete link infrastructure for modern teams."
      />

      {/* ── How It Works ─────────────────────────────────────────────────── */}
      <section className="border-t bg-muted/10">
        <div className="container mx-auto px-4 py-12 sm:py-16 md:py-20">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">Create your first link in seconds</h2>
            <p className="mt-2 sm:mt-3 text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
              No setup required. Paste a URL and go.
            </p>
          </div>
          <div className="grid gap-8 sm:gap-10 grid-cols-1 md:grid-cols-3 max-w-4xl mx-auto">
            {[
              { step: '1', title: 'Paste', desc: 'Drop in any long URL. Get a short, branded link instantly with a custom slug or auto-generated one.' },
              { step: '2', title: 'Share', desc: 'Use your branded link anywhere — social, email, print. Generate a QR code with one click.' },
              { step: '3', title: 'Track', desc: 'Watch clicks flow in real-time. See geography, devices, referrers, and campaign performance.' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg">
                  {item.step}
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────── */}
      <section className="container mx-auto px-4 py-12 sm:py-16 md:py-20">
        <div className="text-center mb-8 sm:mb-12 md:mb-14">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">Simple, transparent pricing</h2>
          <p className="mt-2 sm:mt-3 text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            Free to start. Upgrade when you need custom domains and team features.
          </p>
        </div>

        <div className="grid gap-4 sm:gap-6 md:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
          {PLANS.map((plan) => (
            <Card
              key={plan.name}
              className={plan.highlighted ? 'border-primary shadow-lg' : ''}
            >
              <CardContent className="pt-5 sm:pt-6 px-4 sm:px-6 space-y-3 sm:space-y-4">
                {plan.highlighted && (
                  <span className="inline-block rounded-full bg-primary px-2.5 sm:px-3 py-0.5 sm:py-1 text-xs font-medium text-primary-foreground">
                    Most Popular
                  </span>
                )}
                <div>
                  <h3 className="text-base sm:text-lg md:text-xl font-bold">{plan.name}</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl sm:text-3xl md:text-4xl font-bold">{plan.price}</span>
                    {plan.period && (
                      <span className="text-xs sm:text-sm text-muted-foreground">{plan.period}</span>
                    )}
                  </div>
                </div>
                <ul className="space-y-1.5 sm:space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs sm:text-sm">
                      <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                      <span className="leading-relaxed">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link to={plan.ctaLink} className="block">
                  <Button
                    className="w-full"
                    size="default"
                    variant={plan.highlighted ? 'default' : 'outline'}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Footer CTA ───────────────────────────────────────────────────── */}
      <section className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-10 sm:py-14 md:py-16 text-center">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">Ready to level up your links?</h2>
          <p className="mt-2 sm:mt-3 text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            Join thousands of teams already using {info.name} for link management.
          </p>
          <div className="mt-6 sm:mt-7 md:mt-8 flex justify-center">
            <Link to="/auth?tab=register" className="w-full max-w-xs sm:w-auto">
              <Button size="lg" className="gap-2 w-full sm:w-auto sm:min-w-[200px]">
                Create Free Account <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
