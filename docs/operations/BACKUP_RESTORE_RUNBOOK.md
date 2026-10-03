# Backup, restore and alert rehearsal

## Required protection

- PostgreSQL: encrypted daily full backup plus point-in-time/WAL retention;
- Redis: persistence is operational state only and must be rebuildable;
- object storage: versioning, quarantine prefix and lifecycle policy for private
  attachments and provider media;
- secrets: managed secret store with rotation and no values in logs or exports.

## Restore rehearsal

Record the run in `BACKUP_RESTORE_EVIDENCE_TEMPLATE.md`; the archive, checksum
and evidence must be stored under separate access controls.

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
`*.sql.gz.enc` archive in versioned ACHBKP01 format: AES-256-GCM, PBKDF2-SHA256
(600000–2000000 iterations), random 16-byte salt, 12-byte nonce, authenticated
header and 16-byte tag. Node.js is required. Keep the password in the deployment
secret manager, separate from archive storage and with an audited recovery owner.
A separate SHA-256 checksum detects transfer errors; it is not the authentication
boundary. The AEAD tag prevents an attacker from authorizing altered ciphertext
by rewriting the checksum.

`npm --prefix server run db:restore -- <archive> <isolated-db>` verifies the
checksum first and requires the same password file. It refuses restoring a
plain gzip archive unless `ALLOW_UNENCRYPTED_LOCAL_RESTORE=true` is supplied
for a deliberately local-only exercise. Likewise, an unencrypted backup needs
the explicit `ALLOW_UNENCRYPTED_LOCAL_BACKUP=true` opt-out. Neither opt-out is
allowed in production. Use encrypted archives for staging as well.

Each backup archive receives a per-run suffix, so concurrent jobs cannot
overwrite the same timestamped file. The checksum records only the archive
basename and restore verifies it from the archive directory, allowing an
approved operator to move the archive and checksum together before an
isolated restore. Authentication completes before gzip validation and complete
decompression into a mode-0700 temporary directory with mode-0600 files. Only
then is psql started with `ON_ERROR_STOP=1` and a single transaction; no decrypt
or gzip producer runs concurrently with SQL consumption. Temporary files are
removed on exit. Reserve space for both compressed and full SQL copies; protect
the temporary filesystem as private data storage.

Legacy AES-CBC archives are rejected; they have no cryptographic authenticity
proof. Create fresh authenticated backups from a trusted source database. Keep
existing archives for a separately approved offline recovery investigation;
never automatically convert or execute them. Existing archives are not modified
by this code change. A live isolated PostgreSQL restore and timed RPO/RTO/media
rehearsal remain external evidence; offline synthetic psql tests do not close it.

The tag is accepted only after decipher finalization, as required by the
[Node.js crypto API](https://nodejs.org/api/crypto.html#deciphersetauthtagbuffer-encoding).
