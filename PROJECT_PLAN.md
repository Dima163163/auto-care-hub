# AutoCare Hub — Project Plan

> Status: working roadmap for review
>
> Updated: 2026-08-12
>
> Architecture source of truth: `ARCHITECTURE.md`
>
> Git flow: `main` is production; active implementation branch is `dev`

## 1. Purpose of this plan

AutoCare Hub is a web-first aggregator for automotive services: general repair
shops, tire services, oil-change services, diagnostics, detailing, car washes,
body repair, painting, air-conditioning work, and related categories.

The product is being created from a legacy cabinet-booking baseline. This is not
a greenfield repository: the copied project already contains a production-oriented React
frontend, Fastify backend, PostgreSQL migrations, authentication, roles,
bookings, reviews, notifications, audit logs, uploads, CI checks, Redis support,
and operational tooling. The plan therefore separates reusable platform
infrastructure from legacy cabinet-rental and booking-payment domain code.

The delivery order is:

1. approve product and architecture documents;
2. approve the AutoCare Hub design direction and screen mocks;
3. replace the legacy domain with the automotive-service domain;
4. ship and stabilize the responsive web application;
5. activate provider subscriptions only after the free acquisition period is
   understood and billing rules are approved;
6. start iOS and Android only after the mobile-readiness gate passes.

All implementation pushes target `dev` or a feature branch. No push, merge or
deployment to production `main` happens before the user reviews the local
diff/commit and explicitly approves that action.

## 2. Confirmed product decisions

- [x] The product name is AutoCare Hub.
- [x] It is an aggregator of automotive service businesses and locations.
- [x] The first usable product is a responsive browser application.
- [x] Native iOS and Android development starts only after the web product is
  stable and the shared API is ready.
- [x] Customers compare equivalent offers by price, rating, reviews, distance,
  included work, warranty, and availability.
- [x] Providers can communicate with customers about a specific service.
- [x] Customers can attach photos of damage or the vehicle to an inquiry.
- [x] Providers can respond with a detailed estimate/quote.
- [x] Providers can run customer bonus programs.
- [x] Provider access is free during the first acquisition phase.
- [x] Later monetization uses provider subscriptions for configurable periods.
- [x] A super admin can grant subscription access manually.
- [x] A super admin can create subscription promo codes and discounts.
- [x] Native clients must use the same backend domain and versioned API as web.
- [x] Launch coverage includes Russia (first million-plus city), Spain and
  Moldova/Transnistria with a data-driven country/city registry.
- [x] Interface locale is independent from service location; Russian, Spanish,
  Romanian and English are the first maintained packs with an extensible
  world-locale model.
- [x] The five supplied screens are the approved design baseline; improvements
  may be proposed during design work.
- [x] Design implementation is explicitly authorized in the current thread;
  logo alternatives are proposed for owner selection.
- [x] Booking/service confirmation is two-sided: provider confirms the work or
  quote and customer confirms the appointment/terms.
- [x] The initial catalog covers major and minor automotive services through
  moderated definitions and service-specific comparison attributes.
- [x] Repository history and reusable platform infrastructure should be
  preserved where practical.
- [x] Legacy files may be removed inside the AutoCare Hub workspace when a
  reviewed migration step proves they are no longer needed.

## 3. Working assumptions requiring confirmation

These assumptions keep planning unblocked. They are not permission to implement
irreversible product choices.

- Customer payment for repair/service work happens directly with the provider
  in the first release. The platform does not take a repair commission, split
  repair payments, or pay providers.
- Provider subscription billing is separate from customer repair payments.
- The first bonus implementation is provider-funded and provider-scoped. Bonus
  units are not withdrawable platform money and cannot move between providers.
- Messaging requires an authenticated customer account; public visitors may
  browse and compare without signing in.
- The booking model is hybrid: a provider can offer instant slots for a
  standardized offer or require confirmation/quote for complex work.
- A fresh AutoCare Hub database is preferred over importing AutoCare Hub cabinet
  data. If legacy data must be preserved, a separate backfill plan is required.
