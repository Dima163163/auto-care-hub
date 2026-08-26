# AutoCare Hub — Project Plan

> Status: working implementation roadmap
>
> Updated: 2026-08-24 (portable geospatial ADR, trust rollout and moderation evidence)
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
- [x] The marketplace needs a transparent trust layer: reliable providers can
  earn a quality badge and additional organic visibility, while clients get
  enough verified signals to avoid repeatedly poor or dishonest services. A
  deterministic score policy, persisted provider score/badge fields, bounded
  worker reassessment, aggregate calibration cohorts, deterministic rollout
  controls, appeal withdrawal and moderator evidence queue now exist. Production
  calibration remains a release gate against real pilot data.
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
- The existing React/TypeScript and Fastify/TypeScript domain remains the
  baseline, but the web entrypoint is being migrated to Next.js App Router.
  The current React Router feature tree is mounted behind a catch-all route so
  approved UI and API contracts stay stable; Vite remains the PWA fallback.
  A FastAPI rewrite is still out of scope.
- Russian, Spanish, Romanian and English are the maintained launch language
  packs; the country set is Russia, Spain and Moldova/Transnistria. The exact
  first million-plus pilot city, legal entity, exchange-rate provider and
  launch currency policy still need an operational decision.

## 4. Current repository audit

### 4.0 Implementation snapshot — 2026-08-24

The repository is no longer at the planning-only stage. The following is the
current, reviewed implementation state and is the source for the next slices of
work.

### 4.0.1 Automated release-gate evidence — 2026-08-26

The following checks were run against a clean Next.js dev server on Chromium
and are now closed for the local/mock release gate:

- [x] Next.js direct-route smoke: 15/15 — representative public and protected
  URLs return successfully, provider deep links hydrate after reload, unknown
  URLs return a real 404, and unauthenticated protected URLs redirect to login.
- [x] Next.js route inventory: all 57 route constants are documented with their
  runtime owner, access guard and redirect behavior; six dynamic patterns and
  their concrete variants are covered by `check:next-route-inventory` and the
  production browser matrix.
- [x] Next.js runtime boundary: `npm run build` and `npm run start` are the
  required production commands, Render uses the Next.js web process, and the
  compatibility-only Vite/PWA/Vitest dependencies were audited and retained
  because each is still referenced by a non-production workflow.
- [x] Production-server smoke: the isolated `next start` process passed the
  desktop/mobile/tablet route suite (15/15) without a Vite runtime.
- [x] Chromium release audit: 21/21 — responsive widths 360, 390, 414, 540,
  682, 768, 790, 1024, 1280 and 1440; filter/sort controls; burger boundary;
  gallery Escape/focus restoration; Axe checks; owner workspace; and locale
  overflow checks.
- [x] Full mock E2E matrix: 84/84 — public/client states, garage, comparison,
  attachment viewer, bonuses, reviews (empty/one/many/photo), removed and
  suspended providers, API error/stale/offline/permission states, mobile
  journeys, profile privacy, security center and workspace routes.
- [x] Frontend unit suite: 105 files / 362 tests.
- [x] Local contract gates: staging API parity, Next route contract, security
  headers, interaction contract and PWA update checks all pass. The external
  staging probe remains intentionally skipped when `STAGING_API_BASE_URL` is
  not configured.

These results close the corresponding local/mock UI, loading-state,
responsive, accessibility and localization checklist items. They do not close
production-device, screen-reader, staging, infrastructure, legal or real-pilot
evidence gates.

