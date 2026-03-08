# Media Kit Template

This repo is now structured as a reusable static template for influencer media kits.

## Structure

- `index.html`: lightweight shell that loads the client data and renderer
- `data/client.js`: the only file you usually need to edit for a new client
- `scripts/app.js`: renders the page from the client data model
- `styles/site.css`: shared layout, visual system, and print styles
- `images/`: client photos and supporting assets

## Fastest workflow for a new client

1. Replace the images inside `images/`.
2. Edit `data/client.js`.
3. Update:
   - SEO title and description
   - hero name, handle, email, and tagline
   - bio paragraphs
   - metrics and demographic data
   - services and prices
   - brands and footer text
4. Open `index.html` in a browser and print to PDF if needed.

## Content model

`data/client.js` is split into sections:

- `seo`: title, description, preview image, canonical URL
- `analytics`: optional Google tag ID
- `theme`: brand colors for the current client
- `hero`: top-of-page identity and contact actions
- `about`: profile photo, bio, and tags
- `stats`: metrics, demographics, and geography
- `portfolio`: gallery images
- `services`: offer list and pricing
- `brands`: social proof logos as text
- `footer`: CTA and legal copy

## Notes

- Leave `analytics.googleTagId` empty if analytics are not needed.
- If you host the site publicly, set `seo.canonicalUrl`.
- This is still a static site, but it is no longer tied to one creator or one hardcoded HTML file.
