#!/usr/bin/env node
/**
 * Programmatic SEO Engine — Main Generator
 *
 * Generates Cloudflare Pages Functions and sitemaps from data files.
 * Each function renders landing pages dynamically at the edge — zero origin server needed.
 *
 * Usage:
 *   node generate.js                  # Generate everything
 *   node generate.js --type services  # Services only
 *   node generate.js --type ecommerce # Ecommerce only
 *   node generate.js --count          # Preview page counts without generating
 */

const fs = require('fs');
const path = require('path');

let config;
try {
  config = require('./config.local.js');
} catch {
  config = require('./config.js');
}

const args = process.argv.slice(2);
const countOnly = args.includes('--count');
const typeFilter = args.find((a, i) => args[i - 1] === '--type') || 'all';

const ROOT = __dirname;
const FUNC_DIR = path.join(ROOT, 'functions');
const SITEMAP_DIR = path.join(ROOT, 'sitemaps');

console.log('\n=== Programmatic SEO Engine ===\n');
console.log(`  Domain: ${config.domain}`);
console.log(`  Brand: ${config.brandName}`);

// ─── Load Data ───
const citiesFile = config.citiesFile || 'data/cities-sample.json';
const servicesFile = config.servicesFile || 'data/services-sample.json';
const industriesFile = config.industriesFile || 'data/industries-sample.json';

const cities = JSON.parse(fs.readFileSync(path.join(ROOT, citiesFile), 'utf8'));
const servicesData = JSON.parse(fs.readFileSync(path.join(ROOT, servicesFile), 'utf8'));
const industries = JSON.parse(fs.readFileSync(path.join(ROOT, industriesFile), 'utf8'));

const { services, categories } = servicesData;

console.log(`  Cities: ${cities.length}`);
console.log(`  Services: ${services.length}`);
console.log(`  Industries: ${industries.length}`);

// ─── Build lookup structures ───
const topMetros = new Map();
cities.forEach(c => {
  if (c.population && c.population >= 250000) {
    topMetros.set(c.slug, c.population);
  }
});

// ─── Count pages ───
let servicePages = 0;
let serviceSkipped = 0;
cities.forEach(city => {
  services.forEach(svc => {
    if (svc.stateRestriction && !svc.stateRestriction.includes(city.state)) {
      serviceSkipped++;
      return;
    }
    servicePages++;
  });
});

const ecomPages = cities.length * industries.length;
const totalPages = servicePages + ecomPages;

console.log(`\n  Service pages: ${servicePages.toLocaleString()}`);
if (serviceSkipped) console.log(`  Skipped (state restriction): ${serviceSkipped.toLocaleString()}`);
console.log(`  Ecommerce pages: ${ecomPages.toLocaleString()}`);
console.log(`  Total: ${totalPages.toLocaleString()}`);

if (countOnly) {
  console.log('\n  --count mode, exiting.\n');
  process.exit(0);
}

// ─── Region mapping ───
const STATE_REGIONS = {
  ME:'Northeast',NH:'Northeast',VT:'Northeast',MA:'Northeast',RI:'Northeast',CT:'Northeast',
  NY:'Northeast',NJ:'Northeast',PA:'Northeast',DE:'Northeast',MD:'Northeast',DC:'Northeast',
  VA:'Southeast',WV:'Southeast',NC:'Southeast',SC:'Southeast',GA:'Southeast',FL:'Southeast',
  AL:'Southeast',MS:'Southeast',TN:'Southeast',KY:'Southeast',
  OH:'Midwest',IN:'Midwest',IL:'Midwest',MI:'Midwest',WI:'Midwest',MN:'Midwest',
  IA:'Midwest',MO:'Midwest',ND:'Midwest',SD:'Midwest',NE:'Midwest',KS:'Midwest',
  TX:'Southwest',OK:'Southwest',AR:'Southwest',LA:'Southwest',AZ:'Southwest',NM:'Southwest',
  CO:'Mountain',WY:'Mountain',MT:'Mountain',ID:'Mountain',UT:'Mountain',NV:'Mountain',
  WA:'Pacific',OR:'Pacific',CA:'Pacific',HI:'Pacific',AK:'Pacific'
};

