# AutoCare Hub — Project Plan

> Status: working implementation roadmap
>
> Updated: 2026-08-14 (deployment capability negotiation completed)
>
> Architecture source of truth: `ARCHITECTURE.md`
>
> Git flow: `main` is production; active implementation branch is `dev`; all
> reviewed implementation commits are pushed only to `dev`

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

## 1.1 Approved competitor-parity expansion (2026-08-14)

The product owner approved implementation of the full competitor-parity set.
These features extend the AutoCare roadmap without changing the first-release
payment boundary: repair and service payment remains directly between the
customer and provider.

- [x] Fair-price benchmark: market/service/vehicle-aware range with an
  explainable parts + labour basis; always labelled as an estimate.
- [x] Structured quotes: parts, labour, consumables, tax/fees, validity,
  price-lock state and immutable accepted snapshot.
- [x] Multi-provider request: broadcast one request to matched providers,
  receive bounded offers, compare them and close the request without spam.
- [~] Guided issue intake: symptoms, photos and VIN become clarifying
  questions and suggested service categories before provider selection.
- [~] Mobile and pickup workflows: coverage areas, dispatch state, ETA,
  hand-off notes and proof-of-delivery for mobile mechanics and towing.
- [~] Repair timeline and photo report: milestones, approvals, before/after
  media, customer-visible updates and immutable event history.
- [x] Trust evidence: documents, qualifications, insurance, expiry dates,
  verification reasons, periodic reassessment and transparent explanations.
- [~] AutoCare guarantee: separate provider warranty from optional platform
  guarantee with claim, evidence, escalation and resolution states.
- [~] Verified reviews: completed-visit eligibility, one-review-per-service,
  photos, revision after resolution, anti-fraud, moderation and replies.
- [~] Scheduling completion: timezone-aware availability, specialist/resource
  selection, overlap/no-show protection, reschedule/cancel/rebook and reminders.
- [x] Expert help: moderated automotive Q&A and symptom guidance, separated
  from a provider diagnosis or repair promise.
- [x] Fleet and partner tools: multi-vehicle fleet workspace, approvals,
  reporting and a versioned partner API after consumer workflows stabilize.

Online payment, preauthorisation and platform collection of repair money remain
explicitly out of scope until a separate legal and product decision reopens it.

`[x]` means the endpoint, browser mock, seed data and at least one user-facing
flow are wired. `[~]` means the first contract and persistence foundation is
ready, while the remaining production workflow still needs its dedicated slice
(for example dispatch hand-off, media moderation or resource-level scheduling).

## 2. Confirmed product decisions

- [x] The product name is AutoCare Hub.
- [x] It is an aggregator of automotive service businesses and locations.
- [x] The first usable product is a responsive browser application.
- [x] Native iOS and Android development starts only after the web product is
  stable and the shared API is ready.
- [x] Customers compare equivalent offers by price, rating, reviews, distance,
  included work, warranty, and availability.
- [~] The marketplace needs a transparent trust layer: reliable providers can
  earn a quality badge and additional organic visibility, while clients get
  enough verified signals to avoid repeatedly poor or dishonest services. A
  deterministic score policy, persisted provider score/badge fields and a
  bounded worker reassessment pass now exist; versioned snapshots, evidence
  audit history, anomaly detection and ranking rollout remain pending.
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
- [x] Deployment capabilities are selected by one environment profile,
  `VITE_DEPLOYMENT_MARKET` (`ru`, `global`, and future market profiles). The
  profile controls which authentication providers and market-specific UI
  actions are shown: for example, `ru` hides Google sign-in while `global`
  exposes all providers approved for that deployment. The backend remains the
  source of truth and enforces the same provider allow-list through
  `DEPLOYMENT_MARKET` and `/api/v1/deployment-capabilities`; hiding a button is
  not a security control. Unknown values fail closed to `ru` and emit a startup
  warning.
- [x] The five supplied screens are the approved design baseline; improvements
  may be proposed during design work.
- [x] Every application shell (public, auth, client, owner and admin) uses the
  generated automotive pattern assets: the dark WebP for dark mode and the
  light WebP for light mode, switched by the existing theme provider and
  persisted theme preference. Header and footer expose the same theme control.