- The existing React/Vite and Fastify/TypeScript stack remains the baseline.
  Rewriting to Next.js/FastAPI is not justified by the current requirements.
- Russian is a launch language; country, first city, currency, legal entity,
  and additional launch languages remain open.

## 4. Current repository audit

### 4.1 Reuse as platform foundation

- [x] React 19, TypeScript, Vite, React Router, Redux Toolkit/RTK Query.
- [x] Responsive layouts, custom i18n, light/dark themes, PWA support.
- [x] Fastify, TypeScript, PostgreSQL, TypeORM migrations, Zod validation.
- [x] Email/password and Google/Yandex authentication foundations.
- [x] JWT access tokens, refresh sessions, CSRF protections, role guards.
- [x] Super-admin role, admin safeguards, audit logs, security center.
- [x] Redis-backed distributed rate-limit support.
- [x] Transactional outbox, notification and email foundations.
- [x] Media validation/re-encoding patterns using `sharp`.
- [x] Health/readiness endpoints, metrics, structured logging, incident tools.
- [x] Unit/integration/E2E foundations, OpenAPI foundation, CI quality gates.
- [x] Booking concurrency, schedule, reschedule, review and moderation patterns.

### 4.2 Replace or redesign

- [ ] `Cabinet` domain -> `ServiceProvider` + `ServiceLocation`.
- [ ] Provider-owned free-text `Service` -> platform `ServiceDefinition` plus
  provider `ServiceOffering`.
- [ ] Hourly cabinet price -> automotive price types and explicit inclusions.
- [ ] Cabinet owner role assumptions -> provider memberships and location roles.
- [ ] Cabinet search -> vehicle-aware geospatial offering search.
- [ ] Cabinet details -> service-location public profile.
- [ ] Existing booking snapshot -> immutable offer/quote snapshot.
- [ ] Existing cabinet uploads -> provider, location, inquiry, and message media.
- [ ] Existing generic favorites -> favorite providers/locations/offerings.
- [ ] Legacy mock data, translations, route names, tests, and assets.

### 4.3 Quarantine and later remove

The copied project contains commission and Stripe Connect flows for customer
booking payments. They conflict with the current AutoCare Hub monetization
direction.

- [ ] Stop exposing legacy repair-payment/commission UI in the AutoCare product.
- [ ] Prevent new AutoCare domain code from depending on legacy payment entities.
- [ ] Preserve only provider-agnostic reliability patterns that are useful for
  future subscription billing: webhook verification, idempotency,
  reconciliation, audit, and provider timeouts.
- [ ] Remove legacy booking-payment entities, migrations, routes, translations,
  tests, and Stripe Connect code only after the AutoCare schema and test gates
  are green.
- [ ] Record removed paths and migration consequences in the reviewed commit.

## 5. Product roles and workspaces

### Guest

- Browse catalog, search, compare and read public reviews.
- View provider and service-location pages.
- Must sign in to message, book, save a vehicle/favorite, or leave a review.

### Client

- Manage profile, vehicles, favorites and notification preferences.
- Create inquiries and attach photos.
- Receive and accept/decline provider quotes.
- Book, cancel or request rescheduling according to policy.
- View conversations, quotes, bookings, bonuses and history.
- Leave one verified review for an eligible completed booking.

### Provider owner

- Own/manage a provider organization and its locations.
- Manage memberships, profiles, opening hours and media.
- Select platform service definitions and configure offerings.
- Manage inquiries, messages, quotes and bookings.
- Configure provider-scoped bonus programs.
- View operational and subscription status.

### Provider manager/staff

- Receive permissions through provider membership, not a global platform role.
- Access only assigned provider/locations and allowed actions.
- Permission examples: manage profile, offerings, schedule, inquiries,
  bookings, bonuses, team, or billing.

### Moderator/admin

- Manage catalog and provider verification/moderation.
- Moderate reviews, reports and prohibited media/content.
- View operational audit data allowed by role.
- Cannot manage super admins or platform-owner-only billing settings.

