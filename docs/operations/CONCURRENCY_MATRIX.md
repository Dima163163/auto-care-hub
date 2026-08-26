# Booking concurrency matrix

`server/src/modules/autocare/concurrency-matrix.ts` is the release contract for
reschedule, cancellation, no-show and booking races. The PostgreSQL integration
suite covers branch and specialist capacity, plus the terminal transition races;
the matrix keeps the remaining multi-actor cases explicit:

- two client decisions for one reschedule: one commit, one conflict;
- client and owner cancellation race: one commit, one conflict;
- duplicate no-show retries: one state change, idempotent retry;
- two clients for one instant resource: one booking, one conflict;
- two owner actors confirming one request: one commit and an idempotent replay;
- owner proposal retries for one reschedule: one pending row, one conflict;
- client accepts the same reschedule twice: one state change, idempotent replay;
- no-show and completion racing for one accepted visit: one terminal state,
  one conflict.

Run the unit contract without infrastructure with `npm --prefix server run
test:unit`. Run the database-backed rows with Docker/staging before enabling a
new market; multi-process Redis and production-like p99 evidence remain release
gates.