- [x] Homepage testimonials use the public `/api/v1/reviews/featured` contract
  (and its browser mock equivalent), with approved seed reviews spanning ratings
  5–2 and publication dates anchored to the bottom of equal-height cards.
- [x] Provider profiles support a separately uploaded normalized WebP logo;
  discovery, provider pages and owner listings expose `logoUrl`, with initials
  fallback when no logo is available.
- [x] Dark-mode color audit completed: separate midnight background, card,
  popover, secondary and muted surface levels; readable cool-white text;
  blue action controls; and distinct accessible status colors are defined in
  the shared token layer. The SVG logo now follows the inherited foreground
  color so it remains legible in every shell.
- [x] The home-page mobile application block is explicitly marked as “In
  development” with a diagonal translucent status ribbon while preserving the
  approved app preview and store badges.
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
- Client access is permanently free: customers never pay AutoCare Hub for
  searching, comparing, messaging or arranging a service. They pay the chosen
  provider directly for the completed repair, detailing, tyre or other work.
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
- Russian, Spanish, Romanian and English are the maintained launch language
  packs; the country set is Russia, Spain and Moldova/Transnistria. The exact
  first million-plus pilot city, legal entity, exchange-rate provider and
  launch currency policy still need an operational decision.

## 4. Current repository audit

### 4.0 Implementation snapshot — 2026-08-15

The repository is no longer at the planning-only stage. The following is the
current, reviewed implementation state and is the source for the next slices of
work.