### Super admin

- All administrative safeguards plus platform-owner capabilities.
- Manage admins and critical configuration.
- Manage subscription plans/prices after monetization approval.
- Grant/revoke time-bounded provider entitlements with reason and audit trail.
- Create, pause and revoke subscription promo codes.
- Review promo redemptions and billing incidents.
- Must not read private conversations by default; exceptional access requires a
  support/moderation reason and audit event.

## 6. Web MVP scope

### Customer journey

- [ ] Choose a standardized service.
- [ ] Optionally choose/save a vehicle.
- [ ] Set location or use consented geolocation and search radius.
- [ ] See list and map results from the same query.
- [ ] Filter/sort by relevant attributes.
- [ ] Select 2–4 equivalent offers for side-by-side comparison.
- [ ] Open a provider/service-location page.
- [ ] Book an available slot or start an inquiry for a quote.
- [ ] Exchange messages and photos for the selected service.
- [ ] Receive, accept or decline a versioned quote.
- [ ] View booking/conversation status and notifications.
- [ ] Complete the visit and leave a verified review.
- [ ] See provider bonus balance and immutable bonus history.

### Provider journey

- [ ] Apply as a provider and pass moderation.
- [ ] Create organization and one or more service locations.
- [ ] Invite staff with scoped permissions.
- [ ] Configure hours, blocked periods and booking mode.
- [ ] Activate standardized offerings with comparable price data.
- [ ] Handle inquiries, photos, messages and quotes.
- [ ] Confirm/decline/reschedule/complete bookings.
- [ ] Respond to reviews when policy permits.
- [ ] Configure the initial simple bonus program.
- [ ] See acquisition/booking/response metrics that demonstrate platform value.

### Admin journey

- [ ] Maintain standardized categories, definitions and comparison attributes.
- [ ] Moderate providers, locations, service requests and public content.
- [ ] Inspect reports, audit logs, incidents and data-quality issues.
- [ ] Manage provider subscriptions, grants and promo codes when monetization is
  activated.

## 7. Delivery roadmap

### Phase 0 — Documentation and repository separation (current)

Goal: make the copied repository safe to evolve without confusing current and
target behavior.

- [x] Audit the actual frontend/backend stack and reusable infrastructure.
- [x] Compare the supplied plans with the current repository.
- [x] Identify the FastAPI/Next.js proposal as incompatible with the copied
  implementation unless a full rewrite is explicitly chosen.
- [x] Create the AutoCare Hub architecture and migration roadmap.
- [x] Record open product decisions instead of guessing.
- [x] Add machine-readable YAML maps for the target domain, phase dependencies,
  and legacy reuse/replacement/deletion gates.
- [x] Move the inherited AutoCare Hub `.git` metadata to the recoverable archive
  `/Users/a1/Desktop/my-projects/AutoCareHub/.legacy-git/legacy-booking.git-2026-08-12`.
- [x] Initialize a new empty Git repository on `main` with no configured remote.
- [x] Ignore real `.env.*` files while keeping `.env.example` templates
  eligible for the initial commit.
- [ ] User reviews this documentation diff.
- [ ] Audit the exact initial-import file list for secrets, generated artifacts,
  and obsolete AutoCare Hub-only assets.
- [ ] Create the local initial-import commit after user approval.
- [ ] Receive the new Git repository URL.
- [ ] Verify the empty/new remote before adding `origin`.
- [ ] Add `origin` and push only after explicit user approval.

Exit gate:

- Target product, reuse strategy, destructive boundaries and open decisions are
  visible in the reviewed docs.

### Phase 1 — Product decisions and domain contract

Goal: resolve decisions that would otherwise force schema/API redesign.

- [x] Select launch countries/regions and the data-driven market/locale model.
- [x] Select priority launch language packs; keep currency/timezone provider- and
  market-scoped.