| Area | Current state | Next required work |
| --- | --- | --- |
| Public shell | AutoCare SVG logo, responsive header with grouped help/client/provider navigation, locale selector, shared footer, SEO foundation, role-aware Help Center, themed registration and non-duplicated footer navigation are implemented. At 1120px and below the desktop shell hides primary links and exposes a working burger menu; from 1121px regular desktop links return, while below 768px the dedicated mobile header remains active. Legal links now resolve to detailed `/agreement`, `/rules` and `/privacy` pages with client/provider sections, table of contents, stable anchors and SEO metadata. The provider pricing route/components remain preserved but pricing navigation and promotional blocks are hidden during the free MVP launch. | Have the legal entity review and approve the draft texts for Russia, Spain and Moldova/Transnistria; then test every footer route at all maintained locales and publish the final controller/contact/retention details. Enable provider pricing only after the monetization gate is approved. |
| Home `/` | Desktop home is approved and locked: map hero, search form, comparison cards, category/location blocks, partner CTA, reviews and app promotion are implemented. Location and comparison blocks now expose reserved skeletons, localized empty states and inline retry actions without changing the approved composition. | Do not redesign desktop home; add stale/offline copy and long-localized-content fixtures only. |
| Discovery `/services` | Interactive dark map, automotive SVG markers, filter UI, selected-filter clearing, brand specialization, comparison tray and eight-result pagination are implemented. Real discovery now applies market/zone scope, radius, price/rating/type, availability-by-schedule, warranty, bonus, inclusion, verification and multibrand filters with stable cursor sorting. The accepted launch strategy is portable PostgreSQL BBOX + exact SQL distance with composite indexes, bounded candidates, cursor pagination and discovery rate limiting; concurrent p50/p95/p99 benchmark gates, broad-radius (5/25/100/500 km) coverage, bounded cache hints and selected-market density checks are automated. A PostGIS/GiST comparison runner validates result parity and `EXPLAIN` index usage when the extension/index are available. On narrow screens the map is ordered immediately below the filter form and before the provider list; desktop keeps the two-column list/map composition. | Run the benchmark, density and PostGIS/GiST commands against restored production-like data before a market launch; add model/year compatibility once provider specialization data is persisted. |
| Provider profile `/services/:id` | Public profile API, approved hero/gallery layout, service offers, amenities, map, live availability, public approved review aggregates/media, provider inquiry chat with image attachments and authenticated provider favorites are implemented. Contact data now preserves all provider phone numbers. Provider gallery media and verified reviews enter an auditable moderation-evidence queue; rejection removes the relevant public item. | Replace remaining demo vehicle/contact fallbacks and run the moderator queue against pilot media. |
| Service request `/services/:id/request` | Durable request flow now includes client/provider-scoped reads, confirmations, provider estimates with client accept/decline, request conversation, image attachments, connected follow-up UI, idempotent creation, outbox-backed event notifications, transactional repair events, timezone-aware schedules and branch-capacity reservations. Accepted bookings lock the branch row and reject overlapping confirmations above its configured capacity; direct PostgreSQL concurrency tests cover instant and manual booking races. In-app and email reminders are localized and idempotently added to the outbox. | Configure the provider calendar/work queue, external push subscriptions and production delivery credentials; run the reminder worker against staging mail/push infrastructure before pilot. |
| Owner acquisition `/for-owners` | Approved AutoCare business landing is implemented: generated workshop hero, request-preview panel, product benefits, onboarding steps and free-start CTA. | Connect registration to provider creation and replace preview metrics with owner API data. |
| Client cabinet | AutoCare requests/bookings dashboard now includes API-backed service requests, conversation messages, preliminary estimate visibility and client accept/decline actions; persistent provider favorites and automotive review terminology are implemented; profile and notifications retain the shared account shell. Client profiles now support up to 20 vehicles with dependent make/model selectors, year, fuel, engine, horsepower, colour, plate, internal number and optional VIN, including generated neutral vehicle imagery. Saved `vehicleId` values and immutable identity snapshots (year, plate, internal number, VIN) flow through requests and accepted booking snapshots; bonus redemption, expiry/refund history and real review-edit mutations are rendered in the client cabinet. | Verify the identity fields and deleted-vehicle/unavailable-service states against a running PostgreSQL API and complete real-device acceptance. |
| Provider/admin workspaces | The owner dashboard now uses only AutoCare data: service locations, customer requests, conversion, confirmed estimates, rating and clear next actions. It includes an interactive branch-capacity calendar plus a working queue, onboarding checklists, auditable verification/profile change requests, scoped staff invitations and notification delivery, owner bonus-liability ledger and analytics for requests, response time, reviews, repeat customers, impressions and profile opens. Provider memberships enforce owner/manager/staff permissions and exact branch scope across requests, offers, reviews, analytics, marketplace and chat APIs; workspace navigation reflects each role. The administrator dashboard exposes automotive provider/review/catalog moderation, provider change-request decisions with rationale and audit records plus an appeals queue with reasoned accept/reject decisions. A separate super-admin dashboard is protected by the `super_admin` role and surfaces markets, locales, access counts, trust signals and the future billing state. Owner creation, service details, the owner profile and the provider list now expose a clear “Связь с клиентами” control with chat on/off, communication mode, response window, phone booking, callback and photo-request settings; compact per-service chat switches provide fast access, while phone-only mode disables chat and online slots at the API boundary. Provider cards now use the approved trust-first composition: dark identity header, publication and verification status, rating/reviews, response-time and warranty stats, icon-led amenities, price/bonus summary and a responsive contact footer. Chat navigation and owner “open chat” actions remain feature-flagged off during MVP development; phone-based contact and the audited promo flow stay available, while chat routes and APIs remain ready for later production enablement. Workspace shells keep header and navigation fixed, scroll only the content pane, and intentionally omit the public footer on every cabinet tab. The owner calendar now exposes branch occupancy plus specialist, bay, lift and equipment availability; persisted resource reservations are assigned transactionally to instant bookings, quote acceptance, owner confirmations and accepted reschedules, and released on cancellation, no-show or completion. | Add durable document/evidence storage and media moderation, true multi-location provider records (rather than the current provider-card projection), production analytics retention/consent and the super-admin grant/promo workflows. |
| Backend | Fastify/TypeScript + TypeORM/PostgreSQL covers all 202 MSW routes used by the browser and 232 backend routes including operational/auth/upload/WebSocket routes; OpenAPI and parity checks are automated. Markets, canonical localized zones, service definitions, discovery, provider profiles/offers/reviews, request lifecycle, unified chat threads, image attachments, immutable quote history, accepted-quote booking snapshots, verified-review submission, idempotent requests, availability and persisted appeals routes are implemented with migrations and mock handlers. Clean local databases now expose the same read-only market/zone/service catalog fallback as mock mode until optional seed data is present; persisted PostgreSQL rows take precedence. Docker migration, seed, real-mode endpoint checks and the integration suite pass locally. P0 hardening now scopes owner broadcasts/clients, validates AutoCare response payloads, protects attachment media, makes quote/offer/confirmation transitions transactional with repair events, rejects expired/negative quotes, consumes security tokens atomically, validates persisted sessions, enforces account-deletion retention/anonymization, and adds WebSocket Origin/protocol/payload/rate guards. Provider membership authorization, timezone-aware weekly schedules, blackout dates and locked slot-overlap checks are persisted. Trust scoring now has a deterministic policy, persisted score/badge fields, deterministic rollout controls, aggregate calibration and bounded worker reassessment from current evidence. Browser mutations with session cookies are covered by a shared production CSRF guard, while bearer-only native clients remain supported. API and worker Render services are split; production Redis is fail-closed. Confirmed AutoCare visits now receive idempotent outbox reminders. Production configuration now requires S3-compatible private attachment storage plus ClamAV quarantine, exposes authorized signed access and removes media as part of retention/account deletion. The legacy financial-provider runtime is fully removed: dependencies, routes, UI, configuration, jobs, tests and active documentation are gone; only immutable historical migrations remain for existing databases. Aggregate admin quality monitoring now reports provider/review/request/trust coverage, calibration and pending appeal count without exposing private review or chat content. | Configure actual S3/ClamAV secrets, provider alerting and production-like restore evidence; extend resource-level scheduling and run real-market performance/pilot checks. Python rewrite is explicitly deferred until a later approved phase. |
| Deployment configuration | Typed frontend and backend deployment profiles are now fail-closed. `GET /api/v1/deployment-capabilities` keeps mock/real capability negotiation in sync; OAuth buttons, profile linking and server OAuth routes use the deployment allow-list. | Add deployment smoke tests for every supported profile and extend the capability matrix with legal links, currencies and market-specific features. |
| Legacy cleanup | Public, owner and admin routes for the former cabinet product now redirect to their AutoCare counterparts; compatibility source remains isolated. Dead legacy cabinet/owner/admin lazy imports were removed from the route manifest, reducing the production bundle without deleting compatibility source. Unused Bookly browser suites and the retired cabinet action-center implementation are archived under `docs/archive/bookly/`. | Remove the remaining inherited entities, mocks and migrations only after every AutoCare replacement is live and covered by tests. |