| Area | Current state | Next required work |
| --- | --- | --- |
| Public shell | AutoCare SVG logo, responsive header with grouped help/client/provider navigation, locale selector, shared footer, SEO foundation, role-aware Help Center, themed registration and non-duplicated footer navigation are implemented. Legal links now resolve to detailed `/agreement`, `/rules` and `/privacy` pages with client/provider sections, table of contents, stable anchors and SEO metadata. The provider pricing route/components remain preserved but pricing navigation and promotional blocks are hidden during the free MVP launch. | Have the legal entity review and approve the draft texts for Russia, Spain and Moldova/Transnistria; then test every footer route at all maintained locales and publish the final controller/contact/retention details. Enable provider pricing only after the monetization gate is approved. |
| Home `/` | Desktop home is approved and locked: map hero, search form, comparison cards, category/location blocks, partner CTA, reviews and app promotion are implemented. | Do not redesign desktop home; only make functional/accessibility fixes. |
| Discovery `/services` | Interactive dark map, automotive SVG markers, filter UI, selected-filter clearing, brand specialization, comparison tray and eight-result pagination are implemented. | Finish backend parity for every filter (availability, price type, inclusion, bonus, warranty, sort and radius), persisted ranking and one-query map/list loading. |
| Provider profile `/services/:id` | Public profile API, approved hero/gallery layout, service offers, amenities, map, reviews, working date picker/modal gallery and authenticated provider favorites are implemented. | Connect live availability, service inquiries and provider-owned gallery/review media; remove fixed contact/vehicle demo values. |
| Service request `/services/:id/request` | Durable request flow now includes client/provider-scoped reads, confirmations, provider estimates with client accept/decline, request conversation, image attachments, connected follow-up UI, idempotent creation, outbox-backed event notifications, transactional repair events, timezone-aware schedules and locked overlap checks. | Add reminder delivery and production resource-capacity scheduling before pilot. |
| Owner acquisition `/for-owners` | Approved AutoCare business landing is implemented: generated workshop hero, request-preview panel, product benefits, onboarding steps and free-start CTA. | Connect registration to provider creation and replace preview metrics with owner API data. |
| Client cabinet | AutoCare requests/bookings dashboard now includes API-backed service requests, conversation messages, preliminary estimate visibility and client accept/decline actions; persistent provider favorites and automotive review terminology are implemented; profile and notifications retain the shared account shell. Client profiles now support up to 20 vehicles with dependent make/model selectors, year, fuel, engine, horsepower, colour and optional VIN, including generated neutral vehicle imagery. | Connect saved vehicle IDs to inquiry/booking snapshots, add vehicle compatibility hints and provider-scoped bonuses, and remove remaining legacy booking/payment copy. |
| Provider/admin workspaces | The owner dashboard now uses only AutoCare data: service locations, customer requests, conversion, confirmed estimates, rating and clear next actions. The administrator dashboard exposes an automotive moderation queue with API-backed provider status transitions and audit records. A separate super-admin dashboard is protected by the `super_admin` role and surfaces markets, locales, access counts, trust signals and the future billing state. Desktop and mobile workspace navigation now point to these AutoCare destinations. The owner sidebar now includes one unified reviews workspace with all-branch/address filtering, aggregate rating distribution and a shared resolution-chat/promo flow; service cards link to this same screen to avoid duplicate review logic. Provider memberships now support owner/manager/staff scope with optional branch assignment. | Add membership-management UI, offer editing, calendar/reminders, completed-visit trust evidence, moderation reasons/appeals, provider analytics and the super-admin grant/promo workflows. |
| Backend | Fastify/TypeScript + TypeORM/PostgreSQL covers all 168 MSW routes used by the browser and 204 backend routes including operational/auth/upload/WebSocket routes; OpenAPI and parity checks are automated. Markets, canonical localized zones, service definitions, discovery, provider profiles/offers, request lifecycle, unified chat threads, image attachments, immutable quote history, verified-review submission, idempotent requests and availability routes are implemented with migrations and mock handlers. P0 hardening now scopes owner broadcasts/clients, validates AutoCare response payloads, protects attachment media, makes quote/offer/confirmation transitions transactional with repair events, rejects expired/negative quotes, consumes security tokens atomically, validates persisted sessions, enforces account-deletion retention/anonymization, and adds WebSocket Origin/protocol/payload/rate guards. Provider membership authorization, timezone-aware weekly schedules, blackout dates and locked slot-overlap checks are persisted. Trust scoring now has a deterministic policy, persisted score/badge fields and bounded worker reassessment from current evidence. Browser mutations with session cookies are covered by a shared production CSRF guard, while bearer-only native clients remain supported. API and worker Render services are split; production Redis is fail-closed. Confirmed AutoCare visits now receive idempotent outbox reminders. Legacy Stripe/payment code is quarantined behind `PAYMENTS_ENABLED`, disabled in every deployment manifest, removed from the server CLI/example configuration, and never queried by the owner readiness flow while disabled. | Add PostGIS/geospatial indexes, durable object storage/quarantine, versioned trust snapshots and ranking rollout, booking conversion and database-backed authorization/concurrency integration tests. Python rewrite is explicitly deferred until a later approved phase. |
| Deployment configuration | Typed frontend and backend deployment profiles are now fail-closed. `GET /api/v1/deployment-capabilities` keeps mock/real capability negotiation in sync; OAuth buttons, profile linking and server OAuth routes use the deployment allow-list. | Add deployment smoke tests for every supported profile and extend the capability matrix with legal links, currencies and market-specific features. |
| Legacy cleanup | Public, owner and admin routes for the former cabinet product now redirect to their AutoCare counterparts; compatibility source remains isolated. Dead legacy cabinet/owner/admin lazy imports were removed from the route manifest, reducing the production bundle without deleting compatibility source. | Remove the remaining inherited entities, mocks and migrations only after every AutoCare replacement is live and covered by tests. |

The remaining public pages use the AutoCare visual shell, but Blog, Partners,
Contacts, Rules and Privacy still use a shared generic information composition;
their final policy/content pass is not complete. The responsive pass covers
the main stacked layouts, but full 360/390/768/1024 visual QA is still open.
PWA install prompting and the service-worker contract exist; offline discovery
cache, deep-link fallback and release smoke tests still need completion.

Current page delivery order:

1. client cabinet: requests/bookings, multi-vehicle garage, favorites, messages and bonuses;
2. provider profile and request follow-up: timezone-aware availability and reminder hardening;
3. provider workspace: onboarding, locations, offerings, inbox, calendar and
  team;
4. complete provider workspace operations and the remaining admin/super-admin workflows;
5. real-API hardening, pilot and mobile-readiness gate.

Delivery order for the remaining client-facing work:

1. finalize public information/legal copy and run footer/header route QA;
2. run a responsive pass at mobile (360/390), tablet (768/1024) and desktop
   widths, including long translated labels, maps, galleries and forms;
3. close the PWA release slice: install prompt, offline shell and cached public
   discovery, safe update prompt, manifest/icons, deep-link fallback and PWA
   smoke tests;
4. only after these gates, start native iOS/Android implementation from the
   versioned API and shared domain contracts.

### 4.0.1 Audit findings and next approved slice

The audit confirms that UI mocks and mock handlers must not be counted as
production workflow completion. The approved service-request vertical slice
and follow-up contract are now delivered:

1. [x] Add authenticated client request creation with server-side ownership and
   provider/location/offer validation.
2. [x] Persist the selected offer, vehicle/contact snapshot, preferred time and
   customer note using the existing AutoCare request entity.
3. [x] Add client/provider-scoped request reads and explicit client/provider
   confirmation transitions; keep repair payment direct to the provider.
4. [x] Connect `/services/:id/request` to the mutation and show a real success or
   validation state instead of only a local form result.
5. [x] Cover validation and authorization boundaries with backend schema/unit
   tests; frontend build, lint and mock handlers cover the UI contract.
6. [x] Notify the client and provider through the existing transactional outbox
   when a request, message, estimate or confirmation changes the workflow.
7. [x] Expose provider/location/offer availability and use the returned slots in
   the request form; keep occupied active requests out of the response.
8. [x] Add an owner-only AutoCare request inbox route with provider-scoped
   request list, conversation replies, confirmation and preliminary quote
   actions; keep the legacy cabinet booking page separate.

Real schedules, notifications, bonuses and
subscriptions are the following slices and should not be mixed into this
request contract.

### 4.0.2 Backend contract parity — 2026-08-14

- [x] Inventory all MSW handlers and compare method/path signatures with the
  Fastify source (168 mock routes, 204 real routes including operational and
  WebSocket routes).
- [x] Implement the only missing mock route, `GET /cabinets/all`, with the
  same active-only public behavior in MSW and PostgreSQL-backed mode.
- [x] Keep the route in OpenAPI and add `npm run check:api-parity` to the
  backend quality gate; backend-only health, auth, admin, upload and
  WebSocket routes are intentionally allowed and documented.
- [x] Document mock mode, Docker PostgreSQL/Redis mode, idempotent demo and
  AutoCare seeds, migration and real-mode E2E verification in
  `docs/backend-api-parity.md`.
- [x] Run the Docker-backed migration/seed/E2E flow with PostgreSQL and Redis;
  migration smoke and the integration suite now pass locally.
- [ ] Add response-schema and authorization integration coverage for the
  remaining high-risk workflows (membership administration, trust ranking,
  schedules/reminders and subscription administration).

### 4.0.3 Security and reliability hardening — 2026-08-15

The audit was run against the current browser, Fastify, migration and
deployment contracts. These items are now part of the delivery gate rather
than informal follow-up notes.

- [x] Scope owner client lists and broadcast reads/offers to an owned provider
  or eligible location; add negative ownership tests.
- [x] Make password reset/setup and email-verification tokens single-use under
  a database lock; reject revoked/expired persisted sessions during JWT auth.
- [x] Guard account deletion by the retention period and anonymize identity,
  private AutoCare payloads, sessions, media references and free text in one
  transaction while preserving required financial references.
- [x] Validate uploaded attachment bytes and image signatures; apply scoped
  mutation/upload limits and WebSocket Origin, subprotocol, frame-size and
  event-rate checks.
- [x] Make quote, service-offer and two-sided confirmation transitions use a
  pessimistic request lock, explicit state allow-lists, expiry checks and
  idempotent replay behavior.
- [x] Add additive chat/review foreign keys and parent checks as `NOT VALID`
  constraints so existing data can be repaired before validation.
- [x] Separate Render API and worker runtime declarations and fail closed when
  production Redis or PostgreSQL TLS verification is not configured.
- [x] Add frontend route/auth boundaries, mock attachment reads, market/zone
  filtering, Leaflet marker escaping, API response runtime boundaries and
  identity-cache clearing on refresh failure.