const REGION_TRAITS = {
  Northeast: 'densely competitive market with high CPCs',
  Southeast: 'fast-growing market with increasing digital ad adoption',
  Midwest: 'market where CPCs are lower than coastal cities but competition is rising',
  Southwest: 'rapidly expanding market driven by population growth and relocation',
  West: 'tech-savvy, high-income market where consumers research thoroughly before choosing',
  Mountain: 'emerging market with strong growth potential and less established competition',
  Pacific: 'premium market with sophisticated consumers and high customer lifetime values'
};

// ─── Helper: build compact city data string ───
function buildCityData() {
  return cities.map(c => `${c.slug}|${c.name}|${c.state}`).join('\n');
}

// ─── Helper: GTM snippet ───
function gtmHead() {
  if (!config.gtmId) return '';
  return `<!-- Google Tag Manager --><script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${config.gtmId}');</script><!-- End Google Tag Manager -->`;
}
function gtmBody() {
  if (!config.gtmId) return '';
  return `<!-- Google Tag Manager (noscript) --><noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${config.gtmId}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript><!-- End Google Tag Manager (noscript) -->`;
}

// ─── Helper: form HTML ───
function formHtml(subject, hiddenFields) {
  if (!config.web3formsKey) return '';
  const hiddens = Object.entries(hiddenFields || {})
    .map(([k, v]) => `<input type="hidden" name="${k}" value="${v}">`)
    .join('');
  return `<form id="leadForm">
<input type="hidden" name="access_key" value="${config.web3formsKey}">
<input type="hidden" name="subject" value="${subject}">
<input type="hidden" name="from_name" value="SEO Lead">
${hiddens}
<div class="form-row"><div class="form-group"><label>Name <span class="req">*</span></label><input type="text" name="name" required placeholder="Full name"></div>
<div class="form-group"><label>Email <span class="req">*</span></label><input type="email" name="email" required placeholder="you@company.com"></div></div>
<div class="form-row"><div class="form-group"><label>Phone</label><input type="tel" name="phone" placeholder="(555) 555-5555"></div>
<div class="form-group"><label>Website</label><input type="url" name="website" placeholder="https://"></div></div>
<div class="form-group"><label>Monthly Ad Budget</label><select name="budget"><option value="">Select range...</option><option>Under $1,000</option><option>$1,000 - $5,000</option><option>$5,000 - $10,000</option><option>$10,000 - $25,000</option><option>$25,000+</option></select></div>
<div class="form-group"><label>Tell Us About Your Business</label><textarea name="message" placeholder="What are your biggest advertising challenges?"></textarea></div>
<button type="submit" class="form-submit">Get My Free Strategy →</button>
<p class="form-note">No obligation. We respond to every inquiry.</p>
</form>`;
}

