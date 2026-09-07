# AutoCare Hub Project Context

This is the compact handoff for future Codex sessions. Read `AGENTS.md`, this
file, `ARCHITECTURE.md`, and
`docs/operations/PILOT_SCOPE_FREEZE.md` before changing the project.
The freeze v2.0 (05.09.2026) is the sole current release plan. `PROJECT_PLAN.md`
and numbered batch logs are historical; their old commercial phases and
percentages do not define current requirements.

## Final audit handoff — 2026-09-05

Read `docs/operations/FINAL_PROJECT_AUDIT_2026-09-05.md` for findings, exact paths,
acceptance criteria and verification limits. There are 54 fixed V2 gates;
CHANGE-C findings are subtasks, not new denominator entries. Current decision:
NO-GO for real user data; synthetic staging/demo preparation may proceed.

Execution view: `docs/operations/PILOT_TASK_ALLOCATION.md` classifies all 54 IDs
once by urgency and SELF/JOINT/USER. Do not add gates or count CHANGE subtasks
twice. Report cumulative evidenced completion separately from current GO/NO-GO;
regressions block release without erasing history. Necessary work outside scope
uses separate fixed EXT batches; optional features never enter readiness percentages.
This classification closed no product gate. Purchases, account ownership,
participant consent and independent review require the owner or a third party.

Next code work: external staging evidence, applied-migration reconciliation and
manual/legal acceptance; local release provenance, checksums, suspended-provider
policy, truthful pilot metrics and production Next full-stack CI are prepared.
The provider-timezone booking and malformed-date URL slices from the audit are
implemented in the current working tree with regression coverage, but still
need release-candidate replay evidence. The working tree contains accumulated
follow-up work documented below; local PASS must not be attributed to production
or staging evidence.

Autonomous pilot follow-up (2026-09-06): quality metrics now scope catalog and
supply coverage to active providers, locations, definitions and attached offers,
and reject invalid price ranges. Twelve pilot-focused pure suites are included
in the backend unit profile (**290 files / 1049 tests PASS**); the complete
backend suite is now **371 files / 1246 tests PASS**. Canonical V2 gate counts and
external NO-GO conditions are unchanged.

Data-export follow-up (2026-09-06): attachment `objectKey` and content checksum
are omitted from the self-service export; only the distinct export-level
integrity checksum remains. This improves the local V2-SEC-13 contract but does
not replace a deployed ownership/retention rehearsal.

Sensitive self-service data exports now also write the append-only
`user_data_exported` audit action with actor/target/request provenance only;
the audit row never contains export payload, attachment metadata or content.
The local route integration verifies both the no-store response and audit row.

Reliability aggregation follow-up (2026-09-07): provider response samples now
accept only the provider owner or an active membership scoped to the request
location, ignore client/system/revoked/other-branch and pre-request messages,
and select the earliest valid response independently of input ordering. The
full backend suite passes **371 files / 1246 tests**; real pilot SLO evidence
and staging replay remain external gates.

Timezone replay follow-up (2026-09-07): a real Chrome context with
`America/New_York` opened the mock request form for a `Europe/Moscow` provider;
the selected 10:00 service-local slot was submitted as
`2026-09-08T07:00:00.000Z` with HTTP 201. The local browser replay confirms the
CHANGE-C004/C010 contract; staging and production evidence remain external.

Identity replay follow-up (2026-09-07): local browser replay logged out client
Emily, confirmed mock session cleanup, logged in owner Sophia in the same
context, and verified two Back navigations did not restore Emily's private
profile. This is local C009 evidence; real API/staging/device replay remains
external.

Bundle follow-up (2026-09-07): explicit Rolldown group priorities restored the
separate Redux/RTK `state-runtime` chunk that the bundle contract expected. Vite
build, bundle-splitting and performance checks pass; deployed artifact/CDN and
Lighthouse evidence remain external.

Runtime boundary follow-up (2026-09-07): Bookly and legacy payment runtime guards,
legacy-file classification, Render production config and fixture-scoped demo reset
all pass. This confirms repository boundaries only; deployed artifact contacts,
images and owner acceptance remain external.

Production fixture boundary follow-up (2026-09-07): neutral service catalog and
preview fixtures were split from mock provider profiles; home, favorites and MSW
consumers no longer pull profile-only contact fixtures. The full generated-asset
scan now finds neither `service@example.com` nor the demo phone marker in the
initial entry or any lazy JS chunk. Deployed artifact inventory and production
release evidence remain external.