- [x] Add an integrity-check command for the expand-phase aggregate
  invariants; it reports provider/location/offering/request/claim mismatches
  and can validate the constraints after repair.
- [x] Apply migrations `178594` and `178595` (aggregate invariants and quote
  history) in Docker, repair/validate constraints, and run the new checks.
- [ ] Add those AutoCare-specific database-backed authorization, concurrency,
  migration-validation and anonymization scenarios to CI; production
  readiness still needs deployment secrets and external evidence.
- [ ] Replace in-process chat fan-out with the Redis pub/sub bridge validation
  and reconnect/backfill tests; the bridge is present, but multi-replica
  behavior still needs a two-process smoke run.
- [x] Add provider memberships, timezone-aware schedules, blackout dates and
  transactional slot-overlap checks; owner authorization accepts provider-wide
  or branch-scoped active memberships while legacy ownerId remains compatible.
- [x] Add expand-phase composite provider/location/offering/request/claim
  invariants as `NOT VALID` foreign keys; repair and `VALIDATE CONSTRAINT`
  remain a release-gated data migration.
- [x] Composite provider/location invariants and immutable quote history now
  have expand-phase migrations, Docker validation, zero-mismatch checks and
  release commands; concurrent DB authorization tests remain.
- [ ] Complete durable object storage/quarantine, resource-capacity
  reservations, PostGIS/keyset discovery and trust-score policy before pilot.

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

- [~] `Cabinet` domain -> `ServiceProvider` + `ServiceLocation`: first
  automotive entities/API are present; legacy ownership and workspaces remain.
- [~] Provider-owned free-text `Service` -> platform `ServiceDefinition` plus
  provider `ServiceOffering`: catalog foundations and discovery fixtures exist;
  moderation and provider editing are pending.
- [ ] Hourly cabinet price -> automotive price types and explicit inclusions.
- [ ] Cabinet owner role assumptions -> provider memberships and location roles.
- [~] Cabinet search -> vehicle-aware geospatial offering search: browser/API
  discovery contract, filters and brand specializations are implemented; real
  geospatial indexes and schedule availability are pending.
- [~] Cabinet details -> service-location public profile: `/services/:id`
  exists with gallery, offers, amenities, map, reviews and request CTA; visual
  polish and real availability remain.
- [ ] Existing booking snapshot -> immutable AutoCare offer/quote snapshot.
- [ ] Existing cabinet uploads -> provider, location, inquiry, and message media.
- [x] Existing generic favorites -> authenticated automotive provider favorites with canonical location/offer snapshots and guest local fallback.
- [~] Legacy mock data, translations, route names, tests, and assets: public
  AutoCare routes, provider owner profiles, client favorites/bookings/reviews,
  and shared layouts are migrated; protected admin/location adapters remain.

### 4.3 Quarantine and later remove

The copied project contains legacy commission and Stripe Connect flows for
customer booking payments. They conflict with the current AutoCare Hub
monetization direction and are not part of the AutoCare product.

- [x] Stop exposing legacy repair-payment/commission and Stripe Connect UI in the
  AutoCare product. Customers always use AutoCare for free and pay the chosen
  provider directly; AutoCare does not collect repair payments or provider
  payouts.
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
- [~] Moderate provider publication status from an audited AutoCare queue;
  location, service-request, review, complaint and public-content moderation
  are still pending.
- [ ] Inspect reports, audit logs, incidents and data-quality issues.
- [ ] Manage provider subscriptions, grants and promo codes when monetization is
  activated.

### Super-admin journey

- [x] Open a role-protected overview of markets, locales, platform access,
  provider trust signals and the billing-launch state.
- [ ] Create and govern launch markets, country/city locales and operating rules.
- [ ] Define transparent trust metrics, verification evidence, ranking boosts,
  suspensions and appeals without allowing a paid plan to alter organic ranking.
- [ ] Grant/revoke provider subscription access and manage promo codes only after
  the separate monetisation phase is approved.

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
- [x] User reviewed the documentation/product direction and authorized design
  implementation.