- [ ] Select P0 provider categories and 20–40 P0 service definitions.
- [ ] For each P0 service, define comparable attributes and price rules.
- [ ] Decide exact booking modes per service class.
- [ ] Define provider verification requirements and badge meaning.
- [ ] Define cancellation/reschedule/no-show policies.
- [ ] Define review eligibility/edit/reply/report rules.
- [x] Decide the default data strategy: fresh AutoCare database; preserve legacy
  data only if a separate backfill decision is approved.
- [ ] Decide public SEO expectations and SSR/prerender strategy.
- [ ] Approve ADRs before schema implementation.

Exit gate:

- Catalog v1, state machines, policy rules and launch-market constraints are
  explicit and testable.

### Phase 2 — Design system and complete mocks

Goal: keep the approved AutoCare experience explicit before replacing the
remaining legacy domain UI.

The five supplied images are the approved baseline for hierarchy and interaction
patterns. They cover:

1. homepage with service/location search, map and recommendation cards;
2. search results with filters, list/map sync and comparison selection;
3. provider/service-location details with services, reviews and booking entry;
4. booking wizard;
5. customer requests/bookings dashboard.

Required design work:

- [x] Audit existing AutoCare Hub tokens/components and decide what can be reused.
- [x] Establish AutoCare Hub identity, typography, palette, spacing, elevation,
  icons, maps, automotive imagery and data-density rules.
- [x] Define desktop, tablet and mobile responsive grids.
- [~] Mock the homepage and search/compare journey with real AutoCare content;
  provider profile, booking, and customer dashboard remain next.
- [ ] Add missing customer mocks: comparison table, vehicle garage,
  inquiry/chat, attachment viewer, quote acceptance, bonuses and reviews.
- [ ] Add missing provider mocks: onboarding, location/offer editor, calendar,
  inbox, quote composer, bookings, bonus program, analytics and team.
- [ ] Add missing admin mocks: catalog, moderation, subscription plans, manual
  grants, promo codes, redemption history and billing incidents.
- [ ] Include loading, empty, error, stale, offline, success,
  permission-denied, suspended and expired-subscription states.
- [ ] Include keyboard focus, contrast, reduced-motion, localization and long
  content examples.
- [ ] Generate or render proposal images for review.
- [x] Apply the owner-approved visual direction to the first homepage slice;
  subsequent screens remain reviewable as local diffs before commit.
- [x] Add the next homepage visual pass: a self-contained map preview with
  search-radius context, price markers, trust signals, and market-aware currency;
  the real geocoded map remains scoped to catalog results.
- [x] Align the public shell with the approved AutoCare header/footer pattern:
  dark navy desktop header, compact brand lockup, and a shared flex layout that
  keeps the footer at the viewport bottom on short pages.
- [x] Rebuild the complete homepage composition against the supplied reference:
  compact navigation; full-height map hero; four-card comparison row; services,
  locations and provider CTA grid; four-step explainer and trust brands; customer
  reviews, mobile-app promo and matching dark footer.
- [x] Add a repeatable AutoCare mock asset pipeline: generated provider WebP
  assets are referenced by backend seed data, and missing/invalid photos resolve
  to a safe placeholder in both API data and the browser UI.

Exit gate:

- Page inventory, component/state contracts and responsive mocks are approved.

### Phase 3 — AutoCare domain foundation

Goal: build the new automotive domain beside reusable platform services.

- [x] Establish `/api/v1` conventions and versioned OpenAPI schemas for the
  first discovery/service-request slice.
- [x] Define the initial stable market, price-type, request-state, private
  attachment and two-sided-confirmation contracts.
- [x] Create the first isolated TypeORM migration and entities for markets,
  service definitions, providers, locations and service offerings.
- [x] Add isolated service-request, message and private-attachment persistence
  with request status and two-sided confirmation timestamps.
- [ ] Extend the new TypeORM domain with:
  - service categories and definitions;
  - providers, locations and memberships;
  - vehicles;
  - service offerings and vehicle rules;
  - schedules and location exceptions.
