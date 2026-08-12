# ADR-0003: Separate repair payments, subscriptions and bonuses

## Status

Proposed; repair-payment scope and bonus rules require product-owner approval.

## Context

The copied legacy booking project contains customer booking payments, a two-percent
commission and Stripe Connect payouts. AutoCare Hub is planned as free for
providers initially and later monetized through provider subscriptions. It also
needs provider-funded customer bonuses.

These flows represent different parties, liabilities and state machines.

## Decision

Maintain three separate bounded contexts:

1. customer repair/service payment — out of initial scope; provider collects
   directly unless a future ADR changes it;
2. provider subscription billing — provider pays AutoCare Hub for software/
   platform access;
3. provider bonus program — non-withdrawable provider-scoped customer loyalty
   value recorded in an immutable ledger.

Do not reuse legacy booking payment/commission entities for subscriptions. Reuse
only provider-agnostic reliability patterns such as signature verification,
idempotency, webhook persistence, retry and reconciliation.

## Consequences

- Legacy commission and Stripe Connect flows can be quarantined and later
  removed after the AutoCare booking replacement.
- Subscription promo codes do not alter bonus balances.
- Subscription failure does not rewrite booking/repair payment history.
- The platform avoids premature marketplace payout/KYC/dispute obligations.

## Revisit when

The product owner explicitly chooses to process customer repair payments and a
legal/payment-provider analysis is complete.