- [x] New repository initialized with an isolated history and `origin` set to
  `git@github.com:Dima163163/auto-care-hub.git`.
- [x] Establish `dev` as the integration branch; commits are pushed there only.
- [ ] Keep `main` protected as the production branch; merge/push only after
  explicit approval of the reviewed `dev` commit range.

Exit gate:

- Target product, reuse strategy, destructive boundaries and open decisions are
  visible in the reviewed docs.

### Phase 1 — Product decisions and domain contract

Goal: resolve decisions that would otherwise force schema/API redesign.

- [x] Select launch countries/regions and the data-driven market/locale model.
- [x] Select priority launch language packs; keep currency/timezone provider- and
  market-scoped.
- [~] Define and approve the deployment capability matrix for
  `VITE_DEPLOYMENT_MARKET`: allowed OAuth providers, payment methods, legal
  links, currencies and market-specific features for `ru`, `global` and future
  profiles. OAuth providers and fail-closed unknown-value handling are now
  implemented; payment methods, legal links, currencies and other market
  capabilities still require explicit product approval.
- [x] Select the first moderated catalog expansion: 18 service definitions now
  cover maintenance, diagnostics, tires, body work, auto electrics, tow trucks,
  mobile diagnostics, roadside assistance, batteries, alignment, washing and
  glass repair. The catalog remains data-driven so additional countries and
  categories can be added without changing the discovery API.
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
- [x] Implement and approve the desktop homepage and search/compare journey
  with real AutoCare content. The desktop homepage should not be visually
  redesigned without a new request.
- [~] Bring provider profile and client dashboard to the approved AutoCare
  visual system; initial implementations exist.
- [x] Implement the approved service-request screen and the approved
  owner-acquisition landing page.
- [~] Add missing customer mocks: service-request conversation, quote
  visibility and quote acceptance are connected; comparison table, vehicle
  garage, attachment viewer, bonuses and reviews remain.
- [~] Add missing provider mocks: the request inbox, conversation, confirmation
  and quote composer are now connected; onboarding, location/offer editor,
  calendar, bookings, bonus program, analytics and team remain.
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
- [x] Replace the temporary city/area fixture with a full location model:
  country and region metadata on markets, city centers, hierarchical districts
  and service areas with localized names, images, radius and active-service
  counts. Service locations carry a zone reference and public APIs expose
  market zones, parent traversal and nearest-zone ordering by coordinates.
- [x] Seed canonical launch zones for Moscow, Samara, Kaliningrad, Saint
  Petersburg and Transnistria; keep the same hierarchy in MSW and PostgreSQL,
  resolve city-code requests in both modes and cap the homepage discovery card
  at four zones while preserving the complete map catalog.
- [x] Add isolated service-request, message and private-attachment persistence
  with request status and two-sided confirmation timestamps.
- [~] Extend the new TypeORM domain with:
  - service categories and definitions;
  - [x] providers, locations and provider memberships;
  - [x] client-owned vehicle garage with dependent make/model selection and VIN metadata;
  - [x] versioned public vehicle catalog shared by mocks and the Fastify API, with 30+ makes, 100+ models, production ranges and fuel/engine metadata; native select arrows are globally disabled and replaced with one custom indicator;
  - provider vehicle compatibility rules;
  - service offerings and vehicle rules;
  - [x] timezone-aware weekly schedules, blackout dates and location exceptions.
- [~] Add PostGIS or an approved geospatial alternative with proper indexes;
  the current migration stores normalized coordinates and zone radii, while
  the production cutover must add geography columns/GiST indexes and SQL-side
  distance filtering before the pilot.
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
- [x] Use the versioned vehicle catalog for profile and results selectors instead of the former ten-brand fixture. Keep the normalized catalog in the backend and expose it through `GET /api/v1/vehicle-catalog`; schedule a production importer/refresh from the official vPIC dataset before launch.
- [~] Implement radius, category, price type, price, rating, distance,
  availability, warranty, bonus and inclusion filters. The browser mock and
  Fastify API share the full filter contract; availability now reads persisted
  timezone-aware schedules and locked slot reservations, while reminders and
  resource-capacity constraints remain pending.