The remaining public pages use the AutoCare visual shell, but Blog, Partners,
Contacts, Rules and Privacy still use a shared generic information composition;
their final policy/content pass is not complete. The responsive pass covers
the main stacked layouts, and public/workspace header tablet overlap handling is
implemented; the automated 360/390/414/540/682/768/790/1024/1280/1440 release
matrix is green. Production-device and screen-reader evidence is still open.
PWA install prompting and the service-worker contract exist. Anonymous AutoCare
markets, zones, service definitions, provider search, provider profiles and
platform reviews are cached for offline use; the production preview verifies
offline search, offline provider details, deep-link fallback, mutation safety
and cache isolation in desktop and mobile Chromium. A one-time cache migration
removes the retired Bookly public cache without touching private identity
caches. Final release/device smoke testing against the deployed real API
remains.
Locale loading is also split by active language: the initial entry no longer
ships the complete translation catalog, and each locale family is emitted as a
separate deferred chunk. The largest locale and aggregate deferred assets are
tracked for trend monitoring; the runtime remains cycle-free and the English
entry renders without waiting for every language.

Quality baseline for this snapshot: frontend lint, unit tests and production
build pass; backend build and unit tests pass; API parity, contract shape,
migration inventory and Docker-backed integration checks pass. The performance
gate now passes for the initial entry, largest route chunk, largest locale
chunk, CSS asset and chunk count; aggregate deferred locale totals remain
informational and are tracked for trend monitoring without blocking a release.

Release evidence artifacts are now prepared alongside the code: the threat
model, pilot sequence, backup/restore rehearsal, responsive/accessibility/
locale matrix, SEO/prerender/media gate and native readiness gate live under
`docs/security`, `docs/operations`, `docs/product` and `docs/native`. They turn
the remaining crosses into explicit executable checklists; real providers,
customers, production infrastructure and product/legal approvals are still
required to close their gates.

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
3. finish the PWA release slice with deployed real-API/device smoke testing and
   release evidence; the install prompt, offline shell, cached public AutoCare
   discovery, safe update prompt, manifest/icons, deep-link fallback and local
   Chromium smoke tests are implemented;
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

### 4.0.2 Backend contract parity — 2026-08-21

- [x] Inventory all MSW handlers and compare method/path signatures with the
  Fastify source (198 mock routes, 228 real routes including operational and
  WebSocket routes).
- [x] Implement the only missing mock route, `GET /cabinets/all`, with the
  same active-only public behavior in MSW and PostgreSQL-backed mode.
- [x] Keep the route in OpenAPI and add `npm run check:api-parity` to the
  backend quality gate; backend-only health, auth, admin, upload and
  WebSocket routes are intentionally allowed and documented.
- [x] Document mock mode, Docker PostgreSQL/Redis mode, idempotent demo and
  AutoCare seeds, migration and real-mode E2E verification in
  `docs/backend-api-parity.md`.
- [x] Keep the real market and zone selectors usable on a clean local database:
  when the catalog tables are empty, the API exposes the same read-only
  country/city/zone registry as the mock catalog until the optional seed is
  run; the service-definition picker uses the same guarded fallback until its
  table is seeded, and persisted database rows remain the source of truth once
  available.
- [x] Run the Docker-backed migration/seed/E2E flow with PostgreSQL and Redis;
  migration smoke and the integration suite (9 files / 22 tests, including
  market/zone/discovery/request-auth smoke) now pass locally.
- [~] Add response-schema and authorization integration coverage for the
  remaining high-risk workflows (membership administration, trust ranking,
  schedules/reminders and subscription administration). Unauthenticated
  membership, invitation, schedule and chat-moderation paths now have route
  coverage, and the public trust route validates malformed identifiers; the
  Docker-backed role matrix and subscription administration response schemas
  remain pending until those environments/contracts are enabled.

### 4.0.3 Security and reliability hardening — 2026-08-21

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
- [~] Add those AutoCare-specific database-backed authorization, concurrency,
  migration-validation and anonymization scenarios to CI; production
  readiness still needs deployment secrets and external evidence.
  - Route-level authorization and unit/migration coverage are now in CI; the
    PostgreSQL/Redis integration profile is defined but still requires a
    runnable environment and staging evidence.
- [~] Replace in-process chat fan-out with the Redis pub/sub bridge. The bridge
  waits for initialization before publishing, bounds realtime payloads and has
  local gateway coverage plus `npm --prefix server run smoke:autocare-realtime`,
  which verifies cross-process delivery. A Redis-enabled staging run and
  reconnect/backfill evidence remain release gates.
- [x] Add provider memberships, timezone-aware schedules, blackout dates and
  transactional slot-overlap checks; owner authorization accepts provider-wide
  or branch-scoped active memberships while legacy ownerId remains compatible.
