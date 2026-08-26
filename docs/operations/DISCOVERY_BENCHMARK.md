# Discovery benchmark

`npm --prefix server run benchmark:discovery:synthetic` runs the deterministic
portable baseline against 10,000 and 100,000 synthetic service points. It
reports p50/p95/p99/max for the bounded distance-ranked page of 20 results.

`npm --prefix server run benchmark:discovery` now exercises the Docker/staging
database with a bounded worker pool. `BENCHMARK_DISCOVERY_CONCURRENCY` defaults
to 8, `BENCHMARK_DISCOVERY_ITERATIONS` to 40 and the default radius matrix is
5/25/100/500 km. The command bypasses the short-lived application cache so its
latency reflects PostgreSQL pressure and fails when p95, p99 or the configured
failure-rate budget is exceeded. `BENCHMARK_DISCOVERY_MAX_FAILURE_RATE_PERCENT`
defaults to 0. Set `BENCHMARK_DISCOVERY_MARKET` to a city code for a specific
supply-density check.

For a route-level production-like run against an already deployed API, set
`BENCHMARK_DISCOVERY_BASE_URL` (and optionally
`BENCHMARK_DISCOVERY_MARKET`) before invoking the same command. This mode uses
real HTTP requests, therefore includes Fastify validation, the public Redis
rate-limit and shared cache headers instead of bypassing them.

`npm --prefix server run check:discovery-density` checks the selected market's
actual supply rather than only query latency. It reports active providers,
locations, offers and per-category coverage at 5/25/100/500 km (or
`DISCOVERY_DENSITY_RADII_KM`). Set `DISCOVERY_DENSITY_MARKET` to a city code or
market UUID, and use `DISCOVERY_DENSITY_CHECK_RADIUS_KM`,
`DISCOVERY_DENSITY_MIN_PROVIDERS` and `DISCOVERY_DENSITY_MIN_OFFERS` to define
the release threshold. The command exits non-zero when the selected radius is
below that threshold.

`npm --prefix server run benchmark:discovery:geospatial` compares the native
PostgreSQL bounding-box + great-circle predicate with a real PostGIS geography
query at the same radiuses. It exits successfully with a machine-readable
`skipped` result when PostGIS or the required geography GiST index is
unavailable, rather than pretending that the comparison ran. Run it against a
PostGIS-enabled staging snapshot with the index present before choosing a GiST
cutover. The output includes a row-count parity check for every radius and an
`EXPLAIN (FORMAT JSON)` index-plan check. The command fails when the two
strategies return different counts or when the planner falls back to a
sequential scan, so a GiST rollout cannot be marked green by index presence
alone.

The synthetic script deliberately does not claim to represent production. Use
the database-backed, density and geospatial commands above for release
evidence, then record the outputs together with the selected market's catalog.
The public endpoint is limited to 120 requests/IP/minute and sends a five-second
shared-cache hint (`stale-while-revalidate=15`); the database pool applies
bounded query and statement timeouts from `DATABASE_QUERY_TIMEOUT_MS` and
`DATABASE_STATEMENT_TIMEOUT_MS`.