- [ ] Add PostGIS or an approved geospatial alternative with proper indexes.
- [~] Add service/repository layers and object-level authorization guards.
- [x] Add seed data for realistic services, providers, locations and offers.
- [ ] Add negative authorization, constraint and migration tests.
- [x] Generate/update the shared TypeScript API contract used by web and future
  mobile clients.

Exit gate:

- The API can create/moderate providers and return vehicle-aware, geospatially
  filtered offerings without legacy cabinet dependencies.

### Phase 4 — Search, comparison and provider profiles

Goal: deliver the core marketplace value in the browser.

- [~] Implement service-first search and vehicle/location inputs.
- [~] Implement radius, category, price type, price, rating, distance,
  availability, warranty, bonus and inclusion filters. The browser mock and
  Fastify API now share the full filter contract; availability is wired in the
  mock and remains pending real schedule/slot persistence on the backend.
- [x] Ensure list/map results share one server query and stable pagination.
- [x] Keep the results page viewport bounded: provider infinite loading and
  windowed virtualization run inside the results column scroll container so a
  large catalog cannot push the shared footer below an unbounded document.
- [ ] Add explicit labels for `FIXED`, `FROM`, `RANGE` and `QUOTE_REQUIRED`.
- [ ] Define deterministic recommended-sort inputs and prevent paid plan status
  from silently changing organic ranking.
- [ ] Implement comparison for equivalent `ServiceDefinition` results only.
- [x] Implement provider/location profiles, galleries, hours, contacts,
  offerings, amenities, verified reviews and policies.
- [ ] Add favorites.
- [~] Add the service request wizard with photo intent, direct-provider payment
  copy, and explicit customer/provider confirmation boundary.
- [ ] Validate accessibility, mobile web behavior and performance budgets.

Exit gate:

- A user can find and honestly compare the same service across multiple places.

### Phase 5 — Booking, dashboards and verified reviews

Goal: replace the cabinet booking flow with automotive booking workflows.

- [ ] Create an immutable booking offer/quote snapshot.
- [ ] Implement hybrid booking modes: request confirmation and instant slot.
- [ ] Implement idempotent creation and overlap protection.
- [ ] Implement explicit state transitions and actor permissions.
- [ ] Implement cancel/reschedule/no-show policies.
- [ ] Update customer bookings dashboard and provider calendar/work queue.
- [ ] Connect notifications and transactional outbox events.
- [ ] Implement verified review eligibility and rating aggregation.
- [ ] Add concurrency, timezone, authorization and E2E tests.

Exit gate:

- Search -> provider -> booking -> completion -> review works against the real
  backend and survives retries/concurrency.

### Phase 6 — Service messenger, photo assessment and quotes

Goal: support complex services such as painting and body repair.

- [ ] Create service inquiry/conversation domain anchored to provider location,
  service definition and optional vehicle.
- [ ] Limit participants to the customer and authorized provider members.
- [ ] Add durable messages with cursor pagination and idempotent sends.
- [ ] Add secure image attachments: allowlisted formats, decode/re-encode,
  dimensions/size/count limits, private storage, signed access and retention.
- [ ] Add read markers, unread counters and notification events.
- [ ] Add quote versions with items, totals/ranges, currency, expiry, notes,
  inclusions, exclusions and warranty.
- [ ] Accepting a quote creates/updates a booking from a server-side snapshot.
- [ ] Add report/block/moderation workflows without routine admin access to
  private conversation content.
- [ ] Use REST as the source of truth; add WebSocket/SSE delivery only after the
  durable message flow is proven.
- [ ] Add upload abuse, authorization, ordering and retry tests.

Exit gate:

- A customer can send damage photos, receive a detailed quote and convert it to
  a booking without losing conversation history.

### Phase 7 — Provider onboarding and administration

Goal: let real businesses operate safely on the platform.