- [x] Add expand-phase composite provider/location/offering/request/claim
  invariants as `NOT VALID` foreign keys; repair and `VALIDATE CONSTRAINT`
  remain a release-gated data migration.
- [x] Composite provider/location invariants and immutable quote history now
  have expand-phase migrations, Docker validation, zero-mismatch checks and
  release commands; concurrent DB authorization tests remain.
- [~] Complete durable object storage/quarantine, resource-capacity
  reservations, PostGIS/keyset discovery and trust-score policy before pilot.
  Branch-level and resource-level capacity (specialists, bays, lifts and
  equipment) are now persisted, transactionally reserved and released across
  booking transitions; concurrent/p99 discovery gates, broad-radius checks,
  cache and rate-limit contracts, supply-density reporting and a PostGIS/GiST
  parity runner are implemented. Production-like execution, GiST cutover
  decision and live search/trust calibration remain required.

### 4.1 Reuse as platform foundation

- [x] React 19, TypeScript, Vite compatibility build, React Router, Redux
  Toolkit/RTK Query.
- [x] Next.js App Router production shell with a catch-all migration route and
  `/api` rewrite to Fastify; route-by-route server-aware migration remains in
  the SEO gate.
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
- [x] Hourly cabinet price -> automotive price types and explicit inclusions.
- [x] Cabinet owner role assumptions -> provider memberships and location roles.
- [~] Cabinet search -> vehicle-aware geospatial offering search: browser/API
  discovery contract, filters and brand specializations are implemented; real
  geospatial indexes and schedule availability are pending.
- [~] Cabinet details -> service-location public profile: `/services/:id`
  exists with gallery, offers, amenities, map, reviews and request CTA; visual
  polish and real availability remain.
- [x] Existing booking snapshot -> immutable AutoCare offer/quote snapshot.
- [~] Existing cabinet uploads -> provider, location, inquiry, and message media;
  validation and private-storage migration are still release-gated.
- [x] Existing generic favorites -> authenticated automotive provider favorites with canonical location/offer snapshots and guest local fallback.
- [~] Legacy mock data, translations, route names, tests, and assets: public
  AutoCare routes, provider owner profiles, client favorites/bookings/reviews,
  and shared layouts are migrated; protected admin/location adapters remain.

### 4.3 Quarantine and later remove

The copied project contained legacy commission and customer-payment provider
flows. They conflict with the current AutoCare Hub direction and are not part
of the AutoCare product.

- [x] Remove legacy repair-payment, commission and provider-payment runtime
  modules. Customers always use AutoCare for free and pay the chosen provider
  directly; AutoCare does not collect repair payments or provider payouts.
- [x] Remove the payment-provider dependency, environment configuration, route
  parser, APIs, UI, mocks, background tasks, tests and active documentation.
- [x] Prevent new AutoCare domain code from depending on legacy financial
  entities. Future subscription billing, if approved, starts with a separate
  contract and implementation.
- [x] Preserve immutable historical migrations so existing databases can still
  replay their already-applied schema history. Dropping historical tables is a
  separate destructive data-retention decision and is not part of this change.
- [x] Record removed paths and migration consequences in the reviewed commit.

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

- [x] Choose a standardized service.
- [x] Optionally choose/save a vehicle and carry the selected vehicle snapshot
  into the service request created from a provider profile.
- [x] Set location or use consented geolocation and search radius. Market/zone
  selection, radius filters and the map's consented browser geolocation control
  now share one discovery query.
- [x] See list and map results from the same query.
- [x] Filter/sort by relevant attributes.
- [x] Select 2–4 equivalent offers for side-by-side comparison.
- [x] Open a provider/service-location page.
- [x] Book an available slot or start an inquiry for a quote.
- [x] Exchange messages and photos for the selected service.
- [x] Receive, accept or decline a versioned quote.
- [x] View booking/conversation status and notifications. The client request
  panel shows request states, confirmed booking snapshots and opens the durable
  conversation; participant notifications are emitted by the backend outbox.
- [x] Complete the visit and leave a verified review. Owners complete confirmed
  visits server-side and clients can submit one review from a closed request;
  the service-request unique index prevents duplicate reviews.
- [~] See provider bonus balance and immutable bonus history. The customer API and
  mock parity expose provider-scoped account balances and ledger entries;
  expiry presentation and customer UI remain before the stable-web gate.

### Provider journey

- [x] Apply as a provider and pass the initial provider profile workflow.
- [x] Create an organization and one or more service locations.
- [x] Invite staff with scoped permissions. Invitations, branch scope, expiry,
  acceptance, invitation revocation and explicit active-membership revocation
  share the real/mock API. Existing users receive invitation/revocation
  notifications; owners receive acceptance notifications; manager/staff
  workspace navigation and APIs are limited to their exact allowed branches.
- [x] Configure hours, blocked periods and booking mode. Provider onboarding
  persists timezone-aware weekly/blackout schedules and the owner offer editor
  now persists `request` versus `instant` booking mode.
- [~] Activate standardized offerings with comparable price data. Standard
  definitions, comparison attributes, price ranges, inclusions and owner offer
  editing are live; admin publication tooling and catalog completeness remain.
- [x] Handle inquiries, photos, messages and quotes.
- [x] Confirm/decline/reschedule/complete bookings.
- [x] Respond to reviews when policy permits.
- [x] Configure the initial simple bonus program. The owner API and mock editor
  persist a provider-scoped earning program; owners can inspect active account
  balances, immutable ledger entries and current points liability.
- [x] See acquisition/booking/response metrics that demonstrate platform value.
  Owner analytics exposes request, quote, completion, response, repeat-customer
  and review metrics plus daily impressions and profile opens. Branch-scoped
  staff never receive provider-wide tracking or bonus figures.

### Admin journey

