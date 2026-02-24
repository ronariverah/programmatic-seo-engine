# Data Files

## Sample Data (included)

- `cities-sample.json` — 30 top US metros (for testing)
- `services-sample.json` — 10 service verticals with pain points and categories
- `industries-sample.json` — 2 ecommerce industries with full content

## Full Data (18,744 cities)

To generate pages for all 18,744 US cities:

1. Download the Google Ads geo targets CSV from:
   https://developers.google.com/google-ads/api/data/geotargets

2. Run the city extraction script:
   ```bash
   node scripts/extract-cities.js path/to/geotargets.csv > data/cities-full.json
   ```

3. Update `config.js` to point to the full data:
   ```js
   citiesFile: 'data/cities-full.json',
   ```

## Adding Your Own Services

Edit `services-sample.json` to add your verticals. Each service needs:

```json
{
  "slug": "url-friendly-name",
  "name": "Display Name",
  "category": "category-key",
  "stateRestriction": null
}
```

Set `stateRestriction` to an array of state abbreviations to limit a service to specific states:
```json
{ "stateRestriction": ["CA", "NY", "TX"] }
```

## Adding Categories

Categories define the pain points and content structure for groups of services:

```json
{
  "category-key": {
    "label": "Display Label",
    "color": "#hexcolor",
    "defaultPains": {
      "wasted_spend": "Pain point about wasted ad spend...",
      "negatives": "Pain point about negative keywords...",
      "geo": "Pain point about geo-targeting...",
      "tracking": "Pain point about conversion tracking...",
      "scheduling": "Pain point about ad scheduling...",
      "bidding": "Pain point about bidding strategy..."
    }
  }
}
```
