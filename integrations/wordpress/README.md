# WordPress Integration

Generate programmatic SEO landing pages alongside your WordPress site using either a **reverse proxy** (recommended) or a **WordPress plugin**.

## Option A: Cloudflare Reverse Proxy (Recommended)

This is the same approach as Shopify — Cloudflare sits in front of WordPress and routes specific paths to edge-rendered pages.

### Architecture

```
Customer Request → Cloudflare → [/services/*] → Edge-rendered page (< 50ms)
                              → [everything else] → WordPress origin
```

### Setup

1. **Add your domain to Cloudflare** (free plan works)
2. **Update DNS** to point to your WordPress server through Cloudflare (proxied)
3. **Create a Cloudflare Pages project** with your generated pages
4. **Add Page Rules or Worker Routes**:

```
yourdomain.com/services/*  → Cloudflare Pages project
yourdomain.com/ecommerce/* → Cloudflare Pages project
```

The simplest way is to deploy the generated output as a Cloudflare Pages project, then use Cloudflare Workers to route specific paths.

### Worker Code

```javascript
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Programmatic SEO pages
    if (url.pathname.startsWith('/services/') || url.pathname.startsWith('/ecommerce/')) {
      return env.ASSETS.fetch(request);
    }

    // Sitemaps
    if (url.pathname === '/sitemap-seo.xml' || url.pathname.startsWith('/sitemaps/')) {
      return env.ASSETS.fetch(request);
    }

    // Everything else → WordPress
    return fetch(request);
  },
};
```

---

## Option B: WordPress Plugin

If you can't use Cloudflare, this WordPress plugin renders programmatic pages natively in PHP.

### Install the Plugin

Copy `programmatic-seo.php` to `wp-content/plugins/programmatic-seo/programmatic-seo.php`.

### Activate

1. Go to **WordPress Admin → Plugins**
2. Activate **Programmatic SEO Engine**
3. Go to **Settings → Programmatic SEO** to configure

### Plugin Features

- Renders service and ecommerce pages at WordPress URLs
- Generates XML sitemaps
- Adds pages to Yoast SEO / Rank Math sitemaps
- Uses your WordPress theme's header/footer (optional)
- Caches rendered HTML for performance

### Plugin Code

See `programmatic-seo.php` in this directory.

---

## Option C: Static HTML Generation

Generate static HTML files and upload them to your WordPress server:

```bash
# Generate static HTML files (one per page)
node scripts/generate-static.js --output ./static-pages/

# Upload to WordPress server
rsync -avz ./static-pages/ user@yourserver:/var/www/html/services/
```

Then add Apache/Nginx rewrite rules:

### Apache (.htaccess)

```apache
# Serve static programmatic pages
RewriteEngine On
RewriteCond %{DOCUMENT_ROOT}/services/$1/$2/index.html -f
RewriteRule ^services/([^/]+)/([^/]+)/?$ /services/$1/$2/index.html [L]
```

### Nginx

```nginx
location /services/ {
    try_files $uri $uri/ $uri/index.html =404;
}
```

---

## Sitemap Integration with WordPress

### With Yoast SEO

Add your programmatic sitemap to Yoast's sitemap index. In `functions.php`:

```php
add_filter('wpseo_sitemap_index', function ($sitemap_index) {
    $sitemap_index .= '<sitemap>
        <loc>' . home_url('/sitemaps/sitemap-services-1.xml') . '</loc>
        <lastmod>' . date('Y-m-d') . '</lastmod>
    </sitemap>';
    return $sitemap_index;
});
```

### With Rank Math

```php
add_filter('rank_math/sitemap/index', function ($index) {
    $index[] = [
        'loc' => home_url('/sitemaps/sitemap-services-1.xml'),
        'lastmod' => date('Y-m-d'),
    ];
    return $index;
});
```

### Submit Separately

Or simply submit your programmatic sitemap URL directly in Google Search Console:
```
https://yourdomain.com/sitemap-seo.xml
```

## Internal Linking

Add links from your WordPress content to programmatic pages:

```html
<!-- In a blog post or page -->
<p>Looking for <a href="/services/new-york-ny/plumber/">plumbing services in New York</a>?
See our complete guide to <a href="/ecommerce/new-york-ny/electronics">electronics ecommerce in NYC</a>.</p>
```

For automated internal linking, add a widget or shortcode in your theme:

```php
// In functions.php
function pseo_city_links_shortcode($atts) {
    $service = $atts['service'] ?? 'plumber';
    $cities = ['new-york-ny', 'los-angeles-ca', 'chicago-il', 'dallas-tx', 'houston-tx'];
    $html = '<ul class="pseo-links">';
    foreach ($cities as $city) {
        $name = ucwords(str_replace('-', ' ', explode('-', $city)[0]));
        $html .= "<li><a href=\"/services/{$city}/{$service}/\">{$name}</a></li>";
    }
    $html .= '</ul>';
    return $html;
}
add_shortcode('city_links', 'pseo_city_links_shortcode');
```

Usage: `[city_links service="plumber"]`
