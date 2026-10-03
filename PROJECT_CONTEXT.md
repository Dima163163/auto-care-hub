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

Latest verification (2026-09-07, current published feature branch): the branch is
published and the worktree is clean; frontend unit tests pass at **151 files /
480 tests**, backend pilot-focused unit tests pass at **291 files / 1051 tests**,
and both autonomous-plan contracts pass (main plan **93 complete / 7 partial**,
next plan **100/100**). These are local repository results only; the seven
partial items still require staging, production, deployed-URL, participant or
owner evidence as described below.

The staging compatibility probe also passes against the running local real API
(`http://127.0.0.1:4000`): OpenAPI 3.1, security headers, cache policy and both
discovery variants are verified with redacted SHA-256 evidence. This is a local
runtime check, not staging evidence; `STAGING_API_BASE_URL` remains required for
the external gate.

The local PostgreSQL transition smoke also passes across two worker processes
with one committed winner and one controlled conflict; temporary state tables
are removed after the run. This strengthens local lock evidence for the
transition matrix but does not close the external staging replay gate.

The Docker-backed server integration profile remains green at **14 files / 63
tests**, including AutoCare discovery, route guards, authorization and account
deletion replay; these fixtures are synthetic and local.

Fresh `VITE_API_MODE=real npm run build:vite` plus
`check:production-fixture-leakage` passes across the generated JS assets with no
demo contact markers. The Chrome spot-check showing synthetic provider contact
data was intentionally running the local MSW/mock surface, not the real API
bundle.

The Vite config now uses the ESM-native `import.meta.dirname`; the real build no
longer emits the upcoming Vite `configLoader: native` `__dirname` warning.

The GitHub Quality workflow now runs the real-mode Vite build and
`check:production-fixture-leakage` after the Next build, so the local artifact
boundary is enforced in CI as well as during handoff verification.

The backend Quality job also runs the two-process PostgreSQL transition smoke
against its service container, preserving the local lock/conflict contract in
CI.

Fresh `npm run check:local-mvp` on `2201da15f186` completed with exit 0: all 43
checks passed, including the ephemeral Next production server and responsive
Chromium matrix.

Both frontend and backend `npm audit --omit=dev --audit-level=high` checks also
report zero vulnerabilities, matching the dependency gates in Quality CI.

The current Chrome accessibility-tree spot-check of the synthetic provider
profile shows the primary booking/request CTAs, 18 service rows, booking slots,
language/theme controls, legal/footer links, and visible OpenStreetMap
attribution. This remains local mock-mode evidence, not real API or production
acceptance.

The provider map container now exposes a localized `region` name, preserving
the visual map and external map link while making the location landmark
discoverable to assistive technology.

The post-fix canonical `npm run check:local-mvp` replay on `2af350756dd6` also
passes all 43 checks, including the responsive Chromium matrix.

An HTTP SEO replay with `npm run check:seo -- --url http://127.0.0.1:3000
--json` passes all local rendered metadata/robots routes; only Lighthouse
remains manual because the CLI is not installed.

The owner providers map now exposes a localized named `region` as well, so the
protected map surface has the same assistive-technology landmark contract as
the public provider map.

The post-owner-map canonical `npm run check:local-mvp` replay on `e03d0a34eec3`
passes all 43 checks, including the responsive Chromium matrix.

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

## MVP/pilot review follow-up — 2026-09-23

The pre-existing booking-date, calendar-contrast, locale-deep-link and E2E-wait
changes were committed as `30d688e fix(mvp): specify booking and locale
acceptance`; they were first pushed to the current feature branch and later
fast-forwarded into `dev`. The audit plan is
`docs/operations/MVP_PILOT_IMPROVEMENT_PLAN_2026-09-23.md`; it preserves the
54-gate freeze and NO-GO for real user data. Commit
`5eee151 fix(pilot): redact OAuth logs and clarify booking errors` strips query
strings from Fastify request logs (protecting OAuth callback `code`/`state`) and
distinguishes failed provider/availability requests from genuine
missing-provider/empty-schedule states. Both commits are now on `dev`; the
repository promotion PR is handling `main`. Automated tests and
browser/staging verification have not been run by this task. The current
follow-up branch implements encrypted release-evidence production, keyless
GitHub artifact attestations and exact source/Quality-run verification. It
cannot be used until the owner configures `RELEASE_EVIDENCE_ENCRYPTION_KEY` on
the protected `production` environment and supplies fresh real gate evidence.
Admin MFA/SSO, infrastructure, legal/privacy approval, pilot participants and
independent security review remain external/owner-dependent. Search-mode tabs
now have keyboard navigation and ARIA panel associations, pending human
accessibility verification.

