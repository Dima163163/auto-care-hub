# ADR-0004: Durable service conversations and versioned quotes

## Status

Proposed for user approval.

## Context

Painting, body repair and other complex services cannot always be priced from a
catalog card. Customers need to ask a provider about a specific service and send
damage photos. Realtime delivery must not become the source of truth or risk
message loss.

## Decision

- A `ServiceInquiry` anchors a private conversation to customer, provider
  location, service definition and optional vehicle.
- Messages and attachment manifests are durable PostgreSQL records.
- Photos use private processed object storage and authorized short-lived access.
- Quotes are versioned snapshots with price/range, items, inclusions,
  exclusions, warranty, duration and expiry.
- Only a current valid sent quote may be accepted; acceptance is idempotent and
  transactionally creates/links a booking snapshot.
- REST create/list endpoints are the reliable baseline. WebSocket/SSE may add
  low-latency invalidation after durable behavior is proven.

## Consequences

- Reconnect/offline clients resume from cursor pagination.
- Mobile push is an alert, not the message store.
- Private content needs explicit retention/export/delete/moderation policies.
- Typing indicators/presence are optional post-MVP features.

## Revisit when

Usage proves that group conversations, voice/video/documents or external CRM
integration is required.
