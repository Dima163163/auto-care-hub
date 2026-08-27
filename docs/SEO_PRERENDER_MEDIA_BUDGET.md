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
Selected public routes and configured provider profiles are generated through
`generateStaticParams` and served with a five-minute ISR window. Unknown
provider ids remain dynamic (`dynamicParams=true`), so adding a provider does
not require a frontend change. Do not introduce browser-only business logic
into the API contract. Validate title, description, canonical, Open Graph and
robots with a production-like preview server.

## Current budget and action

Locale translation payloads are split into per-locale lazy chunks (`popular-*`,
`ru`, `ro`, `european`) and the map/provider route remains lazy. The build gate
therefore checks the initial entry, the largest route chunk, the largest locale
chunk and the largest CSS asset instead of summing every locale that a single
browser never downloads. Full-build raw/gzip totals are still printed for
trend monitoring. Map tiles, provider media and responsive variants remain
lazy, bounded and cached with explicit offline fallbacks. The release check
enforces the current budgets: 600 kB largest JS asset, 5.5 MB total JS,
250 kB largest CSS asset, 350 kB map/location image, 2 MB largest public image
and 7 MB total public raster media. Run `npm run check:seo` after
`npm run build`; pass `--url` against a production deployment to validate
rendered HTML metadata.

`check:seo` intentionally leaves Lighthouse and deployed HTML as manual gates
when no production URL is provided. Use `REQUIRE_PRODUCTION_SEO=true` in the
release environment to fail closed until the Lighthouse JSON report and all
public/provider URLs are captured.
