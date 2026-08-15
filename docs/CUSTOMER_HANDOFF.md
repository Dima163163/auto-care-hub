# AutoCare Hub Customer Handoff

This is the technical handoff checklist for a self-hosted or managed AutoCare Hub
deployment. The customer should receive the URLs, operating contacts, and
secret-management location, but never receive committed `.env` files or raw
database credentials in chat.

## 1. Required services

- Frontend hosted on Vercel or another HTTPS static host.
- Fastify backend hosted on Render or another Node.js host.
- PostgreSQL database reachable by the backend.
- Redis for shared rate limiting when running more than one backend instance.
- SMTP/provider account for verification, password, and booking emails.

## 2. Environment handoff

Configure secrets in the hosting provider, not in Git:

- `DATABASE_URL` or the complete `DATABASE_*` set;
- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`;
- `CORS_ORIGINS` and `FRONTEND_ORIGIN`;
- `TRUSTED_PROXY_HOPS` and `TRUSTED_PROXY_CIDRS` only after verifying the
  proxy network that connects directly to the backend;
- `CABINET_PHOTO_ALLOWED_HOSTS` only for exact, customer-approved HTTPS photo
  hostnames;
- `CABINET_UPLOADS_DIR` when filesystem cabinet storage uses a mounted
  persistent volume;
- `REDIS_URL` or the Redis host/port settings;
- complete SMTP settings with `MAIL_MODE=smtp`;
- `BOOTSTRAP_SUPER_ADMIN_EMAIL` and `BOOTSTRAP_SUPER_ADMIN_NAME`.

Production must use HTTPS, strong unique JWT secrets, and real SMTP. Never
reuse demo credentials or the local password `123456` in production.

### Client IP and Render proxy policy

The backend does not trust `X-Forwarded-For` by default. This is intentional:
an exposed backend must not let callers choose the IP used by audit logs,
session records, suspicious-login checks, or rate limits.

When Render (or another provider) terminates the public connection, configure
`TRUSTED_PROXY_HOPS` to the exact number of trusted proxy hops and
`TRUSTED_PROXY_CIDRS` to the provider's currently verified proxy CIDR ranges.
Keep the values at `0` and empty when the backend is reached directly. Never
copy arbitrary client IPs, broad public ranges, or an unverified
`X-Forwarded-For` value into the allowlist. Re-test with a direct request that
spoofs `X-Forwarded-For`: the logged client IP must remain the socket peer.

Cabinet uploads are decoded and re-encoded server-side, capped by byte size,
dimensions, and total pixels, and metadata is stripped. Cabinet photo lists
accept owned `/uploads/cabinets/<uuid>.<ext>` paths or HTTPS URLs whose exact
hostname is in `CABINET_PHOTO_ALLOWED_HOSTS`; arbitrary HTTP, credentials in
URLs, and unlisted hosts are rejected.

## 3. First administrator

Set the bootstrap email and name before the first production backend start.
The backend creates or upgrades that account to `super_admin` and issues the
one-time password setup flow. Complete the setup link, sign in, and confirm:

1. the account has `super_admin` access;
2. the setup token cannot be reused;
3. the email delivery works;
4. the admin audit page and system-incidents tab are available.

Remove bootstrap values from deployment configuration after the first
verified handoff when the deployment process no longer needs them.

## 4. Deployment order

1. Provision PostgreSQL, Redis, backend, frontend, and SMTP.
2. Configure secrets and allowed frontend origins.
3. Deploy backend dependencies and build the server.
4. Run `npm run check:mvp-readiness` in the production-shaped environment and
   resolve every `BLOCKED` configuration result. `MANUAL` results still need
   provider or project-owner evidence.
5. Run `npm run release:migrate` once as the release job; wait for success
   before starting any new web replica.
6. Start web replicas with `npm run start:server`; they must not run migrations.
7. Deploy the frontend with the real API base URL.
8. Verify the backend health check:

```bash
curl -i https://autocare-hub-api.example.com/health/ready
```

Use `/health/live` to distinguish a running API process from a ready API with
working dependencies. `/health` remains a readiness alias for existing hosting
checks.

9. Verify guest catalog, client login, owner workspace, admin moderation, and
   super-admin audit access in the browser.

For zero-downtime schema changes, use expand/contract releases. First add
backward-compatible nullable columns, tables, indexes, or enum values; deploy
code that can read both old and new shapes; backfill in bounded idempotent
batches; switch writes and reads; then remove old columns or constraints only
after all old replicas are gone. Roll back application code before attempting a
schema rollback, and do not run destructive `migration:revert` operations in
production unless the migration is explicitly tested as data-safe.

## 5. Backup and restore ownership

Agree with the customer on backup frequency, retention, encryption, storage,
and the person authorized to restore data. A backup is not verified until it
has been restored into a non-production PostgreSQL database and the application
can read the restored schema.

The local backup command is:

```bash
cd server
npm run db:backup
```

Restore rehearsals should use a separate empty database:

```bash
npm run db:restore -- backups/db_backup_TIMESTAMP.sql.gz autocarehub_restore
```

The command refuses to target the configured production database unless an
operator explicitly sets `ALLOW_SAME_DATABASE_RESTORE=true`. This override is
intentionally absent from the normal handoff flow.

Production backup scheduling and restore access must be configured in the
hosting/database provider. Store backup files outside the application repo.

## 6. Acceptance checklist

- [ ] Frontend and backend domains are recorded.
- [ ] HTTPS and CORS are verified.
- [ ] `/health/live` returns process liveness and `/health/ready` returns all
      configured dependency checks as `ok`.
- [ ] Production SMTP sends verification/reset mail.
- [ ] Bootstrap super-admin completed password setup.
- [ ] Demo users and demo secrets are absent from production.
- [ ] A backup restore rehearsal has an owner and a recorded result.
- [ ] Incident contacts and escalation windows are documented.
- [ ] Customer receives the incident runbook and deployment contact.