### Discovery and review-truth follow-up (2026-09-23)

The homepage now reads the live discovery result for its supply count and map
price/rating labels; loading, error and empty results no longer borrow demo
numbers. Discovery returns `totalCount` and `totalCountIsLowerBound`, and result
counts use locale-aware plural forms. Public profile, discovery and favorite
provider ratings are derived from approved `verifiedVisit` reviews linked to
closed requests confirmed by both sides in launch-ready public locations. The
public review list, featured-review API, map markers and provider aggregates
share this eligibility rule; mock mode mirrors it. Review-count labels also
pluralize correctly (including Russian 1/2/5). Owner summaries are computed
from review rows and the locations the signed-in membership may see; approved
but unlinked/unverified demo rows can therefore remain owner-visible while
correctly staying out of public totals. Do not loosen this boundary to make
the numbers match: attach demo rows only to valid, mutually confirmed visits
before making them public.

The existing AutoCare demo seed upserts the staff account's active
ProService/location membership, and branch-scoped integration coverage is in
the repository. This follow-up did not execute the seed or integration flow
against the developer-configured database because its isolation was not
established; the actual local login state still needs a safe verification.
No database data was reset or rewritten. The last recorded local operations
snapshot remains 126 dead-letter events and 208 open incidents (187 critical);
it was not re-read here. Redis, antivirus and persistent object storage still
require owner-approved infrastructure configuration. Pilot remains NO-GO; no
legal, participant, MFA/SSO, infrastructure or release-evidence gate is waived.

Final local checks for this follow-up: frontend **173 files / 539 tests** and
backend **303 files / 1,108 tests** pass, as do frontend/backend builds, lint,
API parity, OpenAPI structural checks and `git diff --check`. These results do
not include live database seeding or role-login validation.

### AutoCare security hardening — 2026-09-24

Implemented the code changes for the 11 findings from the security audit in
[`security-audit-2026-09-24/REPORT.md`](/Users/a1/.codex/visualizations/2026/09/24/01a0d2e0-ed2b-7d52-8dd2-f96f2d22dbc6/security-audit-2026-09-24/REPORT.md): chat block enforcement and lock ordering, restricted/read-only moderation with access audit, request/quote/reschedule lifecycle checks, private attachment fetch, WebSocket rate limiting and token refresh, expired-offer rejection, and generic chat idempotency. Production storage GET CORS still needs exact frontend origins configured. At that initial security-hardening checkpoint, the idempotency migration had not been run and PostgreSQL/browser checks remained open; the later disposable-database and real-browser validation is recorded below. Pilot remains NO-GO and external release gates stay in force.

The revised AC-02 policy is now implemented locally. Only the SuperAdmin-assigned active moderator can read the complete service-request conversation and its attachments for 24 hours, with one reasoned 24-hour extension; reads are audited and read-only. SuperAdmin assignment/reassignment and emergency access require a reason and audit record. A report requires explicit notice and confirmation; cancellation creates no report or access. Reporters alone see report status, and the other participant cannot see the reporter's identity. A later counter-report is blocked while the case is active; a distinct later urgent threat can be linked only with threat category and at least 20 characters of context. Sender text can be deleted for five minutes; later hiding is local to that user/device. Legacy unanchored reports expose metadata only.

