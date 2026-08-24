# Roadmap status — blocks 2–8

This is the implementation checkpoint for the current feature branch. A
checkmark means the contract and local mock/real path are present and covered
by automated checks. A cross means the item still needs an external gate,
product decision or a larger follow-up slice.

## 2. Public UI and states

- ✅ Shared loading, empty, error, stale, offline, permission-denied and
  suspended state primitives.
- ✅ Comparison table, attachment viewer, quote history and bonus history
  mock states.
- ✅ Provider/admin dashboard queues render retryable states; admin appeals
  queue and client appeal history are now wired to the same API contract.
- ❌ Full real-device responsive, keyboard, screen-reader and long-translation
  audit.

## 3. Search, map and trust

- ✅ Market/zone scope, indexed bounding-box prefilter, SQL exact-distance
  filter and discovery keyset cursor contract.
- ✅ Deterministic trust policy, rollout controls and persisted appeal decisions.
- ❌ Production PostGIS/GiST decision, ranking rollout evidence and live
  confirmed-visit metric calibration.

## 4. Booking, reviews and notifications

- ✅ Quote snapshots, booking conversion, idempotent request transitions,
  review integrity policy, reminder outbox and cursor-based chat APIs.
- ✅ Review/photo moderation contracts and appeal evidence identifiers.
- ✅ Private normalized attachments are stored outside PostgreSQL in a private
  filesystem area, served only after participant authorization, and removed by
  orphan/retention cleanup.
- ❌ External durable object storage with AV quarantine and signed URLs,
  capacity reservations, Redis multi-process WebSocket smoke and full
  PostgreSQL concurrency E2E.

## 5. Service-owner workspace

- ✅ Service catalog editing keeps historical prices in request snapshots;
  branch-scoped membership, schedules, analytics and bonus liability APIs are
  available in mock and real modes.
- ✅ Owner branch details expose staff invitations, manager/staff roles and
  revocation controls with loading, empty and error states.
- ❌ Complete invitation/onboarding/calendar/capacity and moderation UI for
  every role and branch.

## 6. Administrator workspace

- ✅ Provider moderation, quality metrics and an audited appeals queue with
  required decision reasons.
- ✅ Admin dashboard exposes the catalog-gap moderation queue with required
  decision reasons.
- ❌ Full category editor, evidence review, appeals detail workflow and
  authorization integration matrix.

## 7. Super-admin workspace

- ✅ Role-protected platform overview and backend market/capability contracts.
- ✅ Super-admin dashboard exposes market, locale, timezone, currency and zone
  coverage readouts from the backend catalog.
- ✅ Super-admin can edit launch readiness, default/supported locales, timezone
  and currency through a protected API with mock parity and audit logging.
- 🟡 Country/city/zone creation and hierarchy editor plus future
  subscription/promo controls remain open (monetization remains disabled for
  the free client MVP).

## 8. Bonuses

- ✅ Provider-scoped ledger, redemption/expiry/refund invariants and client
  history display; owner analytics reports liability points.
- ❌ Production abuse/concurrency rehearsal and final commercial rules for
  expiry, reversals and provider liability.

## Verification in this checkpoint

- `npm run lint`
- `tsc -p tsconfig.app.json --noEmit`
- `npm run build`
- `npm --prefix server run build`
- `npm --prefix server run test:unit -- --run` — 171 files / 509 tests
- API contract, OpenAPI shape/structure, API parity and staging compatibility
  checks (staging probe skipped because `STAGING_API_BASE_URL` is unset).
- `npm run test:e2e -- --project=chromium e2e/autocare-release-audit.spec.ts`
  could not launch because the Playwright Chromium binary is not installed in
  the environment; no browser download was performed.
