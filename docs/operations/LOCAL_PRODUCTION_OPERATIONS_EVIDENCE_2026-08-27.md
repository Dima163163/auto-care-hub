# Local production operations evidence — 27 Aug 2026

This record covers only the disposable local environment. It is not a
production sign-off and does not replace staging/production evidence.

## Completed locally

- Docker daemon: available, Docker server `29.2.1`.
- PostgreSQL and Redis: started from `server/docker-compose.yml`.
- Migration smoke: `npm --prefix server run migration:smoke` passed; the
  migration runner reported no pending migrations on both executions.
- Redis/WebSocket: `npm --prefix server run smoke:autocare-realtime` passed with
  two subscriber processes and repeated event identity.
- Encrypted backup: `server/scripts/backup.sh` produced an AES-256-CBC/PBKDF2
  archive and SHA-256 checksum in a disposable temporary directory.
- Restore rehearsal: the archive restored into an isolated database; the
  restored database contained 73 public tables and latest migration
  `1786250000000`. The temporary database, password file and archive were
  removed after verification.
- Repository operations contract: `npm run test:ops-harness` passed (6 tests).

## Still requires deployment evidence

- Production `NODE_ENV`, PostgreSQL/Redis/JWT, SMTP, persistent media path,
  S3 attachment storage, outbox key and bootstrap super-admin values.
- Staging API URL and a required external OpenAPI compatibility probe.
- Alert destinations and a redacted alert delivery rehearsal.
- Worker/reminder/outbox smoke with production-like SMTP and credentials.
- Timed rollback rehearsal against the deployment provider.

Run the complete repository preflight with:

```bash
npm run check:production-operations -- --env-file server/.env
```

Use `--strict` only inside a release job that injects the real deployment
configuration and has attached external evidence.