- [~] Maintain standardized categories, definitions and comparison attributes.
  The canonical catalog, comparison attributes and admin catalog-gap queue with
  decision reasons are implemented; a complete admin catalog editor is still
  pending.
- [~] Moderate provider publication status from an audited AutoCare queue;
  location, service-request, review, complaint and public-content moderation
  are still pending.
- [x] Inspect reports, audit logs, incidents and data-quality issues. Admin API
  routes expose cursor-safe audit logs/export, system incidents, outbox health
  and retry/dead-letter actions. The dashboard also exposes the aggregate
  data-quality queue, detailed evidence context and audited incident decisions.
- [ ] Manage provider subscriptions, grants and promo codes when monetization is
  activated.

### Super-admin journey

- [x] Open a role-protected overview of markets, locales, platform access,
  provider trust signals and the billing-launch state.
- [x] Create and govern launch markets, country/city locales and operating rules.
  The super-admin hierarchy editor and audited API manage country → city → zone
  without frontend releases. Each country and city carries its own locales,
  timezone, currency, capabilities and legal links; zones support hierarchy,
  geometry, order and publication state. The same contract is available in MSW
  and the real TypeORM/PostgreSQL server.
- [~] Define transparent trust metrics, verification evidence, ranking boosts,
  suspensions and appeals without allowing a paid plan to alter organic ranking.
  Versioned trust snapshots, evidence, suspension-safe ranking and the
  no-paid-placement policy are implemented; provider appeals and final rollout
  controls remain.
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
- [~] Keep `main` protected as the production branch; the local policy,
  CODEOWNERS and CI contract are documented, but the GitHub administrator must
  still enable the remote branch-protection toggles.

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
- [x] For each P0 service, define comparable attributes and price rules in
  `docs/product/MVP_POLICY_BASELINE.md`.
- [x] Decide exact booking modes per service class in the MVP policy baseline.
- [x] Define the conservative provider verification requirements and badge
  meaning; legal/entity review remains a publication gate.
- [x] Define cancellation/reschedule/no-show policies in the MVP policy
  baseline; the remaining API/UI delivery is tracked in Phases 5 and 7.
- [x] Define review eligibility/edit/reply/report rules in the MVP policy
  baseline; moderation implementation remains tracked in Phases 4, 5 and 7.
- [x] Decide the default data strategy: fresh AutoCare database; preserve legacy
  data only if a separate backfill decision is approved.
- [x] Decide public SEO expectations: keep the SPA for private workspaces and
  prerender selected public routes before the production web gate.
- [x] Approve ADRs before schema implementation. The AutoCare domain now has
  ADRs for the modular-stack evolution, web-first/mobile gate, payment/bonus
  separation, durable conversations, provider memberships and the provider-
  scoped bonus ledger (`docs/adr/0001`–`0006`).

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
- [x] Add missing customer mocks: service-request conversation, quote
  visibility and quote acceptance are connected; comparison table, vehicle
  garage, attachment viewer, bonuses and reviews are covered by the mock/API
  contracts and the 84-test Chromium E2E matrix. Real-device media acceptance
  remains an external release check.
- [~] Add missing provider mocks: the request inbox, conversation, confirmation
  and quote composer are now connected; onboarding, location/offer editor,
  calendar, bookings, bonus program, analytics and team remain.
- [~] Add missing admin mocks: catalog, moderation, subscription plans, manual
  grants, promo codes, redemption history and billing incidents.
  Catalog-gap, provider/review/chat moderation, system incidents and the
  launch-disabled billing state now have mock/API coverage; subscription plan,
  grant, promo-redemption and billing-incident workflows stay disabled until
  monetization is approved.
- [~] Include loading, empty, error, stale, offline, success,
  permission-denied, suspended, partial-data and session-expired states. The
  local/mock state matrix now includes `partial` and `expired-session`; protected
  cabinet consumers pass the session-expired state consistently and the real-mode
  browser smoke checks the `/auth/me` 401 boundary and protected redirect. Real
  API/offline delivery and PostgreSQL idempotency evidence remain gated by
  staging/database prerequisites.
- [~] Include keyboard focus, contrast, reduced-motion, localization and long
  content examples. Focus-visible, design-token, interaction-contract, Axe,
  locale and responsive checks are green in the automated release matrix;
  real screen-reader/device evidence remains before the stable-web gate.
- [~] Generate or render proposal images for review; the approved homepage and
  public state matrix are documented, while remaining admin/workspace state
  boards are still pending.
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
  migration `178612` now adds portable market/latitude/longitude indexes and
  SQL bounding-box filtering followed by exact distance checks. A PostGIS
  GiST cutover remains optional and requires a production infrastructure
  decision before the pilot.
- [~] Add service/repository layers and object-level authorization guards.
- [x] Add seed data for realistic services, providers, locations and offers.
- [x] Add negative authorization, constraint and migration tests. AutoCare
  owner/client bonus boundaries, unfinished-visit guards, idempotent ledger
  replay, bonus migration DDL and Docker schema-contract checks are covered in
  unit/integration suites.
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
  timezone-aware schedules and locked branch/resource reservations, while
  reminder delivery and production evidence remain pending.
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
  completed-interaction evidence and ranking activation remain gated. The
  recalculation now uses only approved verified-visit reviews and counts
  confirmed completed visits, cancellations and no-shows; badges require real
  completed interactions, while the remaining policy thresholds and ranking
  activation stay gated.
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
- [~] Validate accessibility, mobile web behavior and performance budgets.
  The Chromium release matrix now covers all maintained widths from 360 to
  1440px, keyboard/Axe checks pass, and the route-level JS/CSS performance
  budget gate is green. Physical-device evidence, production Lighthouse and
  production map/media measurements remain external release gates.

Exit gate:

- A user can find and honestly compare the same service across multiple places.

#### Trust score, quality badges and organic visibility