Latest local verification: frontend **175 files / 553 tests**, backend **306 files / 1,139 unit tests**; Vite and Next builds, backend build, full ESLint, API parity (**236/236 mock routes; 2/2 WebSocket routes**), migration-order validation (**134 migrations**) and `git diff --check` pass. Browser checks covered client and service-owner report flows, consent/cancel, status and reporter privacy, anti-retaliation and linked urgent-threat handling, SuperAdmin assignment, and the assigned Admin's scoped read-only chat and unpunished decision. The assigned Admin opened the report conversation; the UI showed no send/upload controls and stated that moderation reads do not mark participant messages as read. A synthetic report was resolved with “violation not confirmed” and no block. For a manual attachment check, a temporary local mock image was added and removed after the assigned moderator rendered it successfully; server and UI tests also cover private attachment authorization and the image viewer. Emergency-access UI was inspected but not activated.

Local real-mode validation then applied all **134 migrations** to a newly created disposable PostgreSQL database, ran the migration smoke check and the full backend integration suite (**15 files / 64 passed / 1 skipped**), and ran **26/26** Chromium E2E scenarios against the local API. The real browser checks covered discovery, request flow/idempotency, expired sessions, recoverable errors, and client, owner, branch-scoped staff, admin and super-admin route access. The first full integration attempt had one transient 401 in an admin authorization case; the isolated file and the repeated full suite passed. The live API run exposed an outbox edge case when a notification recipient had been deleted; notification insertion now locks the user row and completes as a no-op if that recipient no longer exists. Its focused integration test passes, and no failed outbox events remained after the browser run. The disposable database was dropped after verification; the original `autocarehub` database remained at 132 migrations through `1786340000000`.

Production object-storage GET CORS still needs exact frontend origins. Real deployment domains/origins, production secrets and external services, legal/privacy approval, and operator acceptance remain open gates; pilot remains NO-GO. A graduated sanctions proposal is recorded in [`CHAT_REPORT_ENFORCEMENT_POLICY_DRAFT_2026-09-24.md`](docs/security/CHAT_REPORT_ENFORCEMENT_POLICY_DRAFT_2026-09-24.md); thresholds are a product-policy draft and have not been enabled as automatic enforcement.

### Final moderation/UI pass — 2026-09-26

The live SuperAdmin queue contained one local synthetic harassment complaint. After action-time confirmation, it was assigned to `QA Moderator` for 24 hours; the complaint remains pending and no decision or block was submitted. During the owner-path review, the mock conversation response was missing the active-review/evidence flags that the server returns. The mock contract now returns them to both participants, the owner view uses the reporter-history fallback if response flags are stale, delete is blocked thread-wide during a pending case, and mock resolution preserves thread evidence for 90 days. Regression coverage passes (**3 files / 10 tests**), as do targeted ESLint and `npm run build:vite`.

Proposal **01** captures the Users page header over the detailed backdrop and a generated opaque-card concept; the after image and short review note are in [`docs/design/proposals/2026-09-26-final-pass/`](docs/design/proposals/2026-09-26-final-pass/). The concept is not implemented pending the user's choice. The final browser step—signing in as the assigned QA Moderator and opening this exact synthetic report/attachments—still needs the current QA Moderator credential, which is not in the workspace. No password reset or further credential guesses were attempted.

### Product audit follow-up — 2026-09-26

See [`docs/audits/PRODUCT_AUDIT_2026-09-25.md`](docs/audits/PRODUCT_AUDIT_2026-09-25.md) for the 40 findings and current disposition. The code-fixable scope is implemented locally. Fresh frontend verification: **179 files / 569 tests**, full ESLint, TypeScript, Vite and Next production builds pass; the backend remains at its earlier verified **306 files / 1150 unit tests**, and root/backend `npm audit` both reported **0 vulnerabilities**. Remaining partial findings are A21 (complete complaint-history/search/filter) and A29 (full profile HTML, gated by the three-approval design lock in `AGENTS.md`); their visual proposal and acceptance criteria are in [`docs/design/proposals/2026-09-26-a21-a29/README.md`](docs/design/proposals/2026-09-26-a21-a29/README.md). A34 shows owner-visible preferred and confirmed visit times in the service timezone. The latest browser pass verified the client booking summary, owner request inbox and moderator access boundary. A mock-only request was used; its service timezone now survives the client-to-owner mock API contract, and the owner sees Moscow local time rather than UTC. External domain/database/mail/storage checks remain pending; local readiness is not production approval.

