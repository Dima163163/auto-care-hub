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
npm --prefix server run benchmark:discovery
```

The command emits machine-readable p50/p95/max output and exits non-zero when
the p95 budget is exceeded. Record the artifact with the release. A failed
gate blocks market launch until query/index tuning is complete or an approved
PostGIS migration is ready.

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
- Public gallery images and verified reviews enter the moderation-evidence
  queue. Admins use `GET /admin/autocare-moderation-evidence` and
  `PATCH /admin/autocare-moderation-evidence/:id/decision` to approve or reject
  them with a recorded reason. Rejecting a gallery image removes it from the
  public provider profile; rejecting a review removes it from public reviews.
- Submitters can withdraw only their pending appeal via
  `DELETE /v1/autocare-appeals/:appealId`; moderator decisions are immutable.