This is a product and backend requirement, not decorative UI. The first version
must be conservative: no provider receives a quality badge or ranking boost
because of a subscription, promo code, payment, self-reported review count or
an admin override without an auditable reason.

- [x] Define a versioned `ProviderTrustSnapshot` for each service location with
  `score`, `badge`, `computed_at`, `valid_until`, input counters and reason
  codes. Migration `178597` stores immutable location-level versions and the
  reassessment worker/API expose the current valid snapshots; ranking rollout
  and policy expansion remain gated.
- [~] Use only attributable signals: completed/confirmed requests, one review
  per eligible completed visit, Bayesian/sample-size-adjusted rating, recent
  rating trend, complaint/dispute and refund rate, cancellation/no-show rate,
  response time, quote-to-final-price consistency, profile/verification
  completeness, and active moderation/policy violations. The deterministic
  scorer now consumes completed/cancelled/no-show visits, verified reviews,
  Bayesian rating confidence, rating trend, complaint claims, response time,
  profile/evidence completeness and critical claim types. Refund and final-price
  observations remain explicitly unavailable until those persisted events exist;
  production calibration remains required.
- [~] Add anti-gaming controls: verified-booking review eligibility, duplicate
  and coordinated-review detection, recency decay, anomaly flags, moderation
  queue, provider appeal flow and immutable moderation/audit events. Verified
  booking eligibility, integrity signals, provider appeals, evidence decisions,
  suspension restoration and audited trust refresh are implemented. Production
  abuse calibration and final moderation UI rehearsal remain before ranking
  activation.
- [x] Define “Надёжный сервис” eligibility as a documented threshold policy:
  verified provider/location, minimum completed interactions and review sample,
  rating confidence above the threshold, low complaint/dispute and no-show
  rates, acceptable price accuracy, and no unresolved serious violation. The
  implementation and `docs/product/MVP_POLICY_BASELINE.md` now use the same
  10-visit/5-review, Bayesian 4.2, 10% complaint/no-show and critical-violation
  thresholds; the badge expires or is suspended when the policy is no longer met.
- [~] Expose the badge and a short “why this service is trusted” explanation on
  result cards, provider pages and map markers. Result cards, the map focus and
  provider details now use the API badge; the provider page includes factors,
  policy version, last recalculation date and the location snapshot contract.
  A full accessible explanation audit remains before ranking activation.
- [~] Keep organic ranking deterministic and observable. Combine service and
  vehicle relevance, distance, availability, comparable price completeness,
  response/booking reliability and the trust score; trust can improve ordering
  among comparable offers but cannot override an incompatible service or hide a
  materially worse match. Any sponsored placement is separate and labelled.
  - The scorer now accepts explicit optional operational signals, keeps missing
    evidence neutral, and does not accept subscription/promo placement inputs;
    persisted signal collection, dashboards and production monitoring remain.
- [~] Add monitoring for badge rate, complaint rate, review anomalies, ranking
  changes, provider appeals and false-positive/false-negative quality outcomes.
  Revisit thresholds using pilot data before broad rollout.
  - Admin API/mock parity now exposes aggregate provider, review-anomaly,
    request-outcome and trust-snapshot coverage telemetry. Provider appeals and
    pilot-driven threshold review remain intentionally gated.

### Phase 5 — Booking, dashboards and verified reviews

Goal: replace the cabinet booking flow with automotive booking workflows.

- [x] Create an immutable AutoCare quote history and accepted-quote snapshot;
  accepting the latest quote now also persists a separate booking snapshot with
  the quote version, locked amount, line items, schedule, timezone and provider
  location context.
- [~] Implement hybrid booking modes: provider offerings persist `request` or
  `instant`; instant slots create a confirmed booking snapshot after schedule
  validation and the owner editor can change the mode. A branch-level
  `appointmentCapacity` plus specialist, bay, lift and equipment resources are
  locked transactionally for instant creation, owner confirmation, quote
  acceptance and accepted reschedules; overlapping requests beyond capacity
  return `409`, with PostgreSQL race coverage. The owner calendar and work
  queue expose branch and resource occupancy; production-like concurrency and
  calendar evidence remain before pilot.
- [x] Implement idempotent AutoCare request creation; retain overlap protection for the scheduling slice.
- [~] Implement explicit state transitions and actor permissions. Request,
  quote, service-offer and two-sided confirmation transitions now use locked
  allow-lists and idempotent replay; the remaining role-specific transition
  matrix and staging authorization evidence remain open.
- [~] Implement transactional cancellation, reschedule, no-show and completion
  workflows: client cancellation, provider-proposed time changes, client
  accept/reject decisions, confirmed missed visits and post-visit completion are
  live with audit events and participant notifications; full calendar conflict
  policy now includes branch/resource reservations and terminal release;
  rebooking and reminder templates remain open.
- [~] Update customer bookings dashboard and provider calendar/work queue.
  Customer requests, owner request inbox and owner analytics are connected;
  the provider calendar/work queue now shows confirmed appointments, branch
  capacity and resource occupancy for each location.
- [~] Connect AutoCare request notifications to the transactional outbox;
  localized in-app and email reminders are idempotently produced for confirmed
  AutoCare visits. Browser push templates/subscriptions and operational mail
  delivery verification remain open.
- [~] Implement verified review eligibility, rating aggregation and the trust
  snapshot inputs described in the “Trust score, quality badges and organic
  visibility” policy. A closed AutoCare request now creates one pending
  verified review through `POST /v1/autocare-reviews`; persisted score
  reassessment is live, while trust snapshots and broader completed-visit
  evidence remain.