Mock E2E follow-up (2026-09-07): after the provider fixture boundary refactor,
the complete mock suite produced 166/168 on its first mobile-inclusive run; both
failures were cold-start readiness timeouts and the exact two tests passed on a
targeted mobile rerun. Treat this as local harness evidence, not a claim of a
single-run 168/168 release result.

Mobile harness follow-up (2026-09-07): gallery hydration and release-audit shell
checks now use bounded route-readiness waits. The exact two mobile scenarios pass
2/2 after the harness-only adjustment; assertions remain strict and do not skip
layout/accessibility checks.

Review-label boundary follow-up (2026-09-07): featured reviews now carry an
API-native `providerName` in real and mock responses. Admin/profile review routes
no longer import mock provider profiles; the full fixture scan covers every JS
asset with no lazy-chunk exception. Frontend tests remain 151/480 and backend
unit profile is 288/1043.

Post-split browser replay (2026-09-07): production Next build passed; the full
mock browser suite produced 167/168 on the first run, with one mobile
Spanish/Romanian long-label cold-start timeout. The exact test passed 1/1 on
rerun; this remains a runner-variance caveat rather than a single-run 168/168
release claim.

Local contract follow-up (2026-09-07): interaction (16 invariants), discovery
form (8 source checks plus 2 tests), PWA update, route inventory (57 constants),
Next runtime/route contracts and repository SEO budgets all pass. Lighthouse and
rendered production HTML remain manual deployed-URL evidence gates.

PWA/visual replay follow-up (2026-09-07): production PWA preview is 12/12 PASS
across desktop/mobile, and visual regression is 18/18 PASS across desktop,
tablet and mobile baselines. These are local browser evidence; real-device AT,
deployed URL and owner sign-off remain external.

Clean browser matrix follow-up (2026-09-07): the mobile long-label audit received
a harness-only 120-second test budget for cold lazy routes. The subsequent full
mock suite completed 168/168 PASS in 15.6 minutes across Chromium, mobile and
tablet; product assertions and design baselines were unchanged.

Canonical local MVP follow-up (2026-09-07): `npm run check:local-mvp` passed all
local checks on commit `59b2675e829c`, including lint/tests/builds, API parity,
migrations, media, backup/restore, security, accessibility, concurrency, SEO and
responsive browser matrix. The worktree is dirty and deployment evidence remains
external, so this does not change the pilot NO-GO decision.

Production readiness follow-up (2026-09-07): local preflight confirms startup,
worker, outbox, backup, alert, rollback and Redis fail-closed contracts. It
remains blocked by missing integration secrets, SMTP, persistent media/S3,
bootstrap admin, staging URL and external smoke/rehearsal evidence; no secrets
were fabricated or written.

Autonomous plan follow-up (2026-09-07): both pilot autonomous-plan contracts
pass; the main 100-item execution plan reports 93 complete and 7 partial, while
the separate strict next-plan reports 100/100 complete. This is intentionally
tracked separately from the 54 canonical gates, which still require staging,
manual, security and real-participant evidence.

Backend unit follow-up (2026-09-07): the server unit profile is freshly green at
288 files / 1043 tests. Redis-unavailable logs are expected fail-closed coverage;
the result does not claim a real two-replica outage or restored production-like
database/media evidence.

Boundary contract follow-up (2026-09-07): security headers, Render production
configuration, fixture-scoped demo reset, Bookly/payment runtime guards and the
legacy cleanup/migration inventory all pass. Historical migrations remain intact;
deployed traffic and independent security review are still external.

Real API/reset follow-up (2026-09-07): demo reset now removes only outbox events
whose payload references the current synthetic user/booking/request IDs or demo
emails. Static reset checks are 4/4, server build and backend unit profile remain
green, and the fresh real API browser replay is 25/25 PASS. The post-replay
window contains only four completed notification events and no new dead-letter
events. A fresh `check:local-mvp` also reports all local checks passed. Readiness
remains 503 because Redis is not configured and 106 historical dead-letter rows
remain; no manual backlog deletion or production GO is claimed.

