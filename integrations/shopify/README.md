# Shopify Integration

Generate programmatic SEO landing pages for your Shopify store using Cloudflare Workers as a reverse proxy in front of Shopify.

## Architecture

```
Customer Request → Cloudflare Worker → [/services/*] → Edge-rendered page
                                     → [everything else] → Shopify origin
```

Shopify handles your store. Cloudflare handles the programmatic pages. Same domain, seamless experience.

## Setup (30 minutes)

### 1. Point Your Domain to Cloudflare

If your Shopify store uses a custom domain:

1. Add your domain to Cloudflare (free plan works)
2. Update nameservers at your registrar to Cloudflare's
3. In Cloudflare DNS, add a CNAME record:
   - Name: `@` (or `www`)
   - Target: `shops.myshopify.com`
   - Proxy status: **Proxied** (orange cloud)

### 2. Create a Cloudflare Worker

1. Go to **Cloudflare Dashboard → Workers & Pages → Create**
2. Name it `seo-pages-proxy`
3. Deploy the worker code below

### 3. Worker Code

Create `worker.js`:

```javascript
// Cloudflare Worker: Reverse proxy for programmatic SEO pages
// Routes /services/* and /ecommerce/* to edge-rendered pages
// Everything else passes through to Shopify

const SHOPIFY_ORIGIN = 'your-store.myshopify.com';

// Import your generated edge function
import { onRequest as servicesHandler } from './functions/services/catchall';
import { onRequest as ecommerceHandler } from './functions/ecommerce/catchall';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Route programmatic pages to edge functions
    if (url.pathname.startsWith('/services/')) {
      return servicesHandler({ request, env });
    }
    if (url.pathname.startsWith('/ecommerce/')) {
      return ecommerceHandler({ request, env });
    }

    // Serve sitemap.xml from edge
    if (url.pathname === '/sitemap.xml' || url.pathname.startsWith('/sitemaps/')) {
      return env.ASSETS.fetch(request);
    }

    // Everything else → Shopify
    const shopifyUrl = new URL(url.pathname + url.search, `https://${SHOPIFY_ORIGIN}`);
    const response = await fetch(shopifyUrl.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });

    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  },
};
```

### 4. Add Worker Route

In Cloudflare Dashboard → Workers → Routes:

```
yourdomain.com/services/*  → seo-pages-proxy
yourdomain.com/ecommerce/* → seo-pages-proxy
yourdomain.com/sitemap.xml → seo-pages-proxy
yourdomain.com/sitemaps/*  → seo-pages-proxy
```

### 5. Alternative: Shopify App Proxy

If you prefer not to use Cloudflare as a reverse proxy, you can use Shopify's App Proxy feature:

1. Create a Shopify app (or use a custom app in your store admin)
2. Set up an App Proxy:
   - Subpath prefix: `services`
   - Proxy URL: `https://your-cloudflare-pages-project.pages.dev/services/`
3. This routes `yourdomain.com/services/*` to your Cloudflare Pages project

### 6. Update Config

In `config.js`, set:

```javascript
module.exports = {
  domain: 'https://yourdomain.com',
  brandName: 'Your Shopify Store',
  // ... rest of config
};
```

### 7. Generate and Deploy

```bash
node generate.js
npx wrangler pages deploy . --project-name=my-seo-pages
```

## Linking from Shopify to SEO Pages

Add links in your Shopify theme to your service pages:

### In `theme.liquid` (navigation):

```liquid
<nav>
  {{ content_for_header }}
  <a href="/services/">Services</a>
  <a href="/ecommerce/">Industries</a>
</nav>
```

### In a Shopify page or blog post:

```html
<p>We offer <a href="/services/new-york-ny/plumber/">plumbing services in New York</a>
and <a href="/services/los-angeles-ca/electrician/">electrical services in Los Angeles</a>.</p>
```

## Sitemap Integration

Shopify has its own sitemap at `/sitemap.xml`. Your programmatic pages have a separate sitemap.

**Option A**: Add your sitemap URL to Google Search Console separately.

**Option B**: Use the Worker to merge sitemaps:

```javascript
if (url.pathname === '/sitemap.xml') {
  // Return a sitemap index that references both
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://${url.hostname}/shopify-sitemap.xml</loc></sitemap>
  <sitemap><loc>https://${url.hostname}/sitemaps/sitemap-services-1.xml</loc></sitemap>
</sitemapindex>`;
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' },
  });
}
```

## Important Notes

- Shopify's `robots.txt` is not editable. Submit your sitemap directly in Google Search Console.
- Use consistent internal linking between Shopify pages and programmatic pages for crawl equity.
- Programmatic pages are rendered at the edge (< 50ms) — faster than Shopify's Liquid rendering.
