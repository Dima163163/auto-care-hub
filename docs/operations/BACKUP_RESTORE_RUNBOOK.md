# Backup, restore and alert rehearsal

## Required protection

- PostgreSQL: encrypted daily full backup plus point-in-time/WAL retention;
- Redis: persistence is operational state only and must be rebuildable;
- object storage: versioning, quarantine prefix and lifecycle policy for private
  attachments and provider media;
- secrets: managed secret store with rotation and no values in logs or exports.

## Restore rehearsal

1. Create a timestamped restore target isolated from production.
2. Restore PostgreSQL and verify migration version, AutoCare constraints,
   booking snapshots, trust snapshots, audit logs and retention metadata.
3. Restore media into quarantine and verify that private attachments are not
   publicly addressable.
4. Start API/worker against the restored target and run health, discovery,
   request, notification and export smoke checks.
5. Record RPO, RTO, missing rows, orphaned media and operator actions. Destroy
   the restore target after evidence is approved.

## Alerts

Alert on API 5xx rate, authentication failures, authorization denials,
WebSocket disconnect/error rate, outbox backlog/dead letters, upload
quarantine failures, booking transition conflicts, database connection pool
exhaustion and backup age. Alerts must contain IDs and metrics, never private
message text, VINs or photo contents.

The repository includes health/incident and outbox inspection surfaces; actual
provider alert routing and the restore rehearsal remain deployment work.

## Encrypted database scripts

`npm --prefix server run db:backup` now requires
`BACKUP_ENCRYPTION_PASSWORD_FILE` by default. It produces an encrypted
`*.sql.gz.enc` archive using AES-256-CBC with PBKDF2 and a separate SHA-256
checksum. Keep the password in the deployment secret manager, separate from
the archive storage and with an audited recovery owner. Store the checksum in
an access-controlled, immutable backup manifest; an archive and its checksum
must never be modifiable by the same untrusted principal.

`npm --prefix server run db:restore -- <archive> <isolated-db>` verifies the
checksum first and requires the same password file. It refuses restoring a
plain gzip archive unless `ALLOW_UNENCRYPTED_LOCAL_RESTORE=true` is supplied
for a deliberately local-only exercise. Likewise, an unencrypted backup needs
the explicit `ALLOW_UNENCRYPTED_LOCAL_BACKUP=true` opt-out. Neither opt-out is
allowed in staging or production.
