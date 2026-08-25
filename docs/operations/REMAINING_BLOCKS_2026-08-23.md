# Remaining roadmap blocks — 2026-08-23

This checkpoint records what was implemented in the current slice and what
still requires a real environment, product decision or a later UI slice.

## Closed in code in this slice

- UI state primitives support loading, empty, error, stale, offline,
  permission-denied and suspended states; mock mode can switch these states via
  `localStorage.autocare.mockScenario` or `X-AutoCare-Mock-State`.
- Results include an equivalent-offer comparison table, and service chat
  attachments open in an accessible viewer. Client requests expose quote
  history and provider-scoped bonus history.
- Provider/client pages use the state card for common error and empty paths;
  provider reviews and details keep retry actions.
- Discovery uses a portable SQL bounding-box prefilter, market/zone scoping,
  exact distance checks and market/latitude/longitude indexes. PostGIS remains
  an optional infrastructure upgrade rather than a hidden requirement.
- Trust rollout and appeal validation policies are covered by unit tests.
  Appeals now persist in PostgreSQL, support owner/client submission, user
  history, admin filtering and audited accept/reject decisions. Mock handlers
  expose the same routes and quality monitoring reports pending appeal count.
- Catalog/API parity remains green: 202 mock routes, 232 backend routes and
  both WebSocket routes are accounted for.

## Still open and intentionally not claimed as complete

- Real provider/customer pilot, catalog/price/supply validation and response
  SLO evidence require recruited participants and a selected environment.
- Production PostGIS decision, external durable object storage/AV quarantine/
  signed access,
  multi-process Redis chat smoke, resource capacity reservations and full
  PostgreSQL concurrency/E2E matrix remain release gates.
- Appeal moderation now has an admin queue and client appeal history with
  localized loading/empty/error states and audited accept/reject actions.
  Membership now has an owner branch-details UI for invitations and role
  revocation; calendar, onboarding and bonus screens still need the remaining
  role-specific operational UI. The backend contracts are available for those
  slices.
- Admin catalog-gap requests now have a queue UI with decision reasons, and the
  dashboard includes an audited ServiceDefinition editor with mock parity.
  Evidence-detail workflow remains open.
- Super-admin market readouts now include locales, timezone, currency and
  zones. The protected market settings editor now updates launch readiness,
  default/supported locales, timezone and currency through the same contract in
  mock and real modes. Country/city/zone creation and hierarchy rules remain
  open.
- Full responsive/accessibility/locale/screen-reader audit, SEO/prerender and
  production map/media measurements need real-device and staging evidence.
- Browser release-audit specs are present but require the Playwright Chromium
  binary in CI/local before visual and keyboard assertions can run.
- Alerts, encrypted backup/restore rehearsal, staging compatibility probe and
  deployment capability matrix need configured staging/production secrets.
- Provider subscriptions, grants and promo codes remain disabled by product
  decision and are not part of the free client MVP.