- [x] Add vehicle-brand-aware discovery: providers declare their primary brand
  specializations or mark themselves as multibrand; selecting a brand returns
  matching specialists plus every multibrand provider in both mock and Fastify
  discovery responses.
- [x] Ensure list/map results share one server query and stable pagination.
- [x] Encode discovery cursors with the selected sort, complete numeric sort
  tuple and provider/location tie-breakers so changing sort cannot skip or
  duplicate results between pages.
- [x] Keep the results page reliable with ordinary provider pagination (8 cards
  per page) so result cards stay in normal document flow, the map is bounded
  to the current page, and the shared footer remains reachable.
- [x] Add explicit labels for `FIXED`, `FROM`, `RANGE` and `QUOTE_REQUIRED` in result cards, including range totals and quote-required copy.
- [x] Define deterministic recommended-sort inputs and prevent paid plan status
  from silently changing organic ranking. The score is explicit, reproducible,
  auditable and uses only rating, trust, review confidence, verification and
  distance signals.
- [~] Define the provider trust score and “Надёжный сервис” badge policy before
  production ranking is enabled. The explainable deterministic policy and
  persisted score/badge recalculation are implemented; versioned snapshots,
  completed-interaction evidence and ranking activation remain gated.
- [x] Implement comparison for equivalent `ServiceDefinition` results only. The
  results query scopes every card to one service definition and changing that
  definition clears the comparison selection and map focus.
- [~] Implement provider/location profiles, galleries, hours, contacts,
  offerings, amenities, verified reviews and policies. The data API and base
  screen exist; current work is matching the approved profile composition and
  replacing mock-only interactions.
- [x] Add authenticated AutoCare provider favorites with guest local fallback, sync and removal endpoints.
- [x] Add the service request wizard with photo intent, direct-provider payment
  copy, durable request persistence, conversation, image attachments, provider
  quote and explicit customer/provider confirmation boundary.
- [ ] Validate accessibility, mobile web behavior and performance budgets.

Exit gate:

- A user can find and honestly compare the same service across multiple places.

#### Trust score, quality badges and organic visibility

This is a product and backend requirement, not decorative UI. The first version
must be conservative: no provider receives a quality badge or ranking boost
because of a subscription, promo code, payment, self-reported review count or
an admin override without an auditable reason.

- [~] Define a versioned `ProviderTrustSnapshot` for each service location with
  `score`, `badge`, `computed_at`, `valid_until`, input counters and reason
  codes. Provider score/badge fields and worker recalculation now exist; the
  immutable snapshot/audit trail and location-level model are still pending.
- [ ] Use only attributable signals: completed/confirmed requests, one review
  per eligible completed visit, Bayesian/sample-size-adjusted rating, recent
  rating trend, complaint/dispute and refund rate, cancellation/no-show rate,
  response time, quote-to-final-price consistency, profile/verification
  completeness, and active moderation/policy violations.
- [ ] Add anti-gaming controls: verified-booking review eligibility, duplicate
  and coordinated-review detection, recency decay, anomaly flags, moderation
  queue, provider appeal flow and immutable moderation/audit events.
- [ ] Define “Надёжный сервис” eligibility as a documented threshold policy:
  verified provider/location, minimum completed interactions and review sample,
  rating confidence above the threshold, low complaint/dispute and no-show
  rates, acceptable price accuracy, and no unresolved serious violation. The
  badge expires or is suspended when the policy is no longer met.
- [ ] Expose the badge and a short “why this service is trusted” explanation on
  result cards, provider pages and map markers. Include the policy version and
  last recalculation date in an accessible details view.
- [ ] Keep organic ranking deterministic and observable. Combine service and
  vehicle relevance, distance, availability, comparable price completeness,
  response/booking reliability and the trust score; trust can improve ordering
  among comparable offers but cannot override an incompatible service or hide a
  materially worse match. Any sponsored placement is separate and labelled.
- [ ] Add monitoring for badge rate, complaint rate, review anomalies, ranking
  changes, provider appeals and false-positive/false-negative quality outcomes.
  Revisit thresholds using pilot data before broad rollout.

### Phase 5 — Booking, dashboards and verified reviews

Goal: replace the cabinet booking flow with automotive booking workflows.

