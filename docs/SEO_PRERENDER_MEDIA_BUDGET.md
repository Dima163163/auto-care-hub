# SEO, prerender and media budget gate

## Public indexing contract

- index only public home, service discovery, provider profiles, platform
  reviews, help and approved information/legal pages;
- keep private cabinets, requests, conversations, admin routes and search
  query states `noindex,follow`;
- emit one canonical URL per locale and preserve locale-independent market
  selection;
- keep `public/robots.txt` and `public/sitemap.xml` synchronized with the
  route inventory.

## Rendering strategy

The Next.js App Router shell now hosts the web release and keeps route-level
metadata/lazy chunks while the React Router feature tree migrates incrementally.
Before launch,
choose either selected static prerender for public routes or an SSR migration;
do not introduce browser-only business logic into the API contract. Validate
title, description, canonical, Open Graph and JSON-LD with a production-like
preview server.

## Current budget and action

Locale translation payloads are split into per-locale lazy chunks (`popular-*`,
`ru`, `ro`, `european`) and the map/provider route remains lazy. The build gate
therefore checks the initial entry, the largest route chunk, the largest locale
chunk and the largest CSS asset instead of summing every locale that a single
browser never downloads. Full-build raw/gzip totals are still printed for
trend monitoring. Map tiles, provider media and responsive variants remain
lazy, bounded and cached with explicit offline fallbacks.
