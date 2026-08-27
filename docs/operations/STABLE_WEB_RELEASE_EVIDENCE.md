# Stable web release evidence

> **Исторический evidence register. Не использовать как единственный release/go-no-go источник.**
>
> Для текущих статусов и незакрытых gates используется
> [`PILOT_100_READINESS_PLAN.md`](PILOT_100_READINESS_PLAN.md). Этот файл хранит
> только доказательства конкретных прошлых запусков.

This is the evidence register for Phase 9 of `PROJECT_PLAN.md`. A repository
check is not a production sign-off: items marked **external** require a named
staging/production environment, participants, or an operational owner.

Use `RELEASE_EVIDENCE_TEMPLATE.md` for each release candidate and attach only
redacted artifacts.

## Repository-complete evidence

- [x] Catalog, supply and reliability aggregate metrics are exposed by the
  admin quality-monitoring response and covered by unit tests.
- [x] Mock and backend API contracts are checked by the existing parity,
  OpenAPI and response-schema scripts.
- [x] `npm run check:staging-api` runs all local compatibility checks. Release
  automation must use `REQUIRE_STAGING_API=true` together with
  `STAGING_API_BASE_URL`; it then fails closed if the staging target is absent
  or incompatible.
- [x] Translation payloads are split by locale; the performance gate measures
  the initial entry, largest route chunk, largest locale chunk, CSS and chunk
  count rather than falsely summing mutually exclusive locales.
- [x] The active Playwright directory contains AutoCare-only release checks;
  cabinet-rental/Bookly browser specs and snapshots are retained under
  `docs/archive/bookly/e2e/`.
- [x] The workspace layout has one page landmark per route and the shared
  light-theme primary/rating tokens meet the intended text contrast target.
- [x] Local Chromium release audit covers maintained responsive widths,
  keyboard operation, burger navigation, Axe accessibility, all supported
  locales and owner workspace privacy controls. See
  `BROWSER_RELEASE_AUDIT_2026-08-25.md`.
- [x] `npm run check:seo` verifies Next.js ISR/static provider prerender
  contracts, rendered-route metadata requirements, JS/CSS budgets and public
  map/image budgets. Production URL HTML and Lighthouse remain external
  evidence gates.

## External sign-off still required

- [ ] Select a launch market and named provider/customer participants; record
  consent, test IDs, dates and support owner using the pilot runbook and the
  release evidence template.
- [ ] Run fixed-price and quote-required customer journeys with real providers;
  attach booking IDs, screenshots and issue outcomes.
- [ ] Export catalog/price review and supply-density observations for the
  selected city; agree thresholds for missing prices, stale offers and zero
  coverage.
- [ ] Measure provider first-response and booking-confirmation SLOs from real
  traffic and record p50/p95, conflict and cancellation rates.
- [ ] Run an independent production security review, a data export/deletion
  rehearsal and a retention purge rehearsal; attach redacted evidence.
- [ ] Capture responsive, keyboard, screen-reader and locale evidence on the
  maintained device matrix.
- [ ] Publish the prerendered route list and record Lighthouse/CrUX, map tile,
  image and video budgets from the production build.
- [ ] Configure alert destinations, verify backups and complete a timed restore
  rehearsal with an owner and incident ticket.
- [ ] Run `REQUIRE_STAGING_API=true STAGING_API_BASE_URL=... npm run
  check:staging-api` against staging and retain the OpenAPI
  hash/compatibility result for the release.

## Release command set

```bash
npm run lint
npm run build
npm run test
npm run check:performance
npm run check:seo
npm run check:production-operations
npm run check:staging-api
# Required in a release job that has staging credentials/network access:
REQUIRE_STAGING_API=true STAGING_API_BASE_URL=https://staging.example.com npm run check:staging-api
npm run test:e2e
npm --prefix server run test:unit
npm --prefix server run build
```

Do not mark the external rows complete from local mocks. The branch may be
reviewed and merged to `dev` only after the repository checks are green; the
production gate remains blocked until the external evidence is attached.
