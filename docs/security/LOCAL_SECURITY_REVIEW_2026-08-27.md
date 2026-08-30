# AutoCare Hub — local backend security review (2026-08-27)

This document records the controls that can be verified from the repository and
the local PostgreSQL environment. It is evidence for the release checklist,
not a substitute for a production penetration test or a provider's legal
retention approval.

## Controls verified in code

- Branch-scoped provider access is enforced in the service, request, quote,
  review, marketplace and chat paths. Owner/super-admin access remains
  provider-wide; manager/staff access is restricted to assigned locations.
- CSRF requests with duplicate token headers are rejected instead of silently
  accepting one value supplied by a proxy.
- Production startup rejects a missing distributed Redis configuration and
  rejects `REDIS_RATE_LIMIT_FAILURE_MODE=fail-open`. A Redis outage in a
  security-sensitive limiter returns `503` instead of falling back to a
  process-local bucket. Development/test may use the explicit fail-open
  default for local work.
- AutoCare attachments use a private storage adapter. Production requires an
  S3-compatible bucket plus ClamAV quarantine; only promoted objects receive a
  short-lived signed URL. Filesystem storage remains development-only.
- Account deletion removes account-related attachment metadata and objects,
  including media uploaded by another participant in the deleted user's
  request/chat, deletes
  personal bonus/favorite/session records, detaches provider ownership, and
  redacts retained booking, quote, request, chat, review, appeal, fleet,
  repair-event and security-event data.
- A machine-readable deletion-invariant inventory and an AutoCare relational
  integrity checker cover provider, branch, media, review, bonus and workflow
  tables. Pending `NOT VALID` constraints can be validated as part of release
  migration.
- Sensitive AutoCare reads and changes produce dedicated audit actions for
  request/contact access, evidence and attachment views, offer price updates,
  communication-mode changes, review discounts, and membership/invitation
  changes. Admin queue reads (appeals, evidence, provider changes, catalog
  gaps, chat reports and platform reviews), media uploads and owner membership
  list reads are also traced. Audit metadata contains technical IDs and
  bounded flags/counts only; it does not copy phone numbers, message bodies,
  vehicle identifiers, upload URLs or media.

## Local verification commands

Run from the repository root after PostgreSQL migrations are applied:

```bash
npm --prefix server run check:security
npm --prefix server run check:autocare-integrity
npm --prefix server run check:autocare-integrity -- --validate
npm --prefix server run check:account-deletion-retention
npm --prefix server run check:redis-rate-limit
npm --prefix server run check:production-media
npm run check:threat-surface
npm run check:migration-validation
```

`check:threat-surface` is a source-level regression gate for the highest-risk
surfaces: the global request/CSRF boundary, public discovery rate limiting,
AutoCare uploads, authenticated WebSockets, platform-review abuse controls and
admin moderation queues. It is deterministic and does not claim to replace an
independent penetration test or a staging replay.

`check:migration-validation` inventories every executable AutoCare constraint
created with `NOT VALID` and verifies that `check:autocare-integrity --validate`
is wired into the release migration command and checklist. It does not claim
that a remote database has already been validated; that still requires the
release job and recorded staging/production evidence.

`check:production-media` is intentionally a production-like preflight: it
requires S3 credentials and ClamAV, scans a clean payload and the EICAR test
signature, promotes a quarantined object, verifies a signed URL TTL, confirms
the URL never points at `quarantine/`, downloads the object and cleans it up.

`check:account-deletion-retention` checks the most recent completed deletion
requests (up to 1,000) against every invariant. It is safe to run repeatedly;
it does not mutate data.

The request/attachment and owner branch integration suites also exercise the
new audit actions after successful authorization. A failed authorization does
not create a sensitive-read audit entry.

`check:redis-rate-limit` verifies the configured distributed Redis endpoint is
reachable while the failure mode is `fail-closed`. The actual production
rehearsal must still be performed against a disposable Redis failover or
blocked endpoint in staging/production-like infrastructure and recorded with
the resulting `503` evidence.

## External release gates (not executable from this workspace)

The following remain intentionally open until the deployment owner supplies
the corresponding infrastructure and independent evidence:

1. Production Redis failover rehearsal with at least two API replicas and an
   alert proving that rate limits do not fail open.
2. Production S3-compatible private bucket, key rotation, lifecycle policy,
   ClamAV service and signed-access test using production identities.
3. Timed deletion/retention rehearsal on a production-like backup, including
   restore verification and confirmation that deleted-account media cannot be
   fetched with an old URL.
4. Independent security review/penetration test covering authorization,
   attachments, WebSockets, logs, CSRF, rate limits and account deletion.
5. Final jurisdiction-specific retention and privacy approval for the launch
   markets.

No production secret, customer data or real attachment was used by the local
checks.
