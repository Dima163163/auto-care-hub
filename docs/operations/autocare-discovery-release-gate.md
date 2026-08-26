# AutoCare discovery and trust release gate

## Geospatial decision

The launch strategy is ADR-0007: PostgreSQL B-tree bounding-box prefilter plus
an exact great-circle predicate in SQL. It does not require PostGIS and keeps
the API stable for later PostGIS/GiST adoption.

Before enabling a new market, restore a production-like data snapshot and run:

```bash
BENCHMARK_DISCOVERY_MARKET=moscow \
BENCHMARK_DISCOVERY_ITERATIONS=100 \
BENCHMARK_DISCOVERY_P95_BUDGET_MS=350 \
BENCHMARK_DISCOVERY_P99_BUDGET_MS=700 \
BENCHMARK_DISCOVERY_MAX_FAILURE_RATE_PERCENT=0 \
npm --prefix server run benchmark:discovery
```

For the route-level staging run, point the same command at the deployed API:

```bash
BENCHMARK_DISCOVERY_BASE_URL=https://staging-api.example.com \
BENCHMARK_DISCOVERY_MARKET=moscow \
BENCHMARK_DISCOVERY_CONCURRENCY=8 \
BENCHMARK_DISCOVERY_ITERATIONS=100 \
npm --prefix server run benchmark:discovery
```

The command emits machine-readable p50/p95/p99/max output and exits non-zero
when the p95/p99 budget or zero-failure gate is exceeded. Record the artifact
with the release. A failed gate blocks market launch until query/index tuning
is complete or an approved PostGIS migration is ready.

Validate supply density separately for the selected city and radius:

```bash
DISCOVERY_DENSITY_MARKET=moscow \
DISCOVERY_DENSITY_CHECK_RADIUS_KM=25 \
npm --prefix server run check:discovery-density
```

This reports providers, branches, active offers and category coverage across
the broad-radius matrix and fails when the selected-radius thresholds are not
met.

## Trust-score rollout

Trust remains deterministic and receives only attributable platform signals.
Subscriptions, promotions and paid placement do not influence organic rank.
The following server-side configuration gates public trust projections:

| Variable | Default | Meaning |
| --- | --- | --- |
| `AUTOCARE_TRUST_ROLLOUT_ENABLED` | `true` | Enables public trust score and badge output. |
| `AUTOCARE_TRUST_ROLLOUT_MARKET_IDS` | empty | Optional comma-separated database market UUID allow-list. |
| `AUTOCARE_TRUST_ROLLOUT_PERCENTAGE` | `100` | Deterministic provider rollout percentage, 0–100. |

Before raising the percentage, inspect `GET /admin/autocare-quality-monitoring`:
the aggregate calibration report must have its recommended sample of confirmed
visits and no unexpected cohort degradation in verified review quality or
no-show rate. Save the response as release evidence.

## Public abuse limits and moderation

- `GET /v1/discovery/providers` is limited to 120 requests/IP/minute and
  returns standard `RateLimit-*` headers. Production Redis failure fails closed.
- Provider cover/gallery images, registration documents and verified reviews
  enter the moderation-evidence queue. Documents are represented by opaque
  private-storage references and are never exposed through public responses.
  Admins use `GET /admin/autocare-moderation-evidence` and
  `PATCH /admin/autocare-moderation-evidence/:id/decision` to approve or reject
  them with a recorded reason. Only approved, non-expired evidence contributes
  to public trust. Rejecting a gallery image removes it from the public
  provider profile; rejecting a review removes it from public reviews.
- A trust-eligible visit is a closed request with both client and provider
  confirmations. Completion and accepted suspension appeals refresh trust
  snapshots after the business transaction commits, so a transient trust
  worker failure cannot roll back a booking or moderation decision.
- Submitters can withdraw only their pending appeal via
  `DELETE /v1/autocare-appeals/:appealId`; moderator decisions are immutable.
