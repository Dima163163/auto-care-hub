# Data Retention Policy

This policy describes the current backend cleanup behavior. It is an
implementation baseline, not legal advice; the deployment owner must align it
with the customer's jurisdiction and privacy notices before production launch.

## Authentication data

- Expired refresh sessions are deleted by the scheduled maintenance cycle.
- Expired password setup, password reset, and email verification token rows are
  deleted by the same cycle. Only token hashes are stored while a token exists.
- Session IP addresses and user-agent values are therefore retained only while
  the session is active or until its expiry cleanup runs.
- Authentication cleanup is bounded by `AUTH_CLEANUP_BATCH_SIZE` (1,000 by
  default) and uses expiry indexes for sessions, security tokens, and OAuth
  link requests so a large backlog does not require one unbounded delete.
- Access JWTs are short-lived and are not stored as server-side records.

## Audit data

- Audit rows are retained for `AUDIT_LOG_RETENTION_DAYS` (365 days by default).
- Cleanup runs in a transaction and requires the internal retention cleanup
  transaction flag, preserving the immutable-audit write guard for ordinary
  deletes.
- Super-admin audit CSV export is capped at 10,000 rows per request.

## Security investigation data

- Exact security-event IP addresses, user-agent values, and metadata copies of
  those values are retained for `SECURITY_EVENT_IP_RETENTION_DAYS` (30 days by
  default, bounded to 1-365 days and never longer than audit retention).
- The scheduled maintenance cycle clears those fields in a bounded batch while
  preserving the event's type, outcome, timestamps, correlation context, and
  append-only identity. The database trigger permits only this explicit
  privacy-cleanup shape under its transaction-local cleanup flag.
- Security events are then deleted after `AUDIT_LOG_RETENTION_DAYS`; ordinary
  application code cannot update or delete them. The Security Center displays a
  null IP after redaction rather than a misleading partially masked value.
- Exact IP access is restricted to super-admin Security Center reads and access
  is covered by audit entries. The deployment owner must align the default
  window and customer privacy notice with the applicable jurisdiction.
- Investigation assignees are references to active super-admin users on
  append-only action records. Removing an assignment preserves the prior
  action history; deleting or deactivating a user sets the current foreign-key
  reference to null without rewriting the security event. Assignment changes
  remain subject to the same no-store response and audit policy as other
  Security Center mutations.

## Uploaded files

- Cabinet image files that are no longer referenced by cabinet records are
  eligible for deletion after `CABINET_UPLOAD_ORPHAN_GRACE_HOURS` (24 hours by
  default).
- Object storage migration and provider-level lifecycle rules remain pending.

## Open work

Authenticated account export, the reviewed deletion-request lifecycle, and the
field-level anonymization contract are implemented. The deletion endpoint still
does not perform destructive deletion or anonymization automatically; a future
completion workflow must remain release-gated, audited, restart-safe, and
financial-record-safe.

The remaining operational work is to execute and verify that completion policy
for every financial record family, add a customer-facing privacy-settings
workflow, and retain export-delivery data according to the deployment's legal
schedule. Until those release gates exist, deployment operators must handle
verified data-subject requests through the documented support and database
procedures.
