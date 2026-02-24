/**
 * Programmatic SEO Engine — Configuration
 *
 * Copy this file to config.local.js and customize for your deployment.
 * The generator reads config.local.js first, falling back to config.js.
 */

module.exports = {
  // Your domain (no trailing slash)
  domain: 'https://yourdomain.com',

  // Brand name shown in titles, nav, footer
  brandName: 'Your Brand',

  // URL path prefix for service pages (e.g., /services/city-slug/service-slug/)
  servicesPrefix: '/services',

  // URL path prefix for ecommerce pages (e.g., /ecommerce/city-slug/industry-slug/)
  ecommercePrefix: '/ecommerce',

  // Web3Forms access key for lead capture forms (free at https://web3forms.com)
  // Set to null to disable forms
  web3formsKey: null,

  // Google Tag Manager container ID (e.g., 'GTM-XXXXXXX') — set to null to disable
  gtmId: null,

  // Author / E-E-A-T credentials shown on pages
  author: {
    name: 'Your Name',
    title: 'Your Title',
    company: 'Your Company',
    companyUrl: 'https://yourcompany.com',
    credentials: 'Your credentials and experience.',
    website: 'https://yourwebsite.com',
    twitter: '@yourhandle',
  },

  // Pricing shown on service pages (set to null to hide pricing section)
  pricing: {
    auditLabel: 'Free 30-Day Audit',
    monthlyFee: '$500/month flat',
    details: 'No contract, no percentage of spend.',
  },

  // Tiered indexing: only top metros get "index, follow"
  // Other cities get "noindex, follow" (still accessible as paid landing pages)
  tieredIndexing: true,

  // Max URLs per sitemap file (Google limit is 50,000)
  sitemapMaxUrls: 45000,

  // OG image URL for social sharing
  ogImage: 'https://yourdomain.com/og-image.png',

  // Colors (CSS variables injected into templates)
  theme: {
    bg: '#08080d',
    bg2: '#0e0e16',
    gold: '#f0a830',
    green: '#4ade80',
    blue: '#60a5fa',
    red: '#f87171',
    text: '#c8bfb0',
    text2: '#887766',
    text3: '#665544',
  },
};
