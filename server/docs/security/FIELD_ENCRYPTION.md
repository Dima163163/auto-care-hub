# Field encryption status

This document describes the application-layer encryption currently implemented for private database fields. It is a pre-production control for reducing the impact of a database-only leak; it is not a claim that the application is production-ready or that a compromised running backend cannot read its data.

## How it works

- Each non-null value is JSON-encoded and encrypted with a fresh random 256-bit data-encryption key (DEK) using AES-256-GCM.
- The DEK is separately wrapped with an AES-256-GCM key-encryption key (KEK). The database stores the authenticated envelope, key ID, nonce, tag, ciphertext, and wrapped DEK.
- Email and OAuth subject lookups use a separate HMAC-SHA-256 blind index. This keeps login, uniqueness checks, and OAuth matching functional without storing those values in clear text. Equal values produce equal indexes within one key domain, so an attacker with a database can still observe equality and frequency.
- TypeORM transformers preserve the application-facing entity shape for ordinary reads and writes. Raw SQL, exports, search, and background workers need explicit handling; the regression test covers the core ORM path.

## Encrypted fields

The migration encrypts the following existing data and entity transformers encrypt new writes:

- User name, phone, avatar URL, community display name, preferred city, email, provider-invitation email, and OAuth provider subject. Email and provider subject retain a blind index for lookup.
- Vehicle VIN, license plate, internal vehicle number, and image URL.
- Booking comments and cancellation reasons; reschedule and status-history reasons.
- Auto-service request contact/vehicle/estimate/quote/booking snapshots, notes, cancellation and no-show reasons, completion notes, and chat-thread subjects.
- Chat message bodies/offers, report descriptions and decision/assignment/extension reasons, chat-block reasons, and appeal reasons.
- Service-quote snapshots, trust-evidence notes/references, repair-event titles/notes/metadata, broadcast request/offer snapshots, guarantee-claim text, expert-question details, fleet labels/notes/snapshots, and provider/catalog change-request private payloads.
- Email and recipient-name values embedded in notification outbox payloads. Outbox email is replaced by a blind index; recipient name is removed from the clear-text field.

Public business listings, published public reviews, aggregate counters, state/status fields, timestamps, IDs, role/permission data, and fields needed for ordinary filtering remain readable in the database. Passwords remain one-way password hashes, not reversible encrypted values. Uploaded object contents are outside this field-encryption migration; private attachments require separate private-object storage and server-side encryption controls.

Operational security telemetry is a separate remaining gap: IP addresses and user-agent values in audit logs, security events, and user sessions, plus IP values in security mitigations, are still stored in clear text to preserve existing SQL filtering and response behavior. They need their own blind-index/ciphertext migration and retention review before production data is used.

## Local development

In non-production, the first use creates `server/.local-keys/data-encryption.json` with owner-only permissions. This keyring is ignored by Git and is only for local test data. Keep it available while that local database contains encrypted rows: deleting or replacing it makes those rows unreadable. Do not reuse it for production, copy it into a database backup, or commit it. `DATA_ENCRYPTION_LOCAL_KEYRING` can point to a different local keyring file.

The server refuses to boot in `NODE_ENV=production` until the process has an explicitly configured key provider. No production KMS adapter is included yet.

## Migration and rollback

Migration `1786410000000-EncryptSensitivePersonalData` adds ciphertext columns for identity lookup fields and encrypts existing values in place. It preflights duplicate normalized email values and duplicate pending invitation keys. The migration uses the same key provider as the application and must run with the intended keyring available. It runs transactionally, but transforms existing rows one by one; for large production tables it needs a staged, batched migration with progress, monitoring, and a tested maintenance/dual-read strategy.

The `down()` migration decrypts data back into clear-text columns. Do not use it as an automatic production rollback after real data exists. Any rollback plan must preserve access to all historical encryption keys, stop old/new writers safely, and explicitly account for the fact that old database snapshots and backups may still contain plaintext.

## Protection boundary

This control is intended to protect against a copy of the database or a database snapshot being stolen without the application key material. It does not protect against a compromised application process, an attacker with both database and key-provider access, an authorized application administrator, plaintext in process memory, screenshots/exports, or values copied into application logs, traces, analytics, email delivery, or object storage. The operational telemetry listed above also remains clear text. Authorization, audit, least privilege, retention limits, secret management, TLS, and incident response remain necessary.

AES-GCM authenticates the field and its table/column context. The current envelope is not bound to a specific row ID or market/tenant ID; ciphertext-swapping between rows in the same field is therefore a remaining integrity hardening item. Blind-index key rotation also needs a versioned backfill and dual-index rollout before production.

## Required before production data

1. Implement and test a cloud KMS/HSM-backed key provider with distinct keys per environment and market. The current provider interface exposes KEK bytes to the process and TypeORM transformers are synchronous, so this needs an explicit design decision: a carefully controlled in-process key cache, or moving encryption/decryption to an asynchronous repository/service boundary. Do not wire a cloud KMS by fetching a permanent plaintext key into environment variables.
2. Add row/tenant/market binding to authenticated data, key rotation and blind-index rotation procedures, and key availability/restore drills.
3. Replace backup AES-CBC with authenticated encryption (for example AES-256-GCM or age with recipient keys), keep backup keys separate from database and storage credentials, and prove a restore using only the documented recovery path.
4. Apply the migration only after a full encrypted backup and a rehearsal against a recent sanitized copy; inspect raw rows, API behavior, search/login, admin access, chat/moderation, data export/deletion, and background notifications.
5. Encrypt private attachments and all other object storage, remove public access, and verify lifecycle deletion and backup behavior.
6. Review logs, traces, error reporting, analytics, and exports for decrypted PII; restrict and audit data reads; establish retention/deletion and incident-response procedures.
7. Use TLS for every network hop, private database networking, separate least-privilege service identities, administrator MFA, secret rotation, and tested off-host recovery.

## Verification performed

The migration and identity/outbox round-trip test were exercised on the disposable local PostgreSQL database `autocarehub_encryption_qa_20260926`, including a plaintext backfill rehearsal. Migrations `178640` and `178641` were also applied to the local development database `autocarehub`; 213 existing synthetic user records were confirmed to have HMAC email indexes and ciphertext, and ORM reads/login lookup still returned plaintext to the application. No production database was accessed. See the task report for the current test results and remaining failures.
