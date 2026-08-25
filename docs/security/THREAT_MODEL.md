# AutoCare Hub web threat model

Status: implementation baseline complete; external security review remains a
release gate.

## Scope and trust boundaries

The model covers the public browser, the Fastify API, PostgreSQL, Redis,
object/media storage, the notification outbox, WebSocket service conversations,
and the owner/admin/super-admin workspaces. Customer repair payment is outside
the platform boundary and is agreed directly with the provider.

## High-value assets

- account sessions, refresh tokens, CSRF tokens and role/membership claims;
- provider/customer contact details, vehicle VINs and service-request history;
- private message attachments and provider-uploaded media;
- immutable booking, quote, bonus, review and audit evidence;
- trust scores, moderation decisions and market configuration.

## Main threats and controls

| Threat | Control in the repository | Evidence to collect before pilot |
| --- | --- | --- |
| Cross-tenant owner access | provider/location membership guards and owner-scoped queries | PostgreSQL role matrix with two providers and two branches |
| Session/CSRF abuse | signed sessions, bearer/native boundary, production CSRF guard, rate limits | deployed browser and native-auth replay tests |
| Private media disclosure | attachment ownership checks, bounded uploads, quarantine/storage policy | object-storage ACL and signed URL expiry test |
| WebSocket origin/protocol abuse | allow-listed origins, bearer subprotocol, payload and rate guards | staging handshake fuzz and disconnect evidence |
| Quote/booking tampering | immutable snapshots, idempotency keys and locked transitions | concurrent PostgreSQL transition test |
| Review/trust manipulation | verified-visit policy, anomaly scoring, audit events and suspension-safe ranking | moderation appeal and false-positive review |
| Data export/deletion leakage | bounded sanitized export and retention/anonymization jobs | restore/export/delete rehearsal with sampled rows |
| Supply-chain/config drift | lockfiles, typed deployment capabilities, security headers and CI checks | signed build artifact and environment diff |

## Release blockers

The following cannot be marked complete from local code alone: independent
penetration testing, production object-storage policy verification, real
PostgreSQL/Redis concurrency evidence, legal retention approval, and incident
response rehearsal. The MVP remains fail-closed when required production
secrets or infrastructure are absent.

## Review procedure

1. Run `npm run lint`, `npm test -- --run`, the server unit suite, API parity,
   OpenAPI shape/structure and migration checks.
2. Run the integration prerequisite check with production-like Redis,
   PostgreSQL and JWT secrets.
3. Execute the role/tenant, upload, WebSocket, export/deletion and concurrent
   booking scenarios from the evidence matrix.
4. Record findings, owner, severity, mitigation and retest date in the release
   incident log before enabling a real pilot.