- [ ] Provider application, verification and change-request workflow.
- [ ] Multi-location provider profiles and membership invitations.
- [ ] Scoped staff permissions and revocation.
- [ ] Catalog gap requests for missing standardized services.
- [ ] Moderation queues for provider/location/review/report content.
- [ ] Admin audit viewer and operational issue queues.
- [ ] Provider analytics: impressions, profile opens, inquiries, response time,
  quote conversion, bookings, completion and repeat customers.

Exit gate:

- A provider can onboard and operate without direct database/admin intervention.

### Phase 8 — Provider-funded client bonuses

Goal: add a simple, auditable loyalty system without becoming a financial
wallet.

- [ ] Approve bonus unit, earning, redemption, expiry and refund rules.
- [ ] Create provider-scoped bonus program and rules.
- [ ] Create one customer bonus account per provider.
- [ ] Use an immutable ledger for earn, redeem, expire and audited adjustment.
- [ ] Award only on eligible completed bookings.
- [ ] Make redemption idempotent and transactional with booking completion.
- [ ] Prevent negative balance, cross-provider use and cash withdrawal.
- [ ] Show balance/history to customer and program/liability metrics to provider.
- [ ] Add manual provider grants only with permission, reason, limits and audit.
- [ ] Add expiry, cancellation, concurrency and abuse tests.

Exit gate:

- Bonuses are explainable from the ledger and cannot be double spent.

### Phase 9 — Pilot and stable web gate

Goal: prove the browser product is ready before monetization or native apps.

- [ ] Real provider pilot in the first launch area.
- [ ] Real customer pilot across fixed-price and quote-required services.
- [ ] Validate catalog/price quality and supply density.
- [ ] Validate provider response time and booking reliability.
- [ ] Complete security/privacy threat review, data export/deletion and retention.
- [ ] Complete responsive browser, accessibility and localization matrix.
- [ ] Complete performance, SEO/prerender, map and media budgets.
- [ ] Complete dashboards, alerts, backups and restore rehearsal.
- [ ] Complete API contract and backward-compatibility tests.
- [ ] Remove or archive proven-unused AutoCare Hub domain/payment code.

Stable web criteria:

- All P0 real-API E2E journeys pass in CI and staging.
- No open P0 security/data-loss/authorization defects.
- Booking and message delivery SLOs are defined and met during pilot.
- Provider and customer support procedures are exercised.
- Product works on the agreed desktop/tablet/mobile-web matrix.
- Versioned API changes have a documented compatibility policy.

### Phase 10 — Provider subscriptions, grants and promo codes

Goal: monetize provider software access after the free phase without affecting
repair payments or corrupting organic comparison.

- [ ] Validate provider willingness to pay and approve plan feature matrix.
- [ ] Define configurable plan periods (for example 1/3/6/12 months; final set
  remains a product decision).
- [ ] Research currently available billing providers for the launch legal
  entity/country before selecting one.
- [ ] Create plans, plan prices, subscriptions and effective entitlements.
- [ ] Keep launch-free/founding access as explicit grants, not provider-age logic.
- [ ] Let super admin grant/revoke time-bounded access with reason and audit.
- [ ] Create promo codes with scope, percent/fixed discount, currency,
  validity, redemption limits, eligible plans/periods and status.
- [ ] Make promo redemption atomic and retain historical discount snapshots.
- [ ] Implement billing webhooks, idempotency, retry/reconciliation, invoices and
  entitlement changes for failed/cancelled/expired payments.
- [ ] Add grace-period and downgrade behavior that never deletes provider data.
- [ ] Separate paid placement, if ever approved, from organic ranking and label
  it clearly.
- [ ] Add super-admin/admin negative tests and billing incident runbooks.

Exit gate:

- Provider billing and access rights reconcile deterministically, including
  manual grants and promo discounts.

### Phase 11 — Native mobile readiness gate

Do not start Expo/React Native until every item passes:

- [ ] Web product meets Phase 9 stable criteria.
- [ ] `/api/v1` covers all customer journeys without browser-only business logic.
- [ ] OpenAPI/client generation and compatibility tests are reliable.
- [ ] Mobile auth/refresh/revocation strategy is threat-modeled.
- [ ] Private media access and upload flows work without web cookies.
- [ ] Cursor pagination exists for search, messages, bookings and notifications.
- [ ] Push event model and deep-link contract are documented.
- [ ] Product analytics confirms native apps solve a real retention/usage need.

