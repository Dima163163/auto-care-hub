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
access require the same fresh proof. Live WebSocket authorization rechecks it
before each delivery and every 30 seconds; an expired proof closes the socket
at the next check. Super-admin
service-request detail also requires fresh proof before its private DTO.
A fresh code is consumed through `/auth/step-up`
and the original operation is retried. Other sensitive actions and staging
replay, other sensitive reads, external identity verification
and break-glass acceptance remain open
under U03.
