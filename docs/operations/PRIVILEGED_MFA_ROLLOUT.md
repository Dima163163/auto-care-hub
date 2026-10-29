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

The recovery codes are one-use. If all are lost, there is currently no
application reset flow: a reviewed operator procedure to verify identity,
replace the factor, revoke sessions and record an audit trail is still needed.
Step-up for sensitive actions and staging replay are also open under U03.