// ═══════════════════════════════════════════════
// SERVICES GENERATOR
// ═══════════════════════════════════════════════
function generateServices() {
  console.log('\n  Generating services edge function...');

  const template = fs.readFileSync(path.join(ROOT, 'templates', 'service-page.html'), 'utf8');
  const cityDataStr = buildCityData();

  const topMetrosJs = `const TOP_METROS = new Map([\n${
    Array.from(topMetros.entries()).map(([slug, pop]) => `  ["${slug}",${pop}]`).join(',\n')
  }\n]);`;

  const funcCode = `// Auto-generated by programmatic-seo-engine — DO NOT EDIT
// ${cities.length} cities × ${services.length} services = ${servicePages.toLocaleString()} pages

const CITIES_RAW = ${JSON.stringify(cityDataStr)};
const SERVICES = ${JSON.stringify(services)};
const CATEGORIES = ${JSON.stringify(categories)};

const CITIES = new Map();
CITIES_RAW.split('\\n').forEach(line => {
  const [slug, name, state] = line.split('|');
  CITIES.set(slug, { name, state });
});

const SERVICE_MAP = new Map();
SERVICES.forEach(s => SERVICE_MAP.set(s.slug, s));

${topMetrosJs}

const CONFIG = ${JSON.stringify({
    domain: config.domain,
    brandName: config.brandName,
    servicesPrefix: config.servicesPrefix,
    author: config.author,
    web3formsKey: config.web3formsKey,
    gtmId: config.gtmId,
    ogImage: config.ogImage,
    tieredIndexing: config.tieredIndexing,
  })};

const TEMPLATE = ${JSON.stringify(template)};

const STATE_REGIONS = ${JSON.stringify(STATE_REGIONS)};
const REGION_TRAITS = ${JSON.stringify(REGION_TRAITS)};

function render(tpl, vars) {
  let out = tpl;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(k).join(v);
  }
  return out;
}

function toLower(name) {
  return name.toLowerCase().replace(/\\s+services?$/i, '').trim();
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const prefix = '${config.servicesPrefix}/';
  const p = url.pathname.replace(new RegExp('^' + prefix.replace(/\\//g, '\\\\/')), '').replace(/\\/$/, '');
  const parts = p.split('/');

  const notFoundHTML = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page Not Found</title><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#08080d;color:#c8bfb0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:20px}h1{font-size:48px;color:#f0a830;margin-bottom:16px}p{color:#887766;margin-bottom:24px;line-height:1.6}a{color:#60a5fa}</style></head><body><div><h1>404</h1><p>This page doesn\\'t exist.</p><p><a href="/">Back to ' + CONFIG.brandName + '</a></p></div></body></html>';

  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return new Response(notFoundHTML, { status: 404, headers: { 'Content-Type': 'text/html;charset=utf-8' } });
  }

  const [citySlug, serviceSlug] = parts;
  const city = CITIES.get(citySlug);
  const service = SERVICE_MAP.get(serviceSlug);

  if (!city || !service) {
    return new Response(notFoundHTML, { status: 404, headers: { 'Content-Type': 'text/html;charset=utf-8' } });
  }

  if (service.stateRestriction && !service.stateRestriction.includes(city.state)) {
    return new Response(notFoundHTML, { status: 404, headers: { 'Content-Type': 'text/html;charset=utf-8' } });
  }

  const cat = CATEGORIES[service.category];
  if (!cat) return new Response(notFoundHTML, { status: 404, headers: { 'Content-Type': 'text/html;charset=utf-8' } });

  const serviceLower = toLower(service.name);
  const region = STATE_REGIONS[city.state] || 'competitive';
  const regionTrait = REGION_TRAITS[region] || 'competitive local market';
  const isIndexed = !CONFIG.tieredIndexing || TOP_METROS.has(citySlug);
  const robotsDirective = isIndexed ? 'index, follow, max-snippet:-1, max-image-preview:large' : 'noindex, follow';

  const narrative = 'After auditing hundreds of ' + serviceLower + ' Google Ads accounts across the ' + region + ', the patterns are consistent: ' + city.name + ' ' + serviceLower + ' businesses waste 25-40% of their ad spend on irrelevant clicks. ' + city.name + ', ' + city.state + ' is a ' + regionTrait + '.';

  const vars = {
    '{{BRAND_NAME}}': CONFIG.brandName,
    '{{DOMAIN}}': CONFIG.domain,
    '{{SERVICE_NAME}}': service.name,
    '{{SERVICE_NAME_LOWER}}': serviceLower,
    '{{SERVICE_SLUG}}': service.slug,
    '{{CITY_NAME}}': city.name,
    '{{CITY_SLUG}}': citySlug,
    '{{STATE_ABBR}}': city.state,
    '{{REGION}}': region,
    '{{ROBOTS_DIRECTIVE}}': robotsDirective,
    '{{SERVICE_PAIN_NARRATIVE}}': narrative,
    '{{PAIN_WASTED_SPEND}}': cat.defaultPains.wasted_spend,
    '{{PAIN_NEGATIVES}}': cat.defaultPains.negatives,
    '{{PAIN_GEO}}': cat.defaultPains.geo,
    '{{PAIN_TRACKING}}': cat.defaultPains.tracking,
    '{{PAIN_SCHEDULING}}': cat.defaultPains.scheduling,
    '{{PAIN_BIDDING}}': cat.defaultPains.bidding,
    '{{CATEGORY_LABEL}}': cat.label,
    '{{CATEGORY_COLOR}}': cat.color,
    '{{AUTHOR_NAME}}': CONFIG.author.name,
    '{{AUTHOR_TITLE}}': CONFIG.author.title,
    '{{AUTHOR_COMPANY}}': CONFIG.author.company,
    '{{AUTHOR_COMPANY_URL}}': CONFIG.author.companyUrl,
    '{{AUTHOR_CREDENTIALS}}': CONFIG.author.credentials,
    '{{OG_IMAGE}}': CONFIG.ogImage,
    '{{GTM_HEAD}}': CONFIG.gtmId ? '<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({"gtm.start":new Date().getTime(),event:"gtm.js"});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!="dataLayer"?"&l="+l:"";j.async=true;j.src="https://www.googletagmanager.com/gtm.js?id="+i+dl;f.parentNode.insertBefore(j,f);})(window,document,"script","dataLayer","' + CONFIG.gtmId + '");</script>' : '',
    '{{GTM_BODY}}': CONFIG.gtmId ? '<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=' + CONFIG.gtmId + '" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>' : '',
    '{{FORM_KEY}}': CONFIG.web3formsKey || '',
  };

  const html = render(TEMPLATE, vars);

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html;charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=604800',
      'X-Robots-Tag': robotsDirective,
    },
  });
}
`;

  fs.mkdirSync(path.join(FUNC_DIR, 'services'), { recursive: true });
  fs.writeFileSync(path.join(FUNC_DIR, 'services', '[[catchall]].js'), funcCode, 'utf8');
  const size = Buffer.byteLength(funcCode, 'utf8');
  console.log(`  ✓ Function: functions/services/[[catchall]].js (${(size / 1024).toFixed(0)}KB)`);

  // Generate sitemaps
  console.log('  Generating service sitemaps...');
  fs.mkdirSync(SITEMAP_DIR, { recursive: true });

  const allUrls = [];
  cities.forEach(city => {
    services.forEach(svc => {
      if (svc.stateRestriction && !svc.stateRestriction.includes(city.state)) return;
      allUrls.push(`${config.domain}${config.servicesPrefix}/${city.slug}/${svc.slug}/`);
    });
  });

  const sitemapFiles = [];
  for (let i = 0; i < allUrls.length; i += config.sitemapMaxUrls) {
    const chunk = allUrls.slice(i, i + config.sitemapMaxUrls);
    const fileIdx = Math.floor(i / config.sitemapMaxUrls) + 1;
    const fname = `sitemap-services-${fileIdx}.xml`;
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${
      chunk.map(u => `  <url><loc>${u}</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>`).join('\n')
    }\n</urlset>`;
    fs.writeFileSync(path.join(SITEMAP_DIR, fname), xml, 'utf8');
    sitemapFiles.push(fname);
  }
  console.log(`  ✓ Sitemaps: ${sitemapFiles.length} files (${allUrls.length.toLocaleString()} URLs)`);
  return sitemapFiles;
}

// ═══════════════════════════════════════════════
// ECOMMERCE GENERATOR
// ═══════════════════════════════════════════════
function generateEcommerce() {
  console.log('\n  Generating ecommerce edge function...');

  const cityDataStr = buildCityData();

  const topMetrosJs = `const TOP_METROS = new Map([\n${
    Array.from(topMetros.entries()).map(([slug, pop]) => `  ["${slug}",${pop}]`).join(',\n')
  }\n]);`;

  const industriesJs = industries.map(ind => {
    return `"${ind.slug}":{n:"${ind.name}",s:"${ind.short}",tx:${ind.taxId},ic:"${ind.icon}",` +
      `sc:"${ind.subcats}",` +
      `sh:${JSON.stringify(ind.shopping)},` +
      `so:${JSON.stringify(ind.social)},` +
      `se:${JSON.stringify(ind.seo)},` +
      `la:${JSON.stringify(ind.landing)},` +
      `sb:${JSON.stringify(ind.smallbiz)},` +
      `gd:${JSON.stringify(ind.geodemand)},` +
      `ti:${JSON.stringify(ind.tips)}}`;
  }).join(',\n');

  const ecomTemplate = fs.readFileSync(path.join(ROOT, 'templates', 'ecommerce-page.html'), 'utf8');

  const funcCode = `// Auto-generated by programmatic-seo-engine — DO NOT EDIT
// ${cities.length} cities × ${industries.length} industries = ${ecomPages.toLocaleString()} pages

const CITIES_RAW = ${JSON.stringify(cityDataStr)};
const INDUSTRIES = {${industriesJs}};

const CITIES = new Map();
CITIES_RAW.split('\\n').forEach(line => {
  const [slug, name, state] = line.split('|');
  CITIES.set(slug, [name, state]);
});

${topMetrosJs}

const CONFIG = ${JSON.stringify({
    domain: config.domain,
    brandName: config.brandName,
    ecommercePrefix: config.ecommercePrefix,
    author: config.author,
    web3formsKey: config.web3formsKey,
    gtmId: config.gtmId,
    ogImage: config.ogImage,
    tieredIndexing: config.tieredIndexing,
  })};

const TEMPLATE = ${JSON.stringify(ecomTemplate)};

function render(tpl, vars) {
  let out = tpl;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(k).join(v || '');
  }
  return out;
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const prefix = '${config.ecommercePrefix}/';
  const p = url.pathname.replace(new RegExp('^' + prefix.replace(/\\//g, '\\\\/')), '').replace(/\\/$/, '');
  const parts = p.split('/');

  if (parts.length !== 2) {
    return new Response('Not Found', { status: 404 });
  }

  const [citySlug, indSlug] = parts;
  const cityData = CITIES.get(citySlug);
  const ind = INDUSTRIES[indSlug];

  if (!cityData || !ind) {
    return new Response('Not Found', { status: 404 });
  }

  const [city, state] = cityData;
  const isIndexed = !CONFIG.tieredIndexing || TOP_METROS.has(citySlug);
  const robotsTag = isIndexed ? '' : '<meta name="robots" content="noindex,follow">';
  const fullCity = city + ', ' + state;

  const vars = {
    '{{BRAND_NAME}}': CONFIG.brandName,
    '{{DOMAIN}}': CONFIG.domain,
    '{{INDUSTRY_NAME}}': ind.n,
    '{{INDUSTRY_SHORT}}': ind.s,
    '{{INDUSTRY_SLUG}}': indSlug,
    '{{INDUSTRY_ICON}}': ind.ic,
    '{{INDUSTRY_SUBCATS}}': ind.sc,
    '{{TAX_ID}}': String(ind.tx),
    '{{CITY_NAME}}': city,
    '{{CITY_SLUG}}': citySlug,
    '{{STATE_ABBR}}': state,
    '{{FULL_CITY}}': fullCity,
    '{{ROBOTS_TAG}}': robotsTag,
    '{{OG_IMAGE}}': CONFIG.ogImage,
    '{{AUTHOR_NAME}}': CONFIG.author.name,
    '{{AUTHOR_TITLE}}': CONFIG.author.title,
    '{{AUTHOR_COMPANY}}': CONFIG.author.company,
    '{{AUTHOR_CREDENTIALS}}': CONFIG.author.credentials,
    '{{FORM_KEY}}': CONFIG.web3formsKey || '',
  };

  const html = render(TEMPLATE, vars);

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html;charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=604800',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
`;

  fs.mkdirSync(path.join(FUNC_DIR, 'ecommerce'), { recursive: true });
  fs.writeFileSync(path.join(FUNC_DIR, 'ecommerce', '[[catchall]].js'), funcCode, 'utf8');
  const size = Buffer.byteLength(funcCode, 'utf8');
  console.log(`  ✓ Function: functions/ecommerce/[[catchall]].js (${(size / 1024).toFixed(0)}KB)`);

  // Generate sitemaps
  console.log('  Generating ecommerce sitemaps...');
  const allUrls = [];
  cities.forEach(city => {
    industries.forEach(ind => {
      allUrls.push(`${config.domain}${config.ecommercePrefix}/${city.slug}/${ind.slug}`);
    });
  });

  const sitemapFiles = [];
  for (let i = 0; i < allUrls.length; i += config.sitemapMaxUrls) {
    const chunk = allUrls.slice(i, i + config.sitemapMaxUrls);
    const fileIdx = Math.floor(i / config.sitemapMaxUrls) + 1;
    const fname = `sitemap-ecommerce-${fileIdx}.xml`;
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${
      chunk.map(u => `  <url><loc>${u}</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>`).join('\n')
    }\n</urlset>`;
    fs.writeFileSync(path.join(SITEMAP_DIR, fname), xml, 'utf8');
    sitemapFiles.push(fname);
  }
  console.log(`  ✓ Sitemaps: ${sitemapFiles.length} files (${allUrls.length.toLocaleString()} URLs)`);
  return sitemapFiles;
}

// ═══════════════════════════════════════════════
// ROOT SITEMAP
// ═══════════════════════════════════════════════
function generateRootSitemap(serviceSitemaps, ecomSitemaps) {
  const today = new Date().toISOString().slice(0, 10);
  const entries = [];

  if (serviceSitemaps.length) {
    entries.push(`\n  <!-- Service Pages (${servicePages.toLocaleString()} pages) -->`);
    serviceSitemaps.forEach(f => {
      entries.push(`  <sitemap><loc>${config.domain}/sitemaps/${f}</loc><lastmod>${today}</lastmod></sitemap>`);
    });
  }
  if (ecomSitemaps.length) {
    entries.push(`\n  <!-- Ecommerce Pages (${ecomPages.toLocaleString()} pages) -->`);
    ecomSitemaps.forEach(f => {
      entries.push(`  <sitemap><loc>${config.domain}/sitemaps/${f}</loc><lastmod>${today}</lastmod></sitemap>`);
    });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}

</sitemapindex>`;

  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml, 'utf8');
  console.log('\n  ✓ Root sitemap.xml updated');
}

// ═══════════════════════════════════════════════
// ROBOTS.TXT
// ═══════════════════════════════════════════════
function generateRobots() {
  const txt = `User-agent: *
Allow: /

Sitemap: ${config.domain}/sitemap.xml
`;
  fs.writeFileSync(path.join(ROOT, 'robots.txt'), txt, 'utf8');
  console.log('  ✓ robots.txt generated');
}

// ═══════════════════════════════════════════════
// RUN
// ═══════════════════════════════════════════════
let svcSitemaps = [];
let ecomSitemaps = [];

if (typeFilter === 'all' || typeFilter === 'services') {
  svcSitemaps = generateServices();
}
if (typeFilter === 'all' || typeFilter === 'ecommerce') {
  ecomSitemaps = generateEcommerce();
}

generateRootSitemap(svcSitemaps, ecomSitemaps);
generateRobots();

console.log(`\n  ✓ Done! Total pages: ${totalPages.toLocaleString()}`);
console.log(`\n  Preview locally:  npm run preview`);
console.log(`  Deploy:           npm run deploy\n`);
