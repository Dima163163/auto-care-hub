# AutoCare Hub Project Context

This is the compact handoff for future Codex sessions. Read `AGENTS.md`, this
file, `ARCHITECTURE.md`, and the active section of `PROJECT_PLAN.md` before
changing the project.

## Current objective

AutoCare Hub is a web-first aggregator for
automotive service businesses and locations. The current task is the first
approved design and mock vertical slice. Replacing the inherited Git metadata
was approved and is complete. No remote addition, commit, push, merge, or
deployment is authorized until the user reviews the local diff.

Git state:

```text
new repository branch: design/autocare-foundation
commits: none
remotes: none
```

The inherited legacy `.git` directory was removed from the active project and
moved to the recoverable archive
`/Users/a1/Desktop/my-projects/AutoCareHub/.legacy-git/legacy-booking.git-2026-08-12`.
The new repository has no `origin`, so it cannot accidentally push to
AutoCare Hub. Do not add a remote until the user provides the new URL and explicitly
approves the reviewed local changes.

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
- Provider participation is free in the initial acquisition phase.
- Later monetization is provider subscriptions for configurable periods.
- Super admin can issue manual subscription/entitlement grants and manage
  subscription promo codes/discounts.
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

- React 19, TypeScript, Vite, React Router, Redux Toolkit/RTK Query, MSW;
- Fastify, TypeScript, PostgreSQL, TypeORM migrations, Zod;
- JWT/refresh sessions, OAuth, CSRF, Redis rate limiting;
- outbox/notifications/email, uploads, audit/security, health/metrics;
- unit/integration/E2E/CI and production runbooks.

Reuse those platform capabilities. Replace the cabinet-rental domain with new
modules for catalog, providers, locations, memberships, vehicles, offerings,
search, automotive bookings, inquiries/messages/quotes, bonuses and provider
subscriptions.

## Legacy conflicts

The copied baseline still implements:

- `Cabinet` and provider-owned free-text `Service`;
- global `owner` assumptions;
- cabinet booking routes/pages/mocks;
- customer booking payments, 2% commission and Stripe Connect;
- legacy translations, assets, seeds, deployment names and docs.

These are current-code facts, not AutoCare product requirements. Do not extend
new AutoCare code through legacy cabinet/payment contracts.

Recommended migration:

1. build the new domain beside reusable platform infrastructure;
2. replace one vertical customer/provider journey at a time;
3. verify real API, mock contract, migrations and tests;
4. remove exact legacy paths only after their replacement is accepted.

If no legacy customer data must be retained, prefer a fresh AutoCare database
and a reviewed baseline/reset strategy. If data must be retained, stop and write
a mapping/backfill ADR first.

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
- Customer repair payments, customer bonuses and provider subscriptions are
  separate bounded contexts.
- Paid subscription status cannot silently change organic search ranking.

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
provider portal, catalog/moderation, super-admin subscription grants/promo
codes, and the remaining loading/empty/error/offline/permission states.

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
attachment metadata. These are not yet wired to production routes or seeded
data.

## Current open decisions

- Exact first Russian pilot city and pilot locations in Spain and
  Moldova/Transnistria.
- Whether legacy customer data must be preserved.
- Bonus model, expiry, cancellation/reversal and manual-grant rules.
- Exact subscription periods, permanent Free plan and grace/downgrade behavior.
- Conversation/photo retention and whether all authenticated customers may
  start a pre-booking inquiry.
- Provider verification documents/badge meaning.
- Public SEO strategy for the current Vite SPA.
- New Git repository URL and visibility/organization.

Do not guess an open decision if it changes schema, legal behavior, money,
privacy, ranking or destructive migration.

## Next approved work sequence

1. User reviews the current local design/mock diff.
2. Resolve remaining Phase 1 product decisions and ADRs.
3. Add the AutoCare API contract and fresh-domain backend migrations.
4. Replace the mock results flow with `/api/v1` search and comparison data.
5. Complete provider profile, booking confirmation, messenger/quote and
   customer/provider workspace mocks.
6. Stabilize the responsive web product before native work.

The mock catalog asset contract is now explicit: `server/src/scripts/seed-autocare-mock-data.ts`
inserts generated provider images when the corresponding public asset exists and
uses the placeholder path otherwise. The frontend `AutoCareImage` component
keeps the same fallback for runtime load failures.

The first public AutoCare API slice is now implemented at `/v1/*` inside the
backend (exposed as `/api/v1/*` through the existing proxy). RTK Query and MSW
use the same typed resources for markets, service definitions, discovery, and
provider profiles, so `VITE_API_MODE=mock` and `VITE_API_MODE=real` share the
same screen-level data flow.

## Identity and legacy naming boundary

- The active workspace is `/Users/a1/Desktop/my-projects/AutoCareHub/autocare-hub`.
- Root package names are `autocare-hub-web` and `autocare-hub-api`.
- Runtime service, cookie, storage, PWA cache, mock-account, and deployment
  namespaces use the AutoCare Hub identity.
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