- [ ] Create an immutable booking offer/quote snapshot.
- [ ] Implement hybrid booking modes: request confirmation and instant slot.
- [x] Implement idempotent AutoCare request creation; retain overlap protection for the scheduling slice.
- [ ] Implement explicit state transitions and actor permissions.
- [ ] Implement cancel/reschedule/no-show policies.
- [ ] Update customer bookings dashboard and provider calendar/work queue.
- [~] Connect AutoCare request notifications to the transactional outbox; booking
  reminders and localized service-request email/push templates remain open.
- [~] Implement verified review eligibility, rating aggregation and the trust
  snapshot inputs described in the “Trust score, quality badges and organic
  visibility” policy. Confirmed AutoCare requests can now create one pending
  verified review through `POST /v1/autocare-reviews`; persisted score
  reassessment is live, while trust snapshots and completed-visit evidence
  remain.
- [ ] Add concurrency, timezone, authorization and E2E tests.

Exit gate:

- Search -> provider -> booking -> completion -> review works against the real
  backend and survives retries/concurrency.

### Phase 6 — Unified messenger, photo assessment and quotes

Goal: support complex services such as painting and body repair.

- [x] Create a durable chat-thread domain for service requests, pre-booking
  provider inquiries, owner support and admin-to-super-admin escalation.
- [x] Expose one authenticated full-width chat workspace with client, owner,
  admin and super-admin routes; owner request inboxes link into the workspace.
- [x] Keep provider questions usable before booking, with an optional service
  and optional vehicle rather than forcing a request record.
- [x] Limit participants to the customer and authorized provider members.
- [~] Add durable messages with cursor pagination and idempotent sends. Durable
  REST messages and reconnect-safe WebSocket invalidation are implemented;
  cursor pagination and message idempotency remain.
- [~] Add secure image attachments: allowlisted formats, decode/re-encode,
  per-conversation size/count limits and orphan cleanup are implemented;
  private object storage, signed access, malware quarantine and retention
  backfill remain.
- [x] Add read markers, today/yesterday timestamps and notification events;
  delivery/read/attachment events are broadcast to the active chat channel.
- [~] Add quote versions with items, totals/ranges, currency, expiry, notes,
  inclusions, exclusions and warranty. Append-only quote history is now stored;
  API history exposure and booking conversion remain.
- [x] Add owner-to-customer chat offers for percentage coupons and alternative
  service options, with customer accept/decline decisions and immutable message
  history.
- [ ] Accepting a quote creates/updates a booking from a server-side snapshot.
- [ ] Add report/block/moderation workflows without routine admin access to
  private conversation content.
- [x] Use REST as the source of truth and add WebSocket delivery for live
  invalidation, with mock event parity, polling fallback and reconnect-safe
  refetch.
- [ ] Add upload abuse, authorization, ordering and retry tests.

Exit gate:

- A customer can ask a provider a general question or send damage photos,
  receive a detailed quote, and convert it to a booking without losing
  conversation history; owners can contact support and admins can escalate to
  the super-admin without leaving the chat workspace.

### Phase 7 — Provider onboarding and administration

Goal: let real businesses operate safely on the platform.

- [ ] Provider application, verification and change-request workflow.
- [ ] Multi-location provider profiles and membership invitations.
- [ ] Scoped staff permissions and revocation.
- [ ] Catalog gap requests for missing standardized services.
- [~] Provider moderation queue: administrators can list service profiles and
  move their publication status through audited API actions; location, review,
  complaint and appeal moderation are still pending.
- [ ] Admin audit viewer and operational issue queues.
- [~] Provider dashboard: AutoCare locations, latest requests, confirmed-estimate
  totals, conversion and rating signals are available; impressions, profile
  opens, response-time, booking-completion and repeat-customer analytics are
  still pending.
- [x] Unified owner reviews workspace: filter approved reviews by any owned
  service location/address, inspect aggregate rating distribution, open the
  shared booking/general-question chat and issue an auditable service promo
  without creating a second review flow inside the services catalog.
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

This phase only applies to provider software access. The client account and all
customer discovery, comparison and request flows remain free permanently.

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
