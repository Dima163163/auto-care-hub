# Concurrency Test Matrix

| Area | Concurrent actors | Expected invariant | CI evidence |
| --- | --- | --- | --- |
| Refresh rotation | Two requests with one refresh token | At most one replacement session survives; reuse revokes active sessions. | `npm --prefix server run test:integration` |
| OAuth state consumption | Two callbacks with one state hash | One callback consumes the state and the replay is rejected. | `npm --prefix server run test:integration` |
| Outbox processing | Two maintenance workers | Row locking and stale leases prevent duplicate dispatch. | `npm --prefix server run test:integration` |
| Scheduler leadership | Two maintenance cycles | PostgreSQL advisory lock allows one cycle and skips the other. | `npm --prefix server run test:integration` |
| Account deletion | Repeated request and cancel calls | Pending uniqueness and status transitions remain valid. | `npm --prefix server run test:integration` |
| Cabinet image cleanup | Upload and cleanup overlap | Grace period prevents deletion before the upload can be referenced. | Unit policy only; storage boundary remains open. |
| Booking overlap | Two requests for the same cabinet slot | Exactly one request succeeds and the other receives a conflict. | `npm --prefix server run test:integration` |
| AutoCare instant capacity | Two clients create an instant booking for the same AutoCare branch, overlapping time and capacity `1` | Exactly one booking is accepted; the other transaction returns `409` and no over-capacity row is persisted. | `autocare-capacity.integration.test.ts` |
| AutoCare manual confirmation | An owner confirms two pending requests for the same branch, overlapping time and capacity `1` | Exactly one request becomes `accepted`; the other confirmation returns `409`. | `autocare-capacity.integration.test.ts` |
| Incident deduplication | Two workers record the same failure | One durable incident row is retained with a stable fingerprint. | `npm --prefix server run test:integration` |

Every matrix row should be exercised with PostgreSQL and Redis enabled in CI or a production-like staging environment. Unit tests cover the decision helpers; integration tests must cover the locking and transaction boundaries.

The explicit integration profile is intentionally small and sequential. It is a
signal that the selected locking boundaries ran against PostgreSQL; it does not
claim that every matrix row is complete. The rows marked open require dedicated
fixtures and cleanup before they can be promoted to the CI evidence column.