### Phase 12 — iOS and Android

Goal: build customer mobile clients on the stable platform API.

- [ ] Create Expo/React Native TypeScript app after gate approval.
- [ ] Share generated API contracts and pure domain utilities only.
- [ ] Use platform secure storage for mobile credentials.
- [ ] Implement search/map, compare, provider, vehicle, inquiry/chat, quote,
  booking, notifications, bonuses and profile flows.
- [ ] Implement image picker/camera permissions and background upload recovery.
- [ ] Add push notifications and deep links.
- [ ] Add offline-safe drafts and explicit stale data handling.
- [ ] Add accessibility, crash reporting, device matrix and release channels.
- [ ] Complete App Store/Google Play privacy, screenshots, metadata and review.

Provider/admin native apps are separate decisions; responsive web remains their
default workspace unless research proves otherwise.

## 8. Design/reference risks already identified

- The reference screens communicate the intended information architecture well,
  but are very dense and require separate tablet/mobile compositions.
- Map markers and comparison cards must be driven by the same server result set.
- Ratings, discounts, “verified” badges and “original parts” claims require
  explicit source/policy rules; they cannot be decorative mock data in production.
- “From” prices and strike-through discounts must not be compared as exact
  prices without clear qualifiers.
- Placeholder partner logos, testimonials, phone numbers, review counts and app
  store badges must not ship as real claims.
- The reference booking screen suggests payment/prepayment. That is not an
  approved first-release rule.
- The customer dashboard includes “Write to service,” bonuses and payments but
  does not show the full conversation/quote or bonus-ledger experiences; those
  require dedicated mocks.
- Public SEO, map accessibility, keyboard navigation, long translations, empty
  supply areas, unavailable slots and upload failures need explicit designs.

## 9. Definition of done for implementation tasks

### Backend/domain task

- Schema change has a forward TypeORM migration and rollback/data strategy.
- External input is validated with Zod and matching DB constraints where useful.
- Business logic is outside route handlers.
- Tenant/provider/location ownership is explicit in every query.
- Negative authorization and concurrency/idempotency cases are tested.
- API/OpenAPI and frontend mock/contract fixtures stay in sync.
- Logs/metrics contain identifiers needed for operations but no secrets or
  private message/photo contents.
- Backend build and relevant unit/integration tests pass.

### Frontend task

- Uses the approved design/state contract and current FSD-style boundaries.
- Real API and mock API contracts match.
- Loading, empty, error, stale, offline, success and permission states exist.
- Keyboard, focus, touch targets, contrast and reduced motion are verified.
- Desktop, tablet and mobile web are verified with long localized content.
- Relevant tests, lint and production build pass.

### Release task

- Migration backup/restore and rollout/rollback steps are documented.
- Critical E2E flows pass against a real backend.
- Security/privacy/observability gates pass.
- User reviews local diff/commit before push or merge.

## 10. Decisions still required from the product owner

1. The exact first Russian million-plus pilot city and pilot locations in Spain
   and Moldova/Transnistria.
2. Whether any old AutoCare Hub user/booking data must be preserved.
3. Bonus model for v1: points, provider currency credit, percentage cashback,
   or a simpler visit/stamp mechanic; also expiry and cancellation rules.
4. Exact subscription periods and whether a permanent Free plan remains after
   paid plans launch.
5. Whether an authenticated customer may message any provider before booking,
   and required conversation/photo retention duration.
6. Provider verification documents and badge meaning in the launch market.
7. SEO importance at launch: SPA with selected prerendered pages or a later SSR
   migration within the React ecosystem.
8. New Git repository URL and desired visibility/organization.

Until these are resolved, implementation must isolate the decision behind
configuration/policy or stop at the affected phase rather than guessing.
