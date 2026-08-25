# Release Checklist

Run the static gates from the repository root before opening a release PR:

```bash
npm ci
npm --prefix server ci
npm run lint
npm run check:api-contract
npm run check:openapi-shape
npm run test:migration-check
npm run check:render-production-config
npm run check:mvp-readiness
npm run test:server:unit
npm run quality:backend
npm --prefix server run check:migrations
npm run check:autocare-integrity
npm --prefix server run test:unit
npm --prefix server run build
npm run build
```

The full backend test suite and migration smoke test require PostgreSQL and
Redis services:

```bash
npm --prefix server run migration:smoke
npm --prefix server test
npm --prefix server run test:integration
```

For local parity with CI, start the bundled services with `npm run server:db:up`
and use the test database settings from `.github/workflows/quality.yml`. The
unit quality command remains runnable without services; integration failures
must be reported with the dependency name and port rather than treated as a
passing smoke test.

AutoCare does not process customer repair payments. Customers agree and pay
directly with the selected provider; no payment-provider configuration belongs
in a deployment.

## Release review

- Confirm the branch is clean and the migration check reports the expected
  latest migration.
- Review `/openapi.json` for changed route/method/schema entries and run the
  API contract checker after any route or MSW change.
- Verify `/health/live` and `/health/ready`; inspect readiness reason codes if a
  dependency is degraded.
- Keep `METRICS_TOKEN` in deployment secrets only. Never expose
  `/internal/metrics` through a public dashboard without an additional edge
  access policy.
- Confirm `GET /users/me/export` responses are `no-store` and that exports do
  not contain password hashes, token hashes, or provider secrets.
- Confirm deletion requests are reviewed as pending requests; no account is
  anonymized or deleted automatically by this endpoint.
- Confirm `AUTH_CLEANUP_BATCH_SIZE` is within its bounded range and the session,
  security-token, and OAuth-link expiry indexes are present after migrations.
- Confirm `BACKGROUND_JOB_CYCLE_TIMEOUT_MS` and database pool pressure thresholds
  are tuned for the deployment plan; inspect timeout and pool-pressure metrics.
- Confirm access and refresh tokens contain UUID user/session identifiers and
  an allowed application role; malformed claims must fail verification.
- Confirm trusted-proxy hops/CIDRs and CORS origins stay within their bounded,
  explicit configuration policy.
- In production, verify browser mutations with a refresh/CSRF cookie are
  rejected without a trusted Origin/Referer and matching CSRF header; verify
  bearer-only native requests remain supported without browser cookies.
- Review `/openapi.json` rate-limit headers (`RateLimit-*`, `Retry-After`) and
  correlation header references after API changes.
- Confirm `docs/PROVIDER_CONFIGURATION.md` matches the deployed SMTP,
  monitoring and cabinet-image storage setup. Filesystem image
  storage must use a persistent volume until an object-storage adapter is
  deployed.
- Confirm `external_error_reports_total` uses only finite outcome labels, and
  that maintenance incidents distinguish timeout, lease, dependency, and
  unknown failures.
- Run `npm run check:security-headers` and `npm run check:integration-prerequisites`
  before the service-backed CI job.
- Confirm metrics snapshots remain bounded and `/internal/metrics` stays
  protected by its configured bearer token and `no-store` headers.
- Confirm notification retention, localized security templates, outbox
  dead-letter handling, and preference guards are covered by unit tests.
- Review `docs/CONCURRENCY_TEST_MATRIX.md` and run the PostgreSQL/Redis-backed
  scenarios before production promotion. CI also runs the explicit
  `npm --prefix server run test:integration` profile; a green unit profile does
  not substitute for this service-backed evidence.
- Complete a backup restore rehearsal in a separate database before a schema
  change is accepted for production.
- Record the migration inventory checksum with the release artifact and
  review any unexpected change before running migrations.
