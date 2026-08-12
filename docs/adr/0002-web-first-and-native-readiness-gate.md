# ADR-0002: Web first with a native readiness gate

## Status

Product sequence confirmed; technical details proposed for approval.

## Context

The product owner requires a stable, high-quality browser application before
starting iOS and Android. Starting native clients before API and workflows
stabilize would multiply contract and UX changes.

## Decision

Deliver responsive web first. All business logic stays in the Fastify backend
and new product endpoints use a versioned API. Native customer development may
begin only after the gate in `PROJECT_PLAN.md` passes.

The preferred native direction is Expo/React Native with generated/shared API
contracts, secure device credential storage, push notifications and deep links.
Provider/admin workspaces remain responsive web unless research proves a native
need.

## Consequences

- Mobile web is a first-class release target, not a temporary desktop shrink.
- API pagination, errors, media authorization and idempotency must not depend on
  browser implementation details.
- Browser cookie auth and native secure-token storage use the same identity
  domain but separate transport threat models.
- Native schedule is evidence-based rather than date-based.

## Revisit when

Stable web criteria pass and product analytics/user research demonstrate the
value of native apps.
