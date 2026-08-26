# ADR-0007: Portable indexed geospatial discovery for the launch

Status: Accepted

## Context

AutoCare Hub needs accurate radius search, deterministic cursor pagination and
the same result universe for the list and map. The launch PostgreSQL image does
not guarantee that the PostGIS extension is available. Requiring an extension
that is absent in local, staging or a recovery environment would make discovery
unavailable exactly when it is needed most.

## Decision

- The launch implementation uses PostgreSQL-native SQL: a market-scoped
  bounding box narrows locations through B-tree indexes, then a great-circle
  expression in SQL makes the final radius decision.
- The public API returns the distance calculated by the server; browsers never
  recompute the result set from city names or client-only coordinates.
- Discovery is capped, cursor-paginated and rate-limited. Price, rating,
  verification, warranty, bonus, brand and radius constraints are applied in
  SQL before the bounded availability/ranking projection.
- The composite index added with migration `178615` supports the common market
  + latitude + longitude candidate lookup. The active-offering index supports
  the offering-first join.
- `npm --prefix server run benchmark:discovery` is the release gate. It must be
  run against a restored production-like dataset before a new market is opened;
  it reports p50/p95/p99/max latency and fails above the configured p95/p99 or
  request-failure budget. The density check
  (`npm --prefix server run check:discovery-density`) must also pass for the
  selected market and radius before opening a market.

## Consequences

This is not a text-based approximation: it is an exact radius predicate with
an index-friendly prefilter and works on standard PostgreSQL. PostGIS remains a
planned optional cutover when production infrastructure explicitly guarantees
the extension and benchmark data shows the native strategy is no longer within
the agreed budget. The geospatial benchmark compares both strategies at broad
radii and reports whether a GiST geography index is present. The API contract,
cursor fields and user-visible distance do not change during that cutover.
