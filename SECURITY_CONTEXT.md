# AutoCare Hub Security Context

Read this file before AutoCare work involving authentication, authorization,
providers, messages, private media, bonuses, subscriptions, promo codes,
payments, deletion/export, deployment or operational security.

`SECURITY.md` describes the current legacy-derived implementation baseline.
This file records target AutoCare boundaries that do not exist fully in code
yet. `ARCHITECTURE.md` remains the complete target architecture.

## Reusable baseline

Preserve and extend the current:

- short-lived JWT access tokens and rotating server-backed refresh sessions;
- session revocation, token-version invalidation and reuse detection;
- email verification and one-time hashed setup/reset tokens;
- Google/Yandex OAuth state/callback protections;
- double-submit CSRF and Origin/Referer checks for browser cookie mutations;
- Helmet/CSP/HSTS and restricted credentialed CORS;
- trusted-proxy allowlist and normalized client IP handling;
- Redis-backed distributed rate limits for production multi-instance use;
- bounded Zod inputs and database constraints;
- structured audit/security events without raw secrets/private contents;
- health/readiness, metrics, outbox and incident workflows;
- safe image decode/re-encode and orphan cleanup patterns.

Do not assume those controls automatically authorize new AutoCare resources.

## Authorization model

Global roles:

- client;
- admin/moderator;
- super admin.

The legacy global `owner` role is transitional. Provider business access uses an
active `ProviderMembership`, permission and optional location scope.

Every non-public provider resource access verifies:

1. authenticated active user;
2. active membership in the resource's provider;
3. exact permission for the action;
4. allowed location scope;
5. target ownership resolved from the database, not a client claim.

Every client resource verifies the authenticated customer owns the vehicle,
booking, inquiry, conversation, attachment, quote or bonus account. Add negative
IDOR tests for adjacent providers/users and for blocked/revoked membership.

Localization is not authorization: translating a provider/location response into
the client's preferred language must never broaden resource access or expose
private provider/customer fields.

Super-admin-only actions include admin management, subscription plan governance,
manual entitlement grants/revocations and promo-code management. Critical
actions require audit reason/correlation and should support re-authentication or
step-up confirmation before production launch.

## Private conversations and attachments

- A conversation is limited to its customer and authorized members of the
  selected provider/location.
- Routine admins do not receive blanket access to private message/photo content.
- Exceptional support/moderation access records actor, reason, resource, scope
  and time.
- Do not log or emit analytics containing message bodies, quote private notes,
  VIN, registration numbers, raw filenames or attachment contents.
- Customer damage/vehicle photos use private storage and short-lived authorized
  access, never public predictable URLs.
- Validate count, byte size, magic bytes, decoded dimensions and animation;
  re-encode supported images without metadata.
- Add malware scanning before accepting non-image documents.
- Upload/message sends are rate-limited and idempotent.
- Retention, export, tombstone and legal deletion rules must be approved before
  public launch.

## Booking and quotes

- Validate all quote/booking prices server-side in integer minor currency units.
- Only a current, sent, unexpired quote version may be accepted.
- Quote acceptance and booking creation are idempotent and transactional.
- Booking records preserve immutable service/price/provider/vehicle/timezone/
  policy snapshots.
- Concurrent slot creation must be protected by PostgreSQL transaction/constraint
  behavior, not an in-memory check.
- State transitions are allowlisted per current state and actor.

## Bonuses

- Provider-scoped; never transferable between providers or withdrawable as cash.
- Immutable ledger is authoritative; cached balance is a rebuildable projection.
- Earn/redeem/reverse/expire/adjust actions are transactional and idempotent.
- Never trust a client-provided balance, earned amount or discount.
- Manual adjustment requires provider permission, reason, bounded amount and
  audit event.
- Prevent negative balance and double redemption with database constraints/
  locking.
- Cancellation/refund reversal rules require an approved product decision.

## Provider subscriptions and promo codes

- Provider subscription billing is separate from customer repair payments and
  customer bonuses.
- Entitlements are evaluated server-side from explicit active sources.
- Super-admin manual grants do not overwrite billing history.
- Grants/revocations require reason, actor, validity and audit correlation.
- Promo code redemption is normalized, rate-limited, atomic and idempotent.
- Eligibility, plan/period scope, validity and redemption limits are checked
  server-side.
- Discount value/currency/rules are snapshotted into the billing record.
- Billing webhooks require signature verification, unique provider-event
  persistence, idempotent processing, retry/reconciliation and incident paths.
- Downgrade/expiry must not delete provider data.
- Subscription plan must not silently change organic search ranking.

Historical customer booking-payment and commission schemas are not approved
AutoCare subscription implementations and have no active runtime integration.

## Mobile security gate

Before native development:

- define OAuth Authorization Code + PKCE/deep-link flow;
- store refresh credentials only in Keychain/Keystore-backed secure storage;
- rotate/revoke server-backed device sessions and detect reuse;
- ensure bearer-auth media upload/download does not rely on browser cookies;
- define push payload minimization and lock-screen privacy;
- threat-model lost devices, rooted/jailbroken devices and deep-link hijacking;
- complete an iOS/Android privacy and secure-storage test matrix.

## Logging and observability

Allowed identifiers should be pseudonymous/stable enough for incident response
without storing sensitive content. Do not use provider/customer-supplied strings
as unbounded metric labels. Redact authorization, cookie, token, promo-code and
billing secrets from errors.

Security-relevant metrics include authorization denials, upload rejection,
message delivery lag, quote-accept conflicts, bonus reconciliation failures,
promo redemption rejection, billing webhook/reconciliation outcomes and outbox
backlog. Alerts must not include private message or photo data.

## Required verification

For every sensitive vertical slice:

- unit tests for policy/state/normalization;
- PostgreSQL integration tests for ownership, constraints, idempotency and
  concurrency;
- route-level negative auth/IDOR tests;
- log/metric privacy review;
- upload/webhook abuse tests where applicable;
- migration and rollback/data-safety review;
- threat-model update for new trust boundaries.