- If a deployed process reports a missing entity column, stop traffic changes,
  inspect the migration table and information_schema, then rerun the release
  migration job before restarting replicas. The booking idempotency repair
  migration is forward-only and must not be replaced with manual schema edits.

## Database release order

1. Build and validate the backend artifact.
2. Run `npm run release:migrate` once as a release job.
3. Start web replicas only after migrations succeed.
4. Run readiness and smoke checks against the deployed API.
5. Record the release commit, migration result, and rollback owner.

For the booking idempotency contract, verify both the `bookings.idempotency_key`
column and `IDX_bookings_client_idempotency_key` index exist after the release
migration completes. A successful application build alone does not prove that
the production database matches the entity model.

Phase Z checks:

- Run `npm run check:migration-inventory` and record the checksum with the
  release artifact; investigate any unexpected migration source change.
- Run `npm run check:autocare-integrity`. Repair any reported cross-aggregate
  rows before promotion, then run `npm --prefix server run
  check:autocare-integrity -- --validate` to promote the AutoCare constraints
  from `NOT VALID`.
- Confirm shared cursor limits, session metadata, OAuth subjects, booking
  cancellation reasons, notification content, and audit targets are bounded
  before persistence.

## Phase AA checks

- Run `npm run test:migration-check` and confirm invalid migration timestamps
  and empty migration inventories fail closed.
- Run `npm run check:migration-inventory` and record the checksum with the
  release artifact.
- Confirm authentication, booking, cabinet, notification, audit and export
  service boundaries reject oversized or malformed input before the
  database or provider call.
- Confirm metric names, metric labels, external error context, and pagination
  cursors remain finite and do not contain user-controlled high-cardinality
  values.
- Run `npm run check:openapi-shape`, `npm --prefix server run check:migrations`,
  `npm run test:server:unit`, and `npm --prefix server run build` before
  promotion. PostgreSQL/Redis-backed integration remains a separate gate.

## Phase AB checks

- Confirm service-boundary normalization remains active for reviews, services,
  cabinets, bookings, user preferences, favorites, and admin filters.
- Confirm compatibility list limits are applied to owner/admin/deletion/review
  responses and that paginated endpoints still use the shared cursor limit.
- Confirm outbox payload shape, schedule, email text, and idempotency bounds are
  enforced before database writes or mail dispatch.
- Confirm OAuth callback values are normalized, request diagnostics are
  bounded, and provider failure details are redacted.
- Confirm resolved system incidents cannot be reopened and that invalid dates,
  sort options, rating filters, and blank optional searches follow their tests.
- Run `npm --prefix server run test:unit`, `npm --prefix server run build`, and
  `npm run lint`; complete PostgreSQL/Redis-backed checks separately.

## Phase AC checks

- Confirm `1785430000000-RepairBookingIdempotencyKey` is present in the built
  release artifact and that migration order/inventory checks report the
  current production migration set. The 2026-08-15 baseline contains 101 files;
  always record the command's checksum instead of relying on a copied count.
- Run the release migration job before starting replicas. Verify both
  `bookings.idempotency_key` and `IDX_bookings_client_idempotency_key` through
  the production database or migration diagnostics; do not repair them with
  an ad-hoc SQL edit.
- Verify `/health/ready` reports a connected database after migration. A
  schema-contract degradation must block promotion and background jobs.
- Confirm production `FRONTEND_ORIGIN`, `CORS_ORIGINS` and OAuth redirect URIs
  remain HTTPS/origin constrained.
- Confirm retention cleanup, availability previews, reminder scheduling,
  outbox dispatch, external OAuth responses, and data exports stay within
  their documented batch/body bounds.
- Verify the provider trust endpoint exposes the deterministic score factors,
  approved-review/evidence counts and open-guarantee-claim penalty; do not
  promote a provider badge without the corresponding evidence policy.
- Run `npm --prefix server run test:unit`, `npm --prefix server run build`,
  `npm run test:migration-check`, `npm run check:migration-inventory`, and
  `npm --prefix server run check:migrations` before promotion.
