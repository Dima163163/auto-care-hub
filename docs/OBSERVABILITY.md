# Observability Runbook

## Private metrics endpoint

The backend exposes `GET /internal/metrics` only when `METRICS_TOKEN` is set.
The caller must send `Authorization: Bearer <METRICS_TOKEN>`. Keep this route
behind the deployment's private network or monitoring proxy; it is not a
replacement for access control at the edge. When the variable is empty, the
route returns `404`.

## Correlation

Every HTTP response carries `X-Request-Id`. Clients may supply a safe ID made
of letters, digits, underscores, and hyphens (8-128 characters); otherwise the
API generates a UUID. Search the structured Fastify/Pino logs and
`audit_logs.correlation_id` with that value when investigating an operation.

Authorization and cookie headers are redacted before logs are written.

## Super-admin incident queue

The admin audit page has a separate `System incidents` tab visible only to a
super-admin. It does not mix operational events with user actions. Unhandled
HTTP 5xx errors and degraded health checks create or update an incident using a
15-minute deduplication window. Each incident includes severity, status,
occurrence count, first/last occurrence, and the latest `requestId`.

Super-admins can acknowledge and resolve incidents. The app cannot record its
own process after it is down, so an external uptime/error monitor must later
send or surface outage and background-job incidents. That provider
configuration remains a production deployment task.

## Health checks

The API exposes separate process and dependency checks:

- `GET /health/live` is a liveness check. It returns `200` while the process can
  serve requests and does not depend on PostgreSQL, Redis, or storage.
- `GET /health/ready` is the readiness check. It performs bounded probes for
  PostgreSQL (`SELECT 1`), configured Redis (`PING`), the outbox backlog and
  required cabinet upload storage. It returns `200` only when all required
  probes succeed and `503` with `status: degraded` when any probe fails.
- `GET /health` remains a compatibility alias for readiness and can be kept as
  Render's health check path. The response includes per-check `status` and
  `latencyMs`; outbox checks also report active count, dead-letter count, and
  oldest active event age.

Outbox readiness thresholds are configurable with `OUTBOX_MAX_PENDING`,
`OUTBOX_MAX_DEAD_LETTER`, and `OUTBOX_MAX_OLDEST_AGE_MS`. Values equal to a
threshold remain healthy; values above it make readiness degraded and create a
critical system incident. A failed database/outbox probe remains a dependency
failure, while unavailable outbox measurements are not compared to thresholds.
The private metrics endpoint exposes `outbox_readiness_status` and one finite
`outbox_readiness_threshold_breach` series per threshold reason.

Redis is reported as `skipped` when neither `REDIS_URL` nor `REDIS_HOST` is
configured. When Redis is configured, an unavailable Redis instance makes
readiness fail.

Maintenance cycles are bounded by `BACKGROUND_JOB_CYCLE_TIMEOUT_MS`; timeout
events increment `background_job_cycle_timeouts_total` and remain visible in
structured logs while the in-flight cycle drains before another cycle starts.

PostgreSQL uses bounded pool and query settings from `DATABASE_*` variables.
Readiness also evaluates `DATABASE_MAX_ACTIVE_RATIO` and
`DATABASE_MAX_WAITING_REQUESTS`; a breach emits pool pressure gauges and a
critical health incident so saturation is visible before request failures.
Slow queries above `DATABASE_SLOW_QUERY_THRESHOLD_MS` are emitted as
structured events with a normalized SQL shape; bind parameters are never
logged. OAuth requests use bounded fetch timeouts and transient-error retries.

The in-process registry limits each metric name to 100 unique label series by
default. Keep route, status, outcome, and provider labels from finite sets;
never put user IDs, booking IDs, request IDs, URLs, or provider payload values
into metric labels.

Security events emit bounded `security_events_total`,
`security_events_rate_limit_total`, `security_high_severity_events_total`, and
`security_threshold_alerts_total` metrics. A critical event or a burst of 20
events for the same event type and normalized route within 60 seconds emits a
structured warning and a deduplicated system incident. Exact IP data remains
in the access-controlled Security Center event record, never in metric labels.
This process-level signal does not replace edge/WAF telemetry: traffic blocked
before reaching the API must be monitored and mitigated by the deployment
provider.

Security Center operator actions are observable without turning investigation
data into high-cardinality metrics. List/detail reads, redacted exports,
status changes, assignment changes, temporary mitigations, and session
revocations produce bounded audit records with request/correlation context.
The append-only action timeline preserves the operator and optional active
super-admin assignee. The UI supports desktop detail context and a mobile
bottom drawer; both use no-store API responses. Do not add IPs, user IDs,
request IDs, routes, or free-form notes as metric labels.

For operational review, compare Security Center event counts with edge/WAF
telemetry. A low API event count does not prove that a volumetric attack is
absent: traffic rejected before the application is invisible to this process.
Alert routing and provider-side DDoS evidence remain deployment tasks.