- [~] Add concurrency, timezone, authorization and E2E tests.
  Locked transition/slot-overlap logic, timezone unit tests, route-level
  authorization tests and direct PostgreSQL races for instant/manual branch
  and specialist capacity are present. The integration suite now covers
  concurrent reschedule proposals, idempotent reschedule decisions, client
  cancellation retries and no-show/completion terminal races; multi-process
  staging evidence and the remaining actor/role matrix remain
  environment-gated.

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
- [x] Add durable messages with cursor pagination and idempotent sends. Durable
  REST messages expose bounded cursor/limit pages for both request and general
  chats, with matching mock/API `nextCursor` contracts, reconnect-safe
  WebSocket invalidation, `Idempotency-Key` replay protection and explicit
  “load older” controls with cursor state in both chat workspaces.
- [~] Add secure image attachments: allowlisted formats, decode/re-encode,
  per-conversation size/count limits and orphan cleanup are implemented.
  Production now requires S3-compatible private object storage plus ClamAV:
  files are quarantined, scanned, promoted to a private key, served only by a
  short-lived signed URL and removed by retention cleanup. Deployment-bucket,
  scanner and retention rehearsal evidence remain a release gate.
- [x] Add read markers, today/yesterday timestamps and notification events;
  delivery/read/attachment events are broadcast to the active chat channel.
- [x] Add quote versions with items, totals/ranges, currency, expiry, notes,
  inclusions, exclusions and warranty. Append-only quote history is persisted,
  exposed by mock and Fastify APIs, rendered in the client cabinet and converted
  into an immutable booking snapshot on acceptance.
- [x] Add owner-to-customer chat offers for percentage coupons and alternative
  service options, with customer accept/decline decisions and immutable message
  history.
- [x] Accepting a quote creates/updates a booking snapshot from the server-side
  quote row; the response and mock contract expose the confirmed booking shape.
- [~] Add report/block/moderation workflows without routine admin access to
  private conversation content. Scoped report/block entities, participant
  authorization, admin metadata-only queue, optional moderation block and
  mock/REST parity are implemented. The chat workspace stays hidden behind the
  MVP feature flag; expose the report/block and admin queue UI only with the
  approved chat rollout and policy copy.
- [x] Use REST as the source of truth and add WebSocket delivery for live
  invalidation, with mock event parity, polling fallback and reconnect-safe
  refetch.
- [~] Add upload abuse, authorization, ordering and retry tests. Attachment
  byte/signature abuse, per-file/aggregate limits and exact-boundary behavior
  are now covered; chat report/block authorization is scoped in the service and
  mock contract. Database-backed multi-actor ordering/retry tests remain.

Exit gate:

- A customer can ask a provider a general question or send damage photos,
  receive a detailed quote, and convert it to a booking without losing
  conversation history; owners can contact support and admins can escalate to
  the super-admin without leaving the chat workspace.

### Phase 7 — Provider onboarding and administration

Goal: let real businesses operate safely on the platform.

- [x] Provider application, verification and change-request workflow. Owner
  verification/profile submissions persist with one pending request per kind;
  the onboarding UI makes profile, gallery, offers and verification progress
  visible. Administrators approve/reject with a required rationale, audited
  changes activate approved drafts and requester notifications are delivered.
  Durable document upload/evidence storage remains a separate media-security
  release gate.
- [~] Multi-location provider profiles and membership invitations. Provider
  invitations target one branch or the whole provider, expire after seven days,
  are single-use and are available in real/mock APIs; owner UI, invitation
  delivery and role-aware branch screens are live. The public/owner provider
  projection still needs a true multi-location record model.
- [x] Scoped staff permissions and revocation. Manager/staff acceptance,
  invitation revocation and explicit active-membership revocation are persisted
  behind owner authorization. Owner UI, notification delivery and exact
  branch-scoped authorization now apply to requests, offers, reviews,
  analytics, marketplace and chat access. Mock and local PostgreSQL seeds now
  include a ProService Staff account limited to its Moscow branch, so owner
  and staff visibility can be checked side by side.
- [~] Catalog gap requests for missing standardized services. Authenticated users can submit a normalized request; admins can approve it into the active service-definition catalog or reject it with a reason. Owner/admin UI, localization review and a richer audit queue remain.
- [~] Provider moderation queue: administrators can list service profiles and
  move their publication status through audited API actions; verification and
  profile-change decisions now have a dedicated admin queue with rationale and
  requester notifications. Appeals now include full status/subject history,
  evidence counts, owner withdrawal, reasoned decisions and notification
  outbox delivery. The evidence queue renders related provider/address,
  review text and photos before an audited decision; provider documents enter
  the same queue through opaque private-storage references. Durable
  location-document, gallery and complaint evidence review still requires the
  production storage/quarantine deployment and rehearsal.
- [x] Admin audit viewer and operational issue queues. Backend/API support
  cursor-safe audit logs/export, system incidents, outbox health and retry/
  dead-letter actions; the admin UI wiring is tracked in the public-state work.
- [x] Provider dashboard: AutoCare locations, latest requests, confirmed-estimate
  totals, conversion, rating, impressions, profile opens, response time,
  booking-completion, repeat-customer and bonus-liability signals are available.
  Tracking uses daily provider-level counters; retention/consent calibration is
  a production policy gate.
- [~] Unified owner reviews workspace: filter approved reviews by any owned
  service location/address, inspect aggregate rating distribution, contact a
  client by phone from the linked request and issue an auditable service promo
  without creating a second review flow inside the services catalog. Chat
  actions remain implemented but hidden behind the MVP feature flag until the
  production chat rollout is approved.
- [x] Provider analytics: inquiries, response time, quote conversion, confirmed
  bookings, completion, repeat customers, reviews, bonus liability, impressions
  and profile opens come from the owner-scoped API/mock endpoint and dashboard
  card. Provider-wide tracking is deliberately hidden from branch-scoped staff.

Exit gate:

- A provider can onboard and operate without direct database/admin intervention.

### Phase 8 — Provider-funded client bonuses

Goal: add a simple, auditable loyalty system without becoming a financial
wallet.

