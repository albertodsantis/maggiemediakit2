# AGENTS.md

## Project Purpose

This repository contains a reusable static media kit website template for creators/influencers.

The current configured client is Maggie Diaz, but the structure is intended to be reused by replacing content in `data/client.js` and updating the images in `images/`.

## Core Architecture

- `index.html`: minimal document shell that loads fonts, shared CSS, `data/client.js`, and `scripts/app.js`
- `data/client.js`: primary content source for the current client
- `scripts/app.js`: renders the full site from `window.MEDIA_KIT_DATA`
- `styles/site.css`: all layout, visual styling, responsive rules, and print/PDF rules
- `images/`: local client images used in the media kit

There is no build step, framework, or backend. This is a plain static site.

## How To Work On This Repo

- Prefer editing `data/client.js` for content updates instead of hardcoding text in HTML.
- Keep `scripts/app.js` data-driven. New sections should ideally render from the data model.
- Keep `styles/site.css` compatible with both browser viewing and print-to-PDF export.
- Preserve the static-site approach unless there is a strong reason to introduce tooling.

## Preview Workflow

- Fastest preview: open `index.html` in a browser.
- If a local server is needed, use something simple like `python -m http.server 8123` from the repo root.
- When checking layout changes, verify both screen view and print/PDF behavior.

## Content Model Notes

`data/client.js` currently contains:

- `seo`
- `analytics`
- `theme`
- `hero`
- `about`
- `stats`
- `portfolio`
- `services`
- `brands`
- `footer`

For most client updates, `data/client.js` is the only file that should need editing.

## Current Design Decisions

- The site is designed to feel editorial, polished, and premium rather than app-like.
- The page must work as both a web page and a printable A4 PDF.
- `Top Countries` is rendered as a single stacked horizontal bar plus legend.
- `Top Countries` includes `Otros` automatically as the remaining percentage to reach 100.
- `Rango de Edad` is rendered as a proportional treemap/mosaic. Its visible block areas should remain proportional to the percentages.
- Metrics should use concise visual formatting such as `21.8K` instead of long raw counts when that improves consistency.

## Guardrails For Future Changes

- Do not move client content into hardcoded HTML unless absolutely necessary.
- Do not break print styles when changing layout.
- Be careful with spacing, padding, and min-size rules in data visual sections because they can distort perceived proportions.
- Prefer small, reversible changes over broad rewrites.
- If changing section layout, inspect whether the same section also has print-specific overrides later in `styles/site.css`.

## Useful Context For Future Sessions

- This repo is currently tailored to Maggie Diaz's media kit.
- Brand list and audience stats have already been customized for the current client.
- Recent work focused on improving the audience visualizations so they communicate the data more clearly and consistently.
