#!/usr/bin/env node
/**
 * Extract US cities from Google Ads geo targets CSV.
 *
 * Usage:
 *   node scripts/extract-cities.js path/to/geotargets.csv > data/cities-full.json
 *
 * Download the CSV from:
 *   https://developers.google.com/google-ads/api/data/geotargets
 */

const fs = require('fs');

const csvPath = process.argv[2];
if (!csvPath) {
  console.error('Usage: node scripts/extract-cities.js <path-to-geotargets.csv>');
  console.error('\nDownload from: https://developers.google.com/google-ads/api/data/geotargets');
  process.exit(1);
}

const STATE_ABBR = {
  'Alabama':'AL','Alaska':'AK','Arizona':'AZ','Arkansas':'AR','California':'CA',
  'Colorado':'CO','Connecticut':'CT','Delaware':'DE','District of Columbia':'DC',
  'Florida':'FL','Georgia':'GA','Hawaii':'HI','Idaho':'ID','Illinois':'IL',
  'Indiana':'IN','Iowa':'IA','Kansas':'KS','Kentucky':'KY','Louisiana':'LA',
  'Maine':'ME','Maryland':'MD','Massachusetts':'MA','Michigan':'MI','Minnesota':'MN',
  'Mississippi':'MS','Missouri':'MO','Montana':'MT','Nebraska':'NE','Nevada':'NV',
  'New Hampshire':'NH','New Jersey':'NJ','New Mexico':'NM','New York':'NY',
  'North Carolina':'NC','North Dakota':'ND','Ohio':'OH','Oklahoma':'OK','Oregon':'OR',
  'Pennsylvania':'PA','Rhode Island':'RI','South Carolina':'SC','South Dakota':'SD',
  'Tennessee':'TN','Texas':'TX','Utah':'UT','Vermont':'VT','Virginia':'VA',
  'Washington':'WA','West Virginia':'WV','Wisconsin':'WI','Wyoming':'WY'
};

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const csvRaw = fs.readFileSync(csvPath, 'utf8');
const lines = csvRaw.trim().split('\n').slice(1);

const cityMap = new Map();
lines.forEach(line => {
  const match = line.match(/"([^"]+)"/);
  if (!match) return;
  const parts = match[1].split(',').map(s => s.trim());
  if (parts.length < 2) return;
  const cityName = parts[0];
  const stateFull = parts[parts.length - 1];
  const stateAbbr = STATE_ABBR[stateFull];
  if (!stateAbbr) return;
  const slug = slugify(cityName) + '-' + stateAbbr.toLowerCase();
  if (cityMap.has(slug)) return;
  cityMap.set(slug, { slug, name: cityName, state: stateAbbr, population: null });
});

const cities = Array.from(cityMap.values());
console.log(JSON.stringify(cities, null, 2));
console.error(`Extracted ${cities.length} cities from ${csvPath}`);