Dependency-surface follow-up (2026-09-07): build/CLI-only packages moved to
`devDependencies`, `react-router`/Vite were patched, and the obsolete router
transition prop was replaced by supported `useTransitions={false}` in the Vite
and Next entry points. Web and server production audits are both zero, lockfile
dry-run is reproducible, and the fresh local MVP gate is green. Thirteen
dev-only tooling advisories remain without critical severity; this does not
change the external staging/security gates.

Router real-replay follow-up (2026-09-07): the transition compatibility repair
passed targeted logout/owner legacy coverage 3/3 and the final full real API
browser replay 25/25. `/health/ready` remains 503 only because Redis is not
configured and 106 historical dead-letter rows remain; the replay produced no
new dead-letter rows and no manual backlog deletion was performed.

Router guard follow-up (2026-09-07): `check:router-compatibility` and its
negative regression test now enforce the supported transition prop in both
production entrypoints and are part of `check:local-mvp`.

Visual follow-up (2026-09-07): current visual regression is 18/18 PASS across
desktop, tablet and mobile Chromium; baselines are unchanged after the Router
guard. This is local screenshot evidence only, not real-device sign-off.

Request-date follow-up (2026-09-07): real Chromium now covers a malformed
request-date query and passes 1/1; the page remains usable and normalizes the
invalid URL value. The subsequent full real replay is 26/26 PASS; after the
worker interval outbox returned to pending=0 with 106 historical dead letters.
Full booking/timezone and staging evidence remain open.

Performance follow-up (2026-09-07): the frontend performance budget initially
reported 92 JS assets against the existing limit of 90. Vendor splitting was
consolidated without raising the 300 kB chunk limit, and login plus OAuth
callback now share one deferred auth route bundle. The rebuilt artifact is
90/90 JS assets, 152.0 kB entry, 230.0 kB largest non-entry chunk, 75.5 kB
largest locale and 166.3 kB CSS; performance and bundle-splitting contracts
pass. Real browser replay remains 26/26 PASS; deployed CDN/Lighthouse evidence
is still external.

Operations evidence follow-up (2026-09-07): fresh production preflight passes
Docker and all six repository operations contracts, plus the pilot evidence
toolkit and SEO repository contracts. It reports eight missing configuration
gates and six external rehearsal gates. Pilot evidence/metrics commands remain
fail-closed because no anonymized real-pilot source file/rows exist; synthetic
fixtures are not promoted to real evidence. Deployed Lighthouse, rendered HTML,
staging and production credentials remain external.

Pilot evidence tooling follow-up (2026-09-07): server-side evidence validation
now resolves its default relative path from the repository root even when
invoked through `npm --prefix server`, while preserving explicit absolute paths.
The three path-resolution regressions and server build pass; the regression is
now included in the curated backend unit profile, freshly green at 290 files /
1049 tests. The command still fails closed without anonymized real-pilot
JSON/CSV rows, as required.

Docker integration follow-up (2026-09-07): the local synthetic PostgreSQL/Redis
stack is up on ports 5433/6379. Schema check and idempotent migration smoke pass
through migration 216; AutoCare integrity validates 42 critical tables with no
ownership/context violations, and deletion retention finds no completed rows to
check. This is local synthetic evidence only; Redis fail-closed production
rehearsal, S3/SMTP, staging and real pilot journeys remain external.

Redis configuration follow-up (2026-09-07): a process-only synthetic production
configuration with HTTPS loopback origins, S3/ClamAV policy and SMTP-shaped
values passed the Redis probe against local Docker Redis: `status=pass`,
`mode=fail-closed`. No synthetic secrets were persisted; multi-process outage,
reconnect and external worker/alert evidence remain open.

Integration profile follow-up (2026-09-07): the root
`npm run test:server:integration` wrapper now executes the Docker-backed server
profile from the repository root. The fresh run passes **14 test files / 63
tests**, including AutoCare discovery bounds (`limit=51` and `radiusKm=0` return
400); staging, production credentials and real-participant evidence remain
external.

Final local-gate follow-up (2026-09-07): a fresh `npm run check:local-mvp`
completed with **all local MVP checks passed**, including frontend tests, Next
production build, backend build, contracts, security/media/backup checks,
responsive Chromium matrix and SEO/runtime boundaries. This does not change the
canonical pilot NO-GO while external infrastructure and participant evidence are
missing.

