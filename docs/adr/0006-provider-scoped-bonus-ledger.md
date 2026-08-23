# ADR-0006: Provider-scoped bonus ledger

Status: Accepted

## Context

AutoCare Hub needs a loyalty signal that services can fund for their own
customers. It must not become a platform-wide wallet, a payment rail or a
cash-withdrawal balance. A visit may be retried by a worker or a client may
refresh after completion, so earning must be idempotent and auditable.

## Decision

- A provider owns one active bonus program with a configurable earning
  percentage, optional per-visit cap and optional expiry interval.
- A client gets one account per provider. The account stores only integer
  points and aggregate counters.
- Every change is an append-only ledger entry with a type, reason, request
  reference and idempotency key. Balance constraints prevent negative values.
- Earning occurs only inside the locked transaction that changes a confirmed
  service request to `closed`, using the immutable booking/quote amount.
- Redemption, expiry and audited manual adjustments are separate commands and
  remain disabled until their policy and permissions are approved.
- The backend owns all calculations; web and future mobile clients consume the
  same `/api/v1/bonuses/my` contract.

## Consequences

The first slice is explainable and safe to expose as balance/history without
creating payment liabilities. Redemption and expiry can be added without
rewriting completed visit records, but require additional authorization,
concurrency and abuse tests before activation.