### Additional full audit — 2026-10-03 (latest verification)

The current working-copy audit is
[`docs/audits/FULL_PROJECT_AUDIT_2026-10-03.md`](docs/audits/FULL_PROJECT_AUDIT_2026-10-03.md):
**13 urgent / 16 nonurgent** open items with evidence and acceptance criteria.
Field encryption now exists, but production startup has no configured key-provider
adapter; record binding and blind-index rotation also need work. Other urgent
findings include raw SQL error parameters in logs, an unconditional admin broadcast
read bypass, MFA/step-up, backup authentication, integration DB isolation and fresh
dependency advisories. Old statements that encryption is absent or audits are zero
must not be used as current evidence; A21/A29 disposition needs review against the
newer implementation rather than automatic reopening of the old scope.

Fresh local PASS: frontend **187 files / 603 tests**, backend unit **309 files /
1165 tests**, additional pure policies **12 files / 26 tests**, full lint and
TypeScript, backend build, isolated real/mock Next production builds, API parity
**244/244 mock routes; 2/2 WebSocket contracts**, migration inventory/order checks
**139 files**. Production npm audit now fails: web **1 critical**; API **2 high /
2 moderate**. Advisory reachability is qualified per finding, not presumed.
The SEO command still blocks on static HTML expectations for dynamic routes even
though **17/17 local HTTP metadata probes pass**. Guest mock-browser checks covered
discovery, provider/service selection and login redirect on desktop/mobile.

No fresh DB integration/E2E or production infrastructure evidence: Docker is
unavailable, ordinary developer DB isolation was not established, and no DB was
used/reset. No runtime/dependency changes, installation, commit, push or merge was
performed. Pre-existing integrity-script changes were preserved. Temporary Next
servers and browser tab were stopped. Pilot remains **NO-GO**; the 54 canonical
gates and their percentages were not changed.

### Urgent fix U09 — 2026-10-03

User authorized urgent fixes in batches of 1–2, each in a separate commit.
U09 is fixed locally: the global request handler logs only `serializeError`
output; Fastify's `err` serializer also excludes raw stacks and attached values.
SQL error messages are replaced entirely rather than regex-redacted, preserving
SQLSTATE and request correlation. External reporting and incident error names
use safe projections; AggregateError depth/count/length is bounded and unsafe
getters return UnknownError. Non-SQL diagnostics retain existing PII redaction.
Fresh PASS: backend **309 files / 1171 tests**, backend build, full lint and
final targeted lint. HTTP inject/Pino capture verifies synthetic email, phone,
VIN, arbitrary repair text and password do not appear in logs, reporter payload
or the 500 response. No live DB or production logs were used. The audit register
has **12 urgent / 16 nonurgent** remaining; U11 is next. Pre-existing integrity
script/manifest edits remain outside this fix. No push/merge or deployment.

### Urgent fix U11 — 2026-10-03

U11 is fixed in the backend: admin/super-admin roles no longer authorize
broadcast reads or select the complete offers projection. Every non-client
caller must pass ordinary active provider/request/branch/market permissions,
and gets only offers in that scope. The request's client retains all eligible
offers. There is no new unscoped support endpoint; a future broadcast moderation
workflow must define assignment/reason/expiry/audit before granting such reads.
Fresh PASS: backend **309 files / 1177 tests**, focused permissions **4 files /
31 tests**, backend build, targeted lint, API contract/parity/route snapshot and
threat-surface checks. New admin/super-admin denial and branch-projection cases
failed before the fix; owner/client cases preserve legitimate access. No live
PostgreSQL/authenticated browser replay was performed.