Redis multi-process follow-up (2026-09-07): added a root wrapper for the
synthetic limiter smoke. Two separate worker processes sharing one local Redis
bucket produced exactly **1 allowed / 1 denied**, and cleanup left no smoke keys;
the existing two-subscriber realtime smoke also passes. Staging outage/reconnect
and production Redis evidence remain external.

Post-harness local gate follow-up (2026-09-07): a fresh
`npm run check:local-mvp` after the Redis smoke addition passed every local check,
including responsive Chromium. This confirms no local regression, but does not
convert clean-SHA, staging, real-device or owner acceptance gates into local
evidence.

Deletion replay follow-up (2026-09-07): the Docker PostgreSQL retention fixture
now also repeats terminal `Completed` after purge and re-runs all account-deletion
invariants; targeted integration is **1/1 PASS** with zero counters. This is
stronger local idempotency evidence, not a substitute for staging restore/storage
replay or real operational retention evidence.

Provider-review UI follow-up (2026-09-07): review cards use an internal flex
column so the service label and date are consistently anchored to the lower
edge with or without photos. The review-score summary no longer has an
artificial maximum width. This is a presentation-only correction; it does not
change pilot gates, API contracts or production evidence.

Provider-page layout follow-up (2026-09-07): the public provider-page `main`
now uses the public-wide container and gutter tokens already used by the
desktop header. Its content no longer expands to the larger operational layout
width; section and booking component behavior are unchanged.

Map-theme follow-up (2026-09-07): all Leaflet surfaces use the keyless
OpenStreetMap default, keep a one-shot fallback for configured tile failures,
and apply a normal light profile or a moderated night profile to tile pixels
based on the active theme. Markers, controls and booking content remain
outside the tile filter.

Map-attribution follow-up (2026-09-07): results, owner-provider,
provider-location and cabinet Leaflet surfaces now keep the OpenStreetMap
attribution control visible. The control uses a compact light or dark surface
with readable contrast; map zoom controls remain intentionally hidden where
the existing interaction design requires it.

## Current objective

AutoCare Hub is a web-first aggregator for
automotive service businesses and locations. The current task is the approved
AutoCare web vertical slice. Replacing the inherited Git metadata was approved
and is complete. `main` is production and must never receive a push or merge
without explicit user approval. Normal work is performed on `dev` or a feature
branch created from `dev`.

Git state:

```text
active branch: inspect git branch --show-current; the audit uses codex/final-pilot-plan-2026-09-05
production branch: main
remote: origin (GitHub AutoCare Hub repository)
```

The inherited legacy `.git` directory was removed from the active project and
moved to the recoverable archive
`/Users/a1/Desktop/my-projects/AutoCareHub/.legacy-git/legacy-booking.git-2026-08-12`.
Push implementation work to `origin/dev`; only merge or push to `main` after
the user explicitly approves the reviewed commit.

Machine-readable planning maps live under `docs/architecture`: domain model,
phase dependencies, and legacy migration/reuse/deletion gates.

## Confirmed direction

- Product name: AutoCare Hub.
- Responsive browser application first.
- iOS and Android only after the stable-web/mobile-readiness gate.
- Marketplace value: standardized automotive services, geospatial search,
  honest price/inclusion/rating/availability comparison, booking and reviews.
- Complex services use a service-specific inquiry/messenger with private photo
  attachments and versioned provider quotes.
- Providers can offer provider-scoped customer bonuses.
- The platform is free; platform payments, tariffs, subscriptions, commissions,
  payouts and paid promotion are excluded, including from post-pilot backlog.
- Super admin manages markets, trust, moderation, privileged access and security.
- Launch coverage includes Russia (first million-plus city), Spain and
  Moldova/Transnistria; country/city data must be extensible.
- Interface locale is independent of provider location. Priority packs are
  Russian, Spanish, Romanian and English, with extensible world locales.
- The five supplied reference screens are the approved design baseline;
  improvements and implementation are authorized, while logo alternatives are
  proposed for owner selection.
- Booking confirmation is two-sided: provider confirms requested/quoted work;
  customer confirms appointment/terms.
- The first catalog includes all major and minor automotive services with
  service-specific comparison attributes.
- Legacy files may be removed only inside
  `/Users/a1/Desktop/my-projects/AutoCareHub` and only through reviewed,
  validated migration steps.
- User reviews local diff/commit before any push.

## Architecture decision

Do not rewrite the project to the proposed Next.js/FastAPI/Alembic greenfield
stack by default. The real repository already has a mature compatible stack:

