/**
 * Programmatic SEO Engine — Configuration for East London Spotlight
 */

module.exports = {
  domain: 'https://EastLondonSpotlight.com',
  brandName: 'East London Spotlight',
  servicesPrefix: '/services',
  ecommercePrefix: '/ecommerce',
  web3formsKey: null, // User prefers Web3Forms but didn't provide a key yet
  gtmId: null,

  author: {
    name: 'Rona Rivera Rahman',
    title: 'Founder & Local Business Promoter',
    company: 'East London Spotlight',
    companyUrl: 'https://EastLondonSpotlight.com',
    credentials: 'Rona Rivera Rahman is the founder of East London Spotlight, a local media and business promotion platform dedicated to supporting small businesses, restaurants, events, and community growth across East London. Born, raised, and working in East London, she is passionate about helping local businesses gain visibility and connect with the right audience.',
    website: 'https://EastLondonSpotlight.com',
    twitter: '@EastLondonSpotlight',
  },

  pricing: {
    auditLabel: 'Get Featured',
    monthlyFee: 'Custom Packages',
    details: 'Contact us for a local visibility plan tailored to your business.',
  },

  tieredIndexing: true,
  sitemapMaxUrls: 45000,
  ogImage: 'https://EastLondonSpotlight.com/og-image.png',

  // Use the new custom East London datasets
  citiesFile: 'data/areas-east-london.json',
  servicesFile: 'data/services-east-london.json',
  industriesFile: 'data/industries-sample.json', 

  theme: {
    bg: '#0B1C2C', // Dark Navy
    bg2: '#07131D', // Darker Navy
    gold: '#F4B400', // Gold Accent
    green: '#4ade80',
    blue: '#60a5fa',
    red: '#E53935', // Red
    text: '#FFFFFF', // White
    text2: '#B0C4DE', // Light Steel Blue for secondary text
    text3: '#8FA1B3', // Slate for tertiary text
  },
};