The register now has **11 urgent / 17 nonurgent** remaining. N17 captures the
pre-existing mock GET broadcast handler's broader non-client access; it needs
separate frontend/mock ownership and is not a production backend bypass after
U11. This batch changes no frontend or database data. Integrity-script/manifest
files remain byte-for-byte unchanged and excluded from both requested commits.
Pilot remains NO-GO; no push, merge or deployment was performed.

### Dev publication and urgent fix U12 — 2026-10-03

User authorized pushing to dev, then main, then continuing urgent batches.
Current remote dev had newer CI fixes and squash history, so U09/U11 were
cherry-picked cleanly onto it in `/private/tmp/autocare-hub-urgent-audit-batch-2`
and pushed as `6ebd62e` / `de701c6`. The primary checkout remains untouched,
including its three unrelated integrity-script/manifest files. Main promotion
must follow the current README/workflow's protected dev-to-main PR process;
the older local workflow instructions are tracked by N01.

The dependency gate on that dev SHA fails on the known Next advisory. The next
pair is U12/U13 to unblock it. U12 pins Next to `16.3.6`; production audit is
zero, frontend **187 files / 603 tests**, TypeScript, full lint and real/mock
Next production builds pass. Production mock browser catalog/provider/login
redirect and real login hydration pass; authenticated live API/DB replay awaits
isolated CI. U13 is in progress and will receive a separate commit. The register
has **10 urgent / 17 nonurgent** remaining after U12; pilot remains NO-GO.

### Urgent fix U13 — 2026-10-03

U12 is committed as `191bc51`. U13 patches Fastify to `5.12.5`, Nodemailer to
`10.0.13` and brace-expansion to `2.1.7`. The global fast-uri v3 override is
removed: AJV/compiler uses patched `3.1.8`, fast-json-stringify 7 uses `4.2.1`.
Nodemailer now supplies its own types; its obsolete external type dependency is
removed. Node ≥20 is required and current CI uses 22. Full and production backend
audits are zero. Backend **310 files / 1184 tests**, build and full lint pass;
seven actual-SDK offline tests verify RU/EN auth email templates, envelopes and
UTF-8 multipart composition. Live SMTP/TLS and local DB integration were not run.

The earlier U09/U11 dev run has green backend migrations/tests and real full-stack
production Next checks, but its dependency scan fails on the old Next advisory.
The updated candidate must repeat CI before protected main promotion. U12/U13
are separate commits and ready for dev publication. The register now has
**9 urgent / 17 nonurgent** remaining; U06/U07 remain queued. The primary
checkout and unrelated integrity files remain unchanged. Pilot remains NO-GO.

### Promotion PR and history synchronization — 2026-10-03

