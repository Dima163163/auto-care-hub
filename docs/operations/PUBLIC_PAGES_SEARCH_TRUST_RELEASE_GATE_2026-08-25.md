# Public pages, discovery and trust release gate — 2026-08-25

This release-gate record covers the parts of the public/client experience and
search contract that can be verified locally with the seeded Docker
PostgreSQL/Redis stack. It is evidence for the MVP build; it is not a
substitute for a recruited provider/customer pilot or production sign-off.

## Public/client UI state coverage

The public service page and client workspace keep the shell visible while
remote blocks load and expose explicit state components for loading, empty,
error, stale, offline, permission-denied and suspended responses. The
Chromium suite exercises:

- provider gallery and comparison table;
- client garage, bonus history and request attachment viewer;
- empty provider reviews;
- one published review;
- published review with a customer photo;
- recoverable request-list error, stale, offline, permission-denied and
  suspended states;
- mobile service and client routes without horizontal overflow.

Run the focused state gate with:

```bash
npm run test:e2e -- e2e/autocare-client-public-states.spec.ts \
  --project=chromium --grep "review|gallery|bonus|recoverable|mobile"
```

The fixture header `x-autocare-review-fixture` is intentionally test-only and
supports `empty`, `one` and `photos`; the production API remains the source of
truth.

## Discovery/search contract

The API currently uses the portable indexed strategy in ADR-0007: market/zone
scope and a latitude/longitude bounding box are applied in SQL, the exact
great-circle distance is also checked in SQL, and the response is bounded by
`MAX_DISCOVERY_CANDIDATES`. The public response is keyset-paginated with a
stable provider/location tie-breaker.

The integration gate now verifies:

- selected-market scoping and an explicit empty result for an unavailable city;
- `limit <= 50` and positive radius validation;
- stable, disjoint keyset pages;
- ascending price ordering;
- BMW specialization filtering;
- fallback to multibrand services for an otherwise unknown brand.

Run it with:

```bash
npm --prefix server test -- src/modules/autocare/autocare.routes.integration.test.ts
npm --prefix server run benchmark:discovery -- --json
```

The latest local benchmark on the seeded catalog recorded p50 **3.4 ms**, p95
**5.1 ms** and max **10.6 ms** over 40 requests. This validates the current
plan for the local pilot, but does not
close the 10k/100k-row comparison requested for production. Before launch,
load a production-like snapshot and rerun the benchmark at 10,000 and 100,000
locations; adopt PostGIS/GiST only if that gate exceeds the agreed p95 budget.

Discovery is protected by the public rate limiter, strict input bounds, a
candidate cap and a SQL statement timeout. Production Redis outage behaviour
must still be verified in a multi-process staging run.

## Trust and moderation

Trust rollout remains deterministic and independent of subscriptions,
promotions and paid placement. The existing moderation evidence queue records
decisions for provider media and reviews, and trust output is gated by market
and percentage rollout configuration.

Local checks cover ranking inputs, approved-review/photo rendering, provider
status states and bounded trust responses. The following evidence is still
required outside this repository run:

1. at least five real provider response samples and five confirmed bookings;
2. calibration against completed/confirmed visits, cancellations, no-shows,
   complaints and repeat visits;
3. an appeals rehearsal and a staged badge removal/rollout rollback;
4. production-like moderation review of gallery and review evidence.

The local reliability gate intentionally remains blocked when the seeded data
does not meet those sample thresholds; it must not be reported as an SLA.

## Commands used for the local gate

```bash
npm run lint
npm run build
npm --prefix server run build
npm --prefix server test -- src/modules/autocare/autocare.routes.integration.test.ts
npm run test:e2e -- e2e/autocare-client-public-states.spec.ts --project=chromium
npm --prefix server run check:pilot-quality -- --json
npm --prefix server run benchmark:discovery -- --json
```
