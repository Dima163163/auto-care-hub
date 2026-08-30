# AutoCare Hub Incident Runbook

Use this document for production incidents affecting the frontend, API,
database, Redis, email delivery, bookings, or provider communications. Never
paste secrets, access tokens, passwords, or full cookies into an incident
channel.

## 1. Triage

### Suspicious client IPs or rate-limit bypasses

Check `TRUSTED_PROXY_HOPS` and `TRUSTED_PROXY_CIDRS` first. The backend trusts
forwarded client IPs only when the connecting peer matches an allowlisted CIDR
and the hop is within the configured limit. If the proxy ranges are uncertain,
set `TRUSTED_PROXY_HOPS=0` and clear `TRUSTED_PROXY_CIDRS`, redeploy, and treat
the resulting socket-peer IPs as the source of truth until the provider ranges
are verified. Do not resolve this by enabling `trustProxy=true` or by trusting
all forwarded headers.

Record the UTC start time, affected environment, customer impact, the latest
deployment, and the first request ID that reproduces the issue.

Check API readiness:

```bash
curl -i https://autocare-hub-api.onrender.com/health/ready
```

Check process liveness separately when readiness is failing:

```bash
curl -i https://autocare-hub-api.onrender.com/health/live
```

Interpret the result:

- `200` with `status: ok`: all configured readiness probes succeeded.
- `503` with `status: degraded`: the process is running, but at least one
  dependency probe failed; inspect `checks.database`, `checks.redis`,
  `checks.outbox`, and `checks.storage`.
- timeout or DNS failure: check Render service status, deployment logs, and
  DNS/TLS before changing application data.

Check the frontend deployment separately by opening the public Vercel URL and
the public cabinet catalog. A frontend failure with a healthy API usually
points to a Vercel deployment, environment variable, asset, or CORS issue.

## 2. Correlate the failure

Use the `X-Request-Id` response header from the failing request. Search the
structured backend logs by that ID and inspect the matching audit record when
the operation is security-sensitive or administrative:

- authentication and CSRF failures;
- booking mutations;
- moderation and account status changes;

Authorization and cookie values are redacted by the application. Continue to
avoid copying them into external tools or tickets.

Provider failures are recorded with operation, provider, and request metadata;
OAuth response bodies and access tokens are intentionally unavailable in logs.
Demo-data CLI output is separate from the production service log path.

## 3. Common response paths

### API or database outage

1. Confirm `/health` and Render service logs.
2. Check whether the incident started immediately after a deployment.
3. If the release is the likely cause, roll back the Render service to the
   previous known-good version.
4. Do not run migrations manually while a rollback is in progress.
5. After recovery, verify `/health`, login, public catalog, and a read-only
   booking page before declaring the incident resolved.

### Migration or release rollback

1. Stop the release and confirm that `release:migrate` completed only once.
2. Keep existing web replicas serving while an additive migration is still
   compatible with the previous application version.
3. Roll back the application image first; do not run `migration:revert` as an
   automatic response to a failed web deploy.
4. Use destructive schema changes only in a later contract release, after old
   replicas and old code paths are fully removed and a verified backup exists.
5. Check migration status, `/health`, and the read-only booking flow before
   resuming a rollout.

### Redis outage

Production rate limits fail closed when Redis is unavailable: security-sensitive
requests return `503` and must not fall back to a process-local bucket. Confirm
that the API remains healthy, restore Redis, and verify the distributed limiter
before scaling the backend horizontally. A local-memory fallback is permitted
only for explicitly configured development/test environments and must never be
enabled in production.

### Email delivery outage

1. Check SMTP provider status and Render environment values without printing
   `SMTP_PASSWORD`.
2. Verify that `MAIL_MODE=smtp` and all SMTP values are present.
3. Check whether the provider rejected the sender or exceeded a rate limit.
4. Do not switch production to `MAIL_MODE=logger`; that would expose one-time
   setup/reset links in logs.
5. Retry the affected account flow only after the provider is healthy.

### Security incident

1. Revoke affected user sessions from the Security Center event context, or use
   the existing
   password/session invalidation flow.
2. Rotate the affected secret in the hosting provider and redeploy.
3. Preserve request IDs, timestamps, user IDs, and audit entries needed for
   investigation.
4. Never delete audit records to hide an incident.
5. Notify the project owner before restoring access to blocked accounts.

### Security Center investigation workflow

Use the super-admin Security Center as the system of record for application-
level attack investigation:

1. Filter by the incident window, normalized route, event class, severity, IP,
   request ID, actor role, authentication outcome, or rate-limit result.
2. Open one event to review its bounded timeline, operator context, related
   audit entries, and system incidents. Treat a missing IP or user-agent as a
   deliberate retention redaction, not as an unknown source that should be
   reconstructed from another log.
3. Assign the investigation to an active super-admin when ownership is needed.
   Assignment is append-only, audited, and can be removed without changing
   the original event.
4. Acknowledge, investigate, resolve, or suppress the event only after the
   operator has selected the appropriate status. Suppression is for
   non-actionable signals and does not delete the event history.
5. Use the bounded redacted CSV export for handoff. Keep the active filters,
   request IDs, and export audit record with the incident ticket; never export
   secrets, tokens, cookies, raw bodies, or payment data.
6. Apply temporary IP mitigation or session revocation only with an explicit
   confirmation and a recovery path. Application-level blocks expire after a
   bounded TTL. An active block may be extended under a row lock, but the
   resulting expiry cannot exceed 24 hours from the extension action; revoked
   or expired blocks require a new reviewed reason. Volumetric traffic that
   never reaches the API must be handled and evidenced by the edge/WAF provider.

The assignment migration must be applied before a release that serves the
assignment UI. A schema-contract failure is a release blocker: run the
forward-only release migration and verify readiness before starting web
replicas or maintenance workers.

## 4. Recovery verification

Run the smallest safe smoke check after recovery:

```bash
curl -fsS https://autocare-hub-api.onrender.com/health/ready
npm run lint
npm test
npm run build
npm --prefix server run build
```

For a database-affecting recovery, also verify the migration status and run a
restore rehearsal in a non-production database before changing production
data. Confirm that the public catalog, client login, owner booking workspace,
and admin audit page work in the deployed browser.

## 5. Closeout

The incident can be closed after the service is healthy, customer impact has
stopped, the mitigation is documented, and a follow-up owner/date exists for
the root-cause fix. Record whether rollback, secret rotation, data repair, or
provider escalation was required.