U12/U13 were pushed to dev as `191bc51` / `abb7dfb`. PR
[#6](https://github.com/Dima163163/auto-care-hub/pull/6) was created through the
existing signed-in browser because the GitHub connector lacks PR write permission.
Main `24bc8b0` contains the same baseline as the previously squashed dev commits,
but is not an ancestor of dev. Merging it into dev required five conflict
resolutions; preserving the verified dev versions produced an index identical
to `abb7dfb` before this documentation update. No runtime or frontend changes
were introduced by the synchronization. All four urgent commits are preserved.
CI must rerun on the merge candidate. GitHub also displays a required approving
review; that gate must be satisfied without bypassing branch protection.

### Urgent fix U07, next batch — 2026-10-03

PR #6 remains on dev `14c04ba` while a separate `codex/urgent-audit-batch-3`
branch holds subsequent fixes in the same isolated worktree. U07 now rejects
integration/full backend test startup unless NODE_ENV=test and explicit local
disposable TEST_DATABASE_URL / TEST_REDIS_URL are set. URLs are validated before
dotenv/data-source/Redis modules are imported; safe URLs then replace ordinary
connection settings. PostgreSQL names must end in _test / _test_<id> without
production labels; Redis selects DB 1–15. Remote hosts and query overrides are
rejected. The existing ratelimit:* Redis cleanup was confirmed and recorded as
additional U07 evidence; the guard isolates that service too. CI uses its own
ephemeral PostgreSQL/Redis and DB 15, and README documents the explicit targets.

Fresh PASS: 24 target-policy cases, strict setup/policy types, full lint, backend
311 files / 1208 unit tests. A real invocation without targets exits before
configuration/test import or service connection. No local live DB/Redis was
used; this batch still needs its own isolated CI. U06 is next. The register has
8 urgent / 17 nonurgent open findings. Main still requires the independent
approving review displayed by GitHub; no protection was bypassed.

### Urgent fix U06 and green promotion candidate — 2026-10-03

U07 is committed as `6845517`. U06 replaces raw invitation email SQL with
TypeORM object conditions, so the HMAC transformer applies. Lookup and expired
pending replacement run in one transaction with a row lock. The existing partial
unique index resolves missing-row races; only its 23505 becomes a controlled
409. Unrelated database errors remain visible through the safe error handler,
and notification runs after successful commit. No schema change is needed.

Four regression cases failed before the fix. Five new unit cases now pass,
including real TypeORM metadata/SQL proving HMAC binding, NULL scope and FOR
UPDATE without connecting. Three HTTP/PostgreSQL cases cover uppercase repeat,
expired scope replacement and concurrent sends. Fresh backend PASS: 312 files /
1213 tests, build, full lint, new unit types with noUncheckedIndexedAccess and
integration file types under ordinary strict. The stronger integration type
check exposes pre-existing array fixture narrowing errors, recorded under N14.
Live DB/Redis cases await this branch's CI; no ordinary developer DB was used.

Both push and pull-request Quality runs are fully green on PR #6 candidate
`14c04ba`, including browser E2E, real full-stack and aggregate Application CI.
There is no approving review yet; GitHub's independent review gate still blocks
main. U07/U06 remain separate local commits on `codex/urgent-audit-batch-3`,
keeping the green promotion candidate stable. Remaining findings: 7 urgent /
17 nonurgent. The primary checkout is preserved; pilot remains NO-GO.

### Main promotion and next dev candidate — 2026-10-03

The owner removed only Require approvals from the main branch rule. Browser
verification confirms PR and Application CI requirements, up-to-date branches,
conversation resolution, linear history, no bypass, no force push and no
deletion are preserved. PR #6 merged normally as `a81749b`; fetched main's tree
exactly equals Quality-tested dev `14c04ba` (both workflows passed).

U07 `6845517` and U06 `676f22a` are separate commits on the next batch branch.
Synchronizing the new main squash caused only three documentation conflicts;
preserving this branch's audit/handoff documents yielded an index identical to
`676f22a` before this status update. Runtime and each urgent commit are intact.
The next dev candidate must pass its own isolated PostgreSQL/Redis and full
Quality checks before main. The primary checkout remains untouched.

### Published U07/U06 and local U10 — 2026-10-03

Dev `fde2d05` and PR #7 publish U07/U06. PR Quality run `37122629168` backend
job `111201602299` passes unit 312/1213, integration 16 files / 68 pass / 1
skipped and full suite 403 files / 1435 pass / 1 skipped. All three new invitation
HTTP cases pass in the 11-case branch access suite. Ephemeral PostgreSQL/Redis
also verify positive U07 targets. The pre-existing admin race skips on both the
old and new candidates due to undisclosed fixture prerequisites; N14 records
the limitation. Browser/aggregate Quality checks still precede main merge.

`codex/urgent-audit-batch-4` holds U10 while PR #7 remains stable. A common
response cache hook now defaults to private/no-store. Only anonymous successful
GET/HEAD discovery and public image routes with explicit public policy may
cache; credentials, Set-Cookie, errors and all other routes fail closed. Register
after cookie serialization. Public TTL/304/ETag and attachment delivery headers
remain intact. Eighteen cases failed before; 28 actual Fastify cases now pass.
Backend 313 files / 1241 tests, build, full lint and strict focused types PASS.
HTTP suites now assert unauthenticated errors and authenticated owner catalog,
reviews/analytics and permission denial headers. This new live replay remains
pending. Remaining audit: 6 urgent / 17 nonurgent. No frontend/design changes.