- [x] Approve bonus unit, earning, redemption, expiry and refund rules. The
  launch policy is versioned in `docs/product/BONUS_POLICY.md`: points are
  provider-funded, non-cash and provider-scoped; award follows a closed visit,
  spend is capped to an accepted booking, cancellation creates a typed refund,
  and a non-two-decimal currency requires a separate market rule.
- [x] Create provider-scoped bonus program and rules. Owner API and mock parity
  persist the provider program, caps, expiry and active flag.
- [x] Create one customer bonus account per provider. The schema enforces a
  client/provider unique account.
- [x] Use an immutable ledger for earn, redeem, expire, refund and audited
  adjustment. All entries are typed, append-only and idempotent; an
  owner-facing history UI remains a separate usability enhancement.
- [x] Award only on eligible completed bookings. Points are awarded inside the
  locked close-visit transaction and use the immutable booking amount snapshot.
- [x] Make redemption idempotent and transactional with booking completion.
  Accepted-request redemption locks the request/account, snapshots discount and
  payable amount, rejects cross-provider or insufficient-balance spends, and
  is covered by PostgreSQL concurrency tests.
- [x] Prevent negative balance, cross-provider use and cash withdrawal.
  Database constraints, provider-scoped accounts, redemption/expiry
  reconciliation and no-cash API surface enforce the rule.
- [x] Show balance/history to customer and program/liability metrics to provider.
  Customer balance/history is available through `/v1/bonuses/my`; owner analytics
  includes provider-scoped liability points and the dashboard card. The client
  cabinet supports transactional redemption and explicitly shows expiry/refund
  operations; mock and API contracts expose the same ledger states.
- [x] Add manual provider grants only with permission, reason, limits and audit.
  Owner-scoped grants enforce provider access, client role, a 100k-point limit,
  reason and idempotency; each grant records an audit action. The owner provider
  detail page now lets an authorized owner select a related client, enter a
  bounded grant and see the updated liability history.
- [x] Add expiry, cancellation, concurrency and abuse tests. Unit and
  PostgreSQL integration tests cover idempotent award, concurrent redemption,
  refund, expiry and the negative-balance boundary.

Exit gate:

- [x] Bonuses are explainable from the ledger and cannot be double spent.

### Phase 9 — Pilot and stable web gate

Goal: prove the browser product is ready before monetization or native apps.

- [ ] Real provider pilot in the first launch area. The executable sequence and
  evidence table are documented in `docs/operations/PILOT_READINESS_RUNBOOK.md`;
  real providers and a selected launch market are still required.
- [ ] Real customer pilot across fixed-price and quote-required services. The
  browser journeys are covered by mocks/integration tests; customer recruitment
  and support evidence remain external.
- [ ] Validate catalog/price quality and supply density. The canonical catalog,
  comparison attributes and quality-monitoring aggregate now expose catalog,
  price-coverage and per-market supply metrics; pilot supply and price review
  remain external.
- [ ] Validate provider response time and booking reliability. Instrumentation,
  locked transitions and the pilot SLO checklist now expose response p50/p95,
  confirmation reliability and conflict metrics; real traffic evidence is still
  required.
- [~] Complete security/privacy threat review, data export/deletion and retention.
  PII-aware logging, CSRF duplicate-header rejection, provider-scoped deletion
  invariants, private-media deletion and database-backed retention tests are
  implemented. The threat model and evidence procedure are in
  `docs/security/THREAT_MODEL.md`; independent review and production rehearsal
  remain before the stable-web gate.
- [~] Complete responsive browser, accessibility and localization matrix. The
  AutoCare-only release gate now covers 360/390/414/540/682/768/790/1024/1280/
  1440px, public keyboard traversal, city-listbox Arrow/Home/End/Escape
  behavior, Axe, and mobile Spanish/Romanian long-label checks. Production
  device, VoiceOver/TalkBack and full protected-cabinet keyboard evidence is
  still required.
- [~] Complete performance, SEO/prerender, map and media budgets. The public
  indexing contract and budget gate are recorded in
  `docs/SEO_PRERENDER_MEDIA_BUDGET.md`; locale payload splitting and local
  performance budgets pass, while production prerender/map/media measurements
  remain.
- [~] Complete dashboards, alerts, backups and restore rehearsal. Encrypted
  backup/restore scripts, an alert-rule template and the runbook are present;
  deployment alert routing, managed backup storage and a production-like timed
  rehearsal remain external gates.
- [~] Complete API contract and backward-compatibility tests. Mock/backend
  parity, OpenAPI shape/structure and local checks pass in CI; release-mode
  staging compatibility now fails closed without `STAGING_API_BASE_URL`, while
  a real staging probe and versioned deprecation evidence remain.
- [~] Remove or archive proven-unused AutoCare Hub domain/payment code. The
  legacy payment runtime is removed and the migration audit/no-legacy checks
  are green; unused Bookly browser suites and the retired cabinet action-center
  implementation are now reversible under `docs/archive/bookly/`. Inherited
  runtime entities/migrations remain archived until replacement coverage proves
  they can be deleted safely.

Stable web criteria:

- All P0 real-API E2E journeys pass in CI and staging.
- No open P0 security/data-loss/authorization defects.
- Booking and message delivery SLOs are defined and met during pilot.
- Provider and customer support procedures are exercised.
- Product works on the agreed desktop/tablet/mobile-web matrix.
- Versioned API changes have a documented compatibility policy.

### Phase 10 — Provider subscriptions, grants and promo codes

Goal: monetize provider software access after the free phase without affecting
repair payments or corrupting organic comparison. The decision and explicit
disabled state are documented in `docs/product/MONETIZATION_GATE.md`.

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

Do not start Expo/React Native until every item passes. The evidence contract is
documented in `docs/native/MOBILE_READINESS_GATE.md`:

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
