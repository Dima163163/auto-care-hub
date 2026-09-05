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
- AutoCare request and chat attachments use a private store. Production requires
  S3-compatible private storage and ClamAV quarantine; access is issued only
  through short-lived signed URLs.
- The maintenance cycle deletes expired attachment rows and their private/
  quarantine objects using `AUTOCARE_ATTACHMENT_RETENTION_DAYS`. A failed
  object deletion leaves the database row in place for a safe retry.
- Completing an account-deletion request first removes every attachment
  uploaded by that user, then deletes its metadata. If storage deletion fails,
  the database transaction is rolled back. This does not restore objects already
  deleted from storage: cross-store atomicity must not be assumed. Partial-failure
  recovery, idempotent retries and metadata/object reconciliation remain required
  release evidence under V2-SEC-14 in `operations/PILOT_SCOPE_FREEZE.md`.

## Open work

Authenticated account export and the audited deletion-request completion flow
are implemented. Completion blocks the account, removes active sessions,
private contact/vehicle/message data, personal bonus accounts and ledgers,
provider memberships and unaccepted invitations. Providers owned by the deleted
account are suspended and detached rather than silently transferred; a
super-admin must perform a documented ownership-transfer/review before they can
be republished. Immutable completed-booking/audit references remain only in the
redacted form needed for settlement and safety review.

The remaining release gate is external: the deployment owner must approve the
jurisdiction-specific retention schedule, execute a timed production-like
deletion/restore rehearsal and record the result in release evidence.
