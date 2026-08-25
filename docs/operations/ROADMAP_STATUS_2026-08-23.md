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
- ✅ Local Chromium release audit covers responsive widths, keyboard operation,
  burger navigation, Axe accessibility and all 20 supported locales; evidence
  is recorded in `BROWSER_RELEASE_AUDIT_2026-08-25.md`.
- ❌ Physical-device responsive, real screen-reader and production
  long-translation audit.

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
- ✅ Admin can edit active service definitions, localized labels, categories
  and price format through a protected, audited API with mock parity.
- 🟡 Evidence review, appeals detail workflow and authorization integration
  matrix remain open.

## 7. Super-admin workspace

- ✅ Role-protected platform overview and backend market/capability contracts.
- ✅ Super-admin dashboard exposes market, locale, timezone, currency and zone
  coverage readouts from the backend catalog.
- ✅ Super-admin can edit launch readiness, default/supported locales, timezone
  and currency through a protected API with mock parity and audit logging.
- ✅ Country/city/zone hierarchy editor and protected create/update contracts
  are available in mock and real modes; production seed/review remains an
  operational gate.
- 🟡 Future subscription/promo controls remain open (monetization remains
  disabled for the free client MVP).

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
- `npm --prefix server test -- --pool=threads --maxWorkers=1 --reporter=dot` —
  266 files / 726 tests
- API contract, OpenAPI shape/structure, API parity and staging compatibility
  checks (staging probe skipped because `STAGING_API_BASE_URL` is unset).
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=... npm run test:e2e --
  --project=chromium e2e/autocare-release-audit.spec.ts` — 6 tests passed;
  see `BROWSER_RELEASE_AUDIT_2026-08-25.md`.
