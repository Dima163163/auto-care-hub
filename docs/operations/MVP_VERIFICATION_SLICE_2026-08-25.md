# MVP verification slice — 25 Aug 2026

## Implemented in the feature branch

- Conversation APIs and both chat UIs now load the latest messages first and
  expose `previousCursor` for older-message pagination. MSW implements the same
  contract so mock and real modes exercise the same interaction.
- Quote snapshots copy line items instead of sharing mutable references; the
  accepted price and quote version remain stable after an offer is edited.
- Resource-level capacity policy covers specialists, bays, lifts and equipment
  and has deterministic selection and overlap tests. Database wiring remains a
  release gate before resource-backed services are enabled.
- The reschedule/cancellation/no-show/booking concurrency matrix is explicit and
  validated as a contract; database race rows remain infrastructure-backed.
- Deterministic discovery benchmarks cover 10,000 and 100,000 records. The
  portable baseline and database runner report p50/p95/p99/max with bounded
  concurrency and failure gates; a separate density check reports selected
  market supply by radius and category. PostGIS/GiST remains deliberately
  skipped until a PostGIS-enabled staging database has the required geography
  GiST index.
- Operational checks verify encrypted backup, checksum and same-database
  restore guards, required alerts, and absence of Bookly runtime references.

## Verification completed locally

- `npm --prefix server run test:unit` — 177 files, 539 tests passed.
- `npm --prefix server run build` — passed.
- `npm run build` — Next.js production build passed.
- `npm run lint` — passed.
- `npm run check:api-contract` and `npm run check:api-parity` — passed.
- `npm run test:ops-harness` — passed.
- Synthetic benchmark (compiled Node runner): 10k p95 2.3 ms; 100k p95
  19.8 ms on the local machine.

## Release gates requiring infrastructure

The following are intentionally not marked complete without the required
environment: PostgreSQL/Redis integration and concurrency runs, PostGIS/GiST
comparison, resource reservation persistence, Redis/WebSocket/worker/outbox
smoke, external staging compatibility, and an actual backup/restore rehearsal.
The local integration runner currently exits before tests because PostgreSQL,
Redis and JWT integration secrets are not configured; this is an environment
blocker, not a skipped test claim.