- Next.js production shell, React 19, TypeScript, React Router, Redux Toolkit/RTK
  Query, MSW; retained Vite tooling is compatibility, not production acceptance;
- Fastify, TypeScript, PostgreSQL, TypeORM migrations, Zod;
- JWT/refresh sessions, OAuth, CSRF, Redis rate limiting;
- outbox/notifications/email, uploads, audit/security, health/metrics;
- unit/integration/E2E/CI and production runbooks.

Reuse those platform capabilities. Replace the cabinet-rental domain with new
modules for catalog, providers, locations, memberships, vehicles, offerings,
search, automotive bookings, inquiries/messages/quotes and provider-scoped bonuses.

## Legacy conflicts

The copied baseline still implements:

- `Cabinet` and provider-owned free-text `Service`;
- global `owner` assumptions;
- cabinet booking routes/pages/mocks;
- historical customer-booking payment and commission schemas retained only in
  migrations;
- legacy translations, assets, seeds, deployment names and docs.

These are current-code facts, not AutoCare product requirements. Do not extend
new AutoCare code through legacy cabinet/payment contracts.

Recommended migration:

1. build the new domain beside reusable platform infrastructure;
2. replace one vertical customer/provider journey at a time;
3. verify real API, mock contract, migrations and tests;
4. remove exact legacy paths only after their replacement is accepted.

D-002 chose a fresh AutoCare database. This is not permission to reset any live
or shared database. Preserve migration history and audit applied versions before
changes; use isolated disposable databases for reset/seed/rehearsals.

## Product/domain rules

- Platform owns `ServiceCategory` and `ServiceDefinition`.
- Each location owns `ServiceOffering` data against a definition.
- Price types: `FIXED`, `FROM`, `RANGE`, `QUOTE_REQUIRED`.
- Compare only compatible service definitions/schema/vehicle contexts.
- `ServiceProvider` is a business; `ServiceLocation` is a physical search and
  scheduling location.
- Provider access uses `ProviderMembership` with scoped permissions.
- Booking/accepted quote preserves immutable service, price, vehicle, provider,
  timezone and policy snapshots.
- Messages/photos are private and conversation access is participant-scoped.
- Bonus accounts and ledgers are provider-scoped, non-transferable and not cash.
- Repair settlement is directly between customer and provider, outside the
  platform. Provider-scoped bonuses remain non-cash; paid ranking is excluded.

## Design references

Five user-supplied images show intended direction for:

1. homepage search/map/recommendations;
2. search results with list/map and comparison;
3. service-location profile;
4. booking wizard;
5. customer bookings dashboard.

The implementation brief and state contract now live in
`docs/design/autocare-design-brief.md` and
`docs/design/autocare-interaction-state-contract.md`. Missing designs include
the provider profile, vehicle garage, inquiry/chat/photo/quote, bonuses,
provider portal, catalog/moderation and the remaining
loading/empty/error/offline/permission states. Consult the final audit before
treating these older implementation notes as current missing features.

The first AutoCare frontend mock slice now covers `/`, `/services`, and
`/services/:id`. The homepage hero now also includes a self-contained map
preview with approximate roads, search-radius context, provider price markers,
and market-aware currency; this is intentionally a preview, not a substitute
for the geocoded catalog map. The public shell now owns one shared footer and
uses a flex column layout so short pages keep the footer at the viewport bottom;
the desktop header follows the dark navy AutoCare reference direction. The first
homepage implementation now follows the full supplied composition, including
comparison cards, services/locations/partner discovery, process/trust content,
reviews and the mobile-app promotion. The partner banner uses the project asset
`public/images/autocare/partner-handshake.png`, generated specifically for this
layout. The first isolated backend schema slice is in
`server/src/database/migrations/1785700000000-CreateAutoCareCatalogFoundation.ts`
with `autocare_` entities for markets, definitions, providers, locations, and
offerings. A second migration adds service requests, messages and private photo
attachment metadata. The foundation has since been expanded into routed,
seeded AutoCare services with requests, booking snapshots, reviews, bonuses,
membership scopes and moderation evidence.

## Current open decisions

- Exact first Russian pilot city and pilot locations in Spain and
  Moldova/Transnistria.
- Conversation/photo retention and whether all authenticated customers may
  start a pre-booking inquiry.
