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
in the backend unit profile (**288 files / 1042 tests PASS**); the complete
backend suite is **371 files / 1245 tests PASS**. Canonical V2 gate counts and
external NO-GO conditions are unchanged.

Data-export follow-up (2026-09-06): attachment `objectKey` and content checksum
are omitted from the self-service export; only the distinct export-level
integrity checksum remains. This improves the local V2-SEC-13 contract but does
not replace a deployed ownership/retention rehearsal.

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
