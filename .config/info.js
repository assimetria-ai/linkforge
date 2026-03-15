// Central product config — shared source of truth for both client and server
// @system — do not modify this file directly; override values in config/@custom/

let GENERAL_INFO = {
  name: 'Linkforge',
  description: 'Open-source link management for modern marketing teams. Short links, analytics, UTM builder, team workspaces.',
  cta: {
    title: 'Start Today',
    description: 'Join thousands of users transforming their workflow.',
    buttonText: 'Get Started for Free',
  },
  url: 'https://linkforge-production-0c1e.up.railway.app',
  email: 'general@linkforge.io',
  supportEmail: 'support@linkforge.io',
  socials: [],
  theme_color: '#3A8BFD',
  background_color: '#f0f6ff',
  links: {
    faq: 'https://support.linkforge.io',
    refer_and_earn: 'https://linkforge.io/refer-and-earn',
  },
  products: {
    monthly: {
      price: 49,
      description: 'Monthly Subscription',
    },
    yearly: {
      price: 397,
      description: 'Yearly Subscription',
    },
  },
  plans: [
    {
      priceId: 'price_REPLACE_ME',
      price: 49,
      yearlyPrice: 397,
      name: 'Pro',
      description: 'Pro Plan',
      paymentLink: '',
      noAllowedRoutes: [],
    },
  ],
  authMode: 'web2', // Options: 'web2' (email/password) or 'web3' (wallet)
}

module.exports = GENERAL_INFO