- Provider verification documents/badge meaning.
- Final legal retention terms and notification wording per launch jurisdiction.

Do not guess an open decision if it changes schema, legal behavior, money,
privacy, ranking or destructive migration.

## Next approved work sequence

1. Resolve CHANGE-C findings and complete local/manual MVP acceptance.
2. Configure synthetic-data staging, private media, SMTP, distributed Redis,
   workers, alerts and encrypted off-site backup/PITR.
3. Run role, concurrency, deletion, restore and rollback rehearsals; obtain
   applicable legal/privacy approval and independent security review.
4. Authorize the exact release for real data only after these gates pass.
5. Run consented pilot journeys and metrics, then obtain written pilot go/no-go.

The mock catalog asset contract is now explicit: `server/src/scripts/seed-autocare-mock-data.ts`
inserts generated provider images when the corresponding public asset exists and
uses the placeholder path otherwise. The frontend `AutoCareImage` component
keeps the same fallback for runtime load failures.

The public AutoCare API is implemented at `/v1/*` inside the backend (exposed
as `/api/v1/*` through the Next.js proxy). RTK Query and MSW use the same typed
resources for markets, service definitions, discovery and provider profiles,
so mock and real mode share the same screen-level data flow.

The results screen keeps the public flex shell and footer in normal document
flow. Provider results now use ordinary client pagination (8 cards per page)
until cursor-backed discovery pagination is wired to the screen; cards are
rendered in normal flow with no artificial virtual spacer rows.
Provider previews and discovery responses also carry `brandSpecializations`
and `isMultibrand`; the brand filter uses stable vehicle-brand codes and keeps
universal multibrand providers in every selected-brand result.

## Current implementation baseline

- Next.js App Router is the production web runtime. The retained Vite command
  is a temporary development compatibility path only and must not be deployed.
- The bonus policy is fixed in `docs/product/BONUS_POLICY.md`: a provider-funded,
  non-cash, provider-scoped ledger supports typed earn/redeem/expire/refund and
  audited adjustments. PostgreSQL concurrency tests protect redemption,
  cancellation refunds and expiry.
- Production media is private by design: S3-compatible storage, quarantine and
  ClamAV are mandatory under production configuration; signed attachment access
  and deletion retention are enforced by the backend. Real credentials and
  operational evidence remain deployment gates.
- Account deletion removes private attachment objects and metadata, automotive
  bonus accounts/ledger, provider memberships and invitations; owned providers
  are suspended/detached for super-admin review.
- Release-mode staging compatibility uses
  `REQUIRE_STAGING_API=true STAGING_API_BASE_URL=… npm run check:staging-api`;
  backups require an encryption password file and external alert routing,
  managed backup storage and restore evidence remain production requirements.

## Identity and legacy naming boundary

- The active workspace is `/Users/a1/Desktop/my-projects/AutoCareHub/autocare-hub`.
- Root package names are `autocare-hub-web` and `autocare-hub-api`.
- Runtime service, cookie, storage, PWA cache, mock-account, and deployment
  namespaces use the AutoCare Hub identity.
- PWA runtime caching is limited to anonymous public AutoCare discovery data
  (`markets`, zones, service definitions, provider search/profile and platform
  reviews); authenticated and mutating requests never enter that cache. The
  production-preview suite verifies this contract offline in desktop and mobile
  Chromium. The retired legacy public cache is removed automatically after an
  app update, without touching private identity-scoped caches.
- Translation bundles are loaded for the active locale only; the production
  entry remains independent from the full world-language catalog and each
  locale family is emitted as a separate deferred chunk. The largest shared
  locale module remains tracked for a later split pass.
- The former Git metadata is recoverable only at
  `/Users/a1/Desktop/my-projects/AutoCareHub/.legacy-git/legacy-booking.git-2026-08-12`.
- `src/pages/cabinets`, `src/entities/cabinet`, `server/src/modules/cabinets`,
  and related booking modules remain a quarantined compatibility layer until
  provider/location/admin replacements and their migration tests are accepted.
  They are not part of the public AutoCare navigation or domain contract.

## Verification expectations

For docs-only work, inspect the full diff and validate internal links/terminology.
For implementation, follow the quality gates in `AGENTS.md` and
`.codex/rules/workflow.md`. Preserve unrelated user changes and always use
explicit `git add <file>` paths.
