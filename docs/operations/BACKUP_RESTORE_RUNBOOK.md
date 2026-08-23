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
