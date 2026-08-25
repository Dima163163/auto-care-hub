# Booking concurrency matrix

`server/src/modules/autocare/concurrency-matrix.ts` is the release contract for
reschedule, cancellation, no-show and booking races. The existing PostgreSQL
integration suites cover branch-capacity confirmation and instant booking; the
matrix keeps the remaining multi-actor cases explicit:

- two client decisions for one reschedule: one commit, one conflict;
- client and owner cancellation race: one commit, one conflict;
- duplicate no-show retries: one state change, idempotent retry;
- two clients for one instant resource: one booking, one conflict;
- two owner actors confirming one request: one commit, one conflict.

Run the unit contract without infrastructure with `npm --prefix server run
test:unit`. Run the database-backed rows with Docker/staging before enabling a
new market.
