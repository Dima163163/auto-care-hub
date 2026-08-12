# Financial Data Retention Contract

This is the implementation contract for deletion behavior. It is not legal
advice and must be reconciled with the customer's jurisdiction, privacy notice,
tax rules, and configured retention schedule before production use.

## Deletion decisions

| Record family | Required policy | Reason |
| --- | --- | --- |
| `booking_payments`, invoices, refunds, disputes | `RESTRICT` | Financial evidence must remain linked to its booking and payment. Reconcile or retain the parent record before deletion. |
| Bookings referenced by payments, invoices, refunds, disputes, and reviews | `RESTRICT` | A booking is the business context for financial and customer records. |
| Booking payment attempts and reschedule requests | `CASCADE` | These are operational children; they do not replace the durable payment/refund ledger or legal invoice record. |
| Cabinet owner, booking client, and review actors | `RESTRICT` | Deactivation or anonymization must happen before removing an identity still referenced by business records. |
| Audit/security actors and event assignees | `SET NULL` where nullable | Preserve the immutable action/event while removing the direct person reference when policy permits. Required action actors remain restricted. |
| Sessions, security tokens, OAuth links, notifications, favorites, and deletion requests | `CASCADE` | These are user-scoped operational or transient records and have no financial evidentiary value. |
| Cabinet services, schedules, exceptions, and blocked periods | `CASCADE` | These are configuration children and cannot outlive their cabinet. Cabinet deletion remains blocked by referenced bookings/reviews. |

The payment, invoice, refund, and dispute foreign keys are checked by the
startup schema contract, including the actual PostgreSQL delete action. A
database that reports the expected constraint name with `CASCADE` instead of
`RESTRICT` fails readiness before API or worker traffic starts.

## Account lifecycle

The current account-deletion endpoint creates, lists, and cancels a reviewed
request; it does not delete or anonymize an account automatically. A future
completion workflow must first reconcile or retain financial records, preserve
required audit history, anonymize personal fields according to an approved
policy, and only then remove transient user-scoped children. No migration may
weaken the financial `RESTRICT` constraints to make that workflow appear to
complete.

## Field-level anonymization contract

The implementation contract in
`server/src/modules/users/account-anonymization-policy.ts` is intentionally
pure and non-destructive until the deployment owner approves the legal basis,
retention schedule, and provider offboarding procedure. It defines the
following completion order:

1. Replace the user's name and email with a deterministic reserved identity;
   clear credentials, contact data, avatar, locale, and preferences; revoke
   sessions, security tokens, OAuth links, notifications, and favorites.
2. Preserve booking dates, statuses, cabinet/service references, payment
   amounts, currencies, provider identifiers, refunds, disputes, and invoices.
   Redact booking free-text fields that can contain personal data.
3. Preserve review rating, moderation status, booking link, and timestamps while
   replacing review text with the bounded deletion marker.
4. Preserve audit action and timestamp, set nullable actor references to null,
   and redact metadata before any retention deletion.

The policy is idempotent by construction and does not authorize a direct
database update. The eventual completion job must apply it in one audited,
restart-safe workflow after financial reconciliation and legal approval.

### Retained financial families

The completion workflow must apply the following field-level actions:

- Completed bookings keep business, cabinet, service, status, and schedule
  references; client references remain linked through the booking, while
  comments, cancellation reasons, and owner notes are redacted.
- Reviews keep rating, moderation status, booking/cabinet references, and
  timestamps; the client remains represented through the retained booking and
  review text is replaced with the bounded deletion marker.
- Invoices keep amount, currency, status, issue time, invoice/payment links,
  and provider references; no identity fields are copied into the ledger.
- Refunds and disputes keep bounded amount, currency, status, timestamps,
  provider references, and dispute event cursors; free-text reasons are
  redacted before any user-scoped identity is removed.
- Provider evidence keeps bounded identifiers and settlement fields only;
  raw payloads and personal metadata are never retained by the anonymization
  workflow.

This is a policy contract, not an authorization to run deletion. Legal basis,
provider offboarding, transaction boundaries, restart checkpoints, and an
audited operator approval remain release gates.

## Operational checks

- Run the schema readiness gate after every migration and before enabling API or
  worker traffic.
- Treat a financial FK policy mismatch as a release blocker, not a cleanup
  warning.
- Keep provider identifiers, amounts, currencies, refund ledger rows, and
  invoice state bounded and auditable; never log raw provider payloads.
- Validate backup/restore and account-deletion exercises against this matrix
  before the retention plan is considered production-ready.
