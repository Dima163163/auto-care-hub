# Privileged MFA rollout (local implementation, pending staging acceptance)

Admin and super-admin password login requires a six-digit authenticator code or
one unused recovery code. Linked Google/Yandex identities cannot sign in to
these roles. Existing privileged sessions lack `mfa_verified_at` and are denied
by access and refresh checks after this code is deployed.

## Provision each account

1. Apply migration `1786810000000-CreatePrivilegedMfaFactors` in a maintenance
   window with the production KMS keyring available.
2. In a private interactive operator terminal configured for that environment,
   run `npm --prefix server run mfa:provision -- admin@example.com` for each
   existing privileged account. The command refuses redirected output and
   refuses an already enrolled factor.
3. Give the authenticator URI to the intended account holder through a private
   channel. The holder scans it and stores the ten recovery codes offline.
   Clear the terminal after handoff. Never put the URI or codes in tickets,
   chat, logs, Git or screenshots.
   Newly invited administrators need the factor provisioned before completing
   their password setup link; that form also requires the authenticator code.
4. Verify a fresh password plus authenticator login and a refresh rotation on
   staging. Verify rejection without a code, replay of an accepted time step,
   reuse of a recovery code, and rejection of old privileged sessions.
5. Repeat the controlled provisioning and verification for production before
   opening privileged access to operators.

The recovery codes are one-use. For a lost factor and exhausted recovery codes:

1. Verify the target holder's identity through the organization's separate
   recovery process and record the case ID. This CLI does not verify that
   external identity check or approve the case.
2. Obtain two distinct, active super-admin approvers other than the target.
   Each must enter their own MFA code directly into the private terminal.
   Run `npm --prefix server run mfa:reset -- target@example.com approver1@example.com approver2@example.com TICKET-123`.
   Codes are hidden during entry and never passed as command arguments.
3. The transaction checks both approvers' roles and factors, removes the old
   factor and recovery codes, deletes the target's sessions, increments its
   token version, provisions a replacement and records the ticket and both
   approvers in the audit log. Deliver the new URI and codes privately to the
   target. Verify a new login and rejection of old tokens on staging.

If two independent super-admin factors are unavailable, this procedure fails
closed. A separate break-glass governance process still needs approval and
staging rehearsal; do not use a manual database edit as an undocumented reset.
Step-up now protects user, trust-policy, security-center, outbox and
account-deletion mutations plus audit/security CSV exports after five minutes.
Admin and super-admin chat reports, private chat history, attachment reads and chat WebSocket
access require the same fresh proof. Their `/v1/chats` subject index also
requires it before listing threads. Creating support/escalation chats, reporting,
sending or deleting messages, uploading attachments, overriding blocks and
marking reads also require fresh proof for admin/super-admin. Live WebSocket
authorization rechecks it before each delivery and every 30 seconds; an
expired proof closes the socket at the next check. The super-admin index lists
only support/escalation chats; private request chats use per-thread audited
access with a reason. The admin index includes assigned moderation cases,
without provider membership widening. Super-admin service-request detail also
requires fresh proof before its private DTO.
Admin access to a private request chat requires an active assigned moderation
report even if the admin also has provider membership. The request-to-chat
shortcut rejects admin and super-admin; exceptional review uses the audited
chat route.
Legacy request conversation, attachment and WebSocket endpoints reject both
privileged roles before private content; moderation uses the audited chat
route instead.
Each privileged chat index read records actor, role and item count without
copying chat subjects into the audit log.
Private admin dashboards in `admin.routes.ts` and the platform review queue
require fresh proof before returning their data. The market hierarchy remains
under role authorization without step-up because it is public catalog metadata.
All admin/super-admin moderation, provider, catalog, market, cabinet and
platform-review mutations in those route modules require the same proof before
validation or write. Stale requests return `MFA_STEP_UP_REQUIRED` for the
shared frontend retry flow.
A fresh code is consumed through `/auth/step-up`
and the original operation is retried. Other sensitive actions and staging
replay, other modules' sensitive routes, external identity verification
and break-glass acceptance remain open
under U03.
