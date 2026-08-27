# Legacy commission module removal

Date: 2026-08-27

The unused `server/src/modules/commission` module and its unit test were
removed after a repository-wide import audit found no application or worker
runtime consumer. AutoCare Hub does not calculate platform commission for
repair bookings; customers pay providers directly during the free launch
phase.

Historical payment and commission migrations remain immutable under
`server/src/database/migrations/` because an existing database may still have
those tables. They are not loaded by any current service module and must only
be removed in a separately approved fresh-database migration plan.

Validation performed:

- `rg` import audit: no runtime consumer of `server/src/modules/commission`;
- legacy payment-provider runtime check remains green;
- migration order and inventory checks remain required before deployment.