Phase W adds bounded negative-path signals: `external_error_reports_total`
tracks `sent`, `failed`, and `disabled` reporter outcomes; classified
maintenance incidents distinguish `timeout`, `lease_lost`, `dependency`, and
`unknown` failures. Cabinet image cleanup is limited to a bounded provider scan,
and outbox payloads are capped before the database write. These controls keep
operator signals finite and prevent a provider payload or user-controlled value
from becoming an unbounded metric or log field.

## Alert thresholds

Configure these alerts in the deployment provider or monitoring service:

| Signal | Warning | Critical | Response |
| --- | --- | --- | --- |
| `/health/ready` availability | below 99.9% for 15 min | any 5 min outage | check dependency probe details, Render deploys, and request IDs |
| HTTP 5xx rate | above 1% for 15 min | above 5% for 5 min | inspect structured errors by `requestId`; roll back if tied to a deploy |
| p95 API latency | above 1.5 s for 15 min | above 3 s for 5 min | inspect database/Redis saturation and slow routes |
| Maintenance cycle failures | 1 failure in 10 min | 2 failures in 10 min | inspect the latest structured error and verify the database/Redis lease |
| Maintenance cycle duration | above 30 s for 15 min | above 55 s for 5 min | inspect outbox volume, database slow queries, and lease renewal |
| Background job lease skips | above 90% of starts for 15 min | 100% for 10 min | compare replica health and verify Redis/PostgreSQL advisory locking |
| Background shutdown timeouts | 1 per deploy/restart | 2 in 1 hour | inspect stuck maintenance work before scaling or redeploying |
| PostgreSQL storage | above 75% | above 90% | create capacity ticket and verify backup/restore path |

## Dashboard minimums

Track request volume, 2xx/4xx/5xx counts, p50/p95 latency, readiness uptime,
database connections and Redis availability. Also track `maintenance_cycle_duration_ms`,
`maintenance_cycles_completed_total`, `background_job_runs_total`, and
`background_job_shutdown_timeouts_total`. Create an external error-monitoring project before
production launch and configure its DSN only through deployment secrets.
Track `maintenance_cleanup_batch_size{resource="auth"}` alongside expired
token/session deletion counts; a repeated full batch is a signal that cleanup
capacity or retention settings need operator review.

## Phase Z Baseline

Record the migration inventory checksum with each release artifact. Keep
cursor-limit, notification-content, audit-target, and outbox-backoff failures
in structured test output; none of these policies should
emit user-controlled values as metric labels.

## Phase AA Baseline

Keep metric names and labels normalized and bounded; labels must remain finite
categories rather than user IDs, URLs, free-form search terms, or provider
payload values. External error context is capped before redaction and export,
while audit CSV cells, notification metadata, and pagination responses have
explicit size limits.

Record the migration inventory checksum for every release and reject an empty
or invalidly timestamped migration set before deployment. The OpenAPI cursor
page contract is expected to remain aligned with the runtime maximum page size
and cursor length.

## Phase AB Baseline

Keep audit and incident request identifiers, user-agent values, metadata keys,
error details, and provider failure messages bounded and control-character safe.
Do not promote review text, search terms, cabinet titles, booking comments, or
outbox payload values into metric labels. Maintain finite labels and review the
outbox/pagination bounds when adding new background or list endpoints.

## Phase AC Baseline

Readiness includes a schema-contract probe for the booking idempotency column
and session revocation metadata. Alert on a degraded database probe before
maintenance or web traffic is promoted; a PostgreSQL `42703` from an entity
query means the release migration job did not complete or the migration table
does not match the physical schema.

Record the Phase AC migration inventory checksum with the release artifact.
The historical Phase AC handoff contained 49 production migration files.
The repository has since advanced; the current baseline contains 93 files and
must be recorded from `npm run check:migration-inventory` rather than copied
from an older handoff. Keep repair migrations forward-only and verify their
column/index checks before starting replicas.

The historical Phase AC inventory checksum was
`96d842555504b9729ee1bf43bcc92d61ef7aa1eab84696016c0454128f9d0db6`.
The current repository inventory checksum is generated by the release check;
on 2026-08-15 it was
`fc10f349326c2fa2a6ca0a3dcadac003e0fe71317f3cfcb768c9f77fcef35ee5`.

Maintenance observability should distinguish bounded work from backlog:
retention cleanup deletes a finite audit/notification ID batch per cycle,
reminder candidates and availability support queries are capped, and orphan
image reference inventories have a hard limit. Repeated full batches require
capacity or retention review.

AutoCare trust scores are deterministic policy outputs, not manually editable
marketing labels. The response exposes bounded factors for profile completeness,
approved reviews, verified evidence, provider reliability and open guarantee
claim penalties. Reassessment jobs should record the policy version and input
snapshot before persisting a badge or using it in ranking.

Keep origin, email, locale, OAuth, outbox, rate-limit, external fetch, incident
metadata, and export policy failures in unit-test output. Do
not add user IDs, provider response values, tokens, URLs, or free-form error
messages as metric labels.
