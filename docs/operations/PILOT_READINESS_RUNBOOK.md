# AutoCare Hub pilot readiness runbook

This runbook is the operational counterpart to Phase 9 of `PROJECT_PLAN.md`.
It separates evidence that can be produced locally from evidence requiring real
providers, customers and production infrastructure.

## Pilot sequence

1. Choose a launch market and at least two verified providers with distinct
   locations, service categories and booking modes.
2. Seed the canonical catalog, price ranges, hours, blackout dates, vehicle
   compatibility and neutral fallback media.
   Run `npm --prefix server run check:pilot-quality` with `PILOT_MARKET_ID`
   and the agreed thresholds before inviting customers. The check reads the
   same PostgreSQL quality aggregates exposed to admins and fails closed when
   a market has no providers, offers or usable prices.
3. Run provider tests for profile publication, quote response, confirmation,
   completion, review response and phone-based customer contact.
4. Run customer tests for discovery, comparison, request creation, quote
   acceptance/decline, cancellation, reschedule, no-show and review revision.
5. Capture response-time, booking-success, cancellation, no-show, attachment
   failure and support-contact metrics without storing message/photo content in
   telemetry.
   Before the go/no-go review, run `npm --prefix server run
   check:pilot-reliability` with the agreed SLO thresholds. Empty samples are
   blocked rather than treated as a passing zero.
6. Hold a go/no-go review with product, support, security and the legal entity.

## Minimum evidence

| Area | Pass condition | Owner |
| --- | --- | --- |
| Supply density | every pilot category has an active provider in the selected radius | marketplace |
| Response reliability | provider acknowledgement and quote latency are measured and meet the agreed SLO | operations |
| Booking reliability | no duplicate slot, snapshot or confirmation during concurrent tests | engineering |
| Trust | badge evidence, complaints and appeals are reviewed by an authorized operator | trust & safety |
| Support | a customer and a provider can reach support and receive a tracked answer | support |
| Recovery | backup restore, outbox retry and media quarantine are rehearsed | platform |

The quality preflight is a data gate, not pilot evidence: it cannot replace
real provider/customer sessions, response-time measurements or support sign-off.
The latest disposable local run is recorded in
`LOCAL_PILOT_QUALITY_EVIDENCE_2026-08-25.md`; its reliability gate remains
blocked until real response samples are collected.

## Stop conditions

Pause the pilot for any P0 authorization/data-loss issue, an unbounded upload or
WebSocket abuse path, inconsistent price/booking snapshots, or a legal/privacy
approval gap. Do not enable provider subscriptions or paid placement during the
free customer launch.
