# Production operations preflight

`npm run check:production-operations` is the repository-level gate for the
operational prerequisites in section 17 of the MVP plan. It deliberately
separates evidence that can be checked from source in this repository from
evidence that needs a deployment account or production-like infrastructure.

Run the local contract check from the project root:

```bash
npm run check:production-operations
```

For a local environment file, pass it explicitly. Process environment values
always take precedence over values in the file:

```bash
npm run check:production-operations -- --env-file server/.env
```

The command never prints secret values. `--strict` turns the external
`MANUAL` gates into a failing result, which is suitable for a staging release
job after the required URLs, credentials and evidence paths are injected:

```bash
REQUIRE_PRODUCTION_OPERATIONS=true npm run check:production-operations -- --strict
```

## Repository-complete controls

The gate verifies the worker runtime contract, reminder/outbox/dead-letter
handling, encrypted backup and restore guards, critical alert rules, and the
forward-migration/rollback runbook. These checks do not claim that a provider
has delivered an alert or that a database restore was successful.

## External gates

The following require an operator and remain `MANUAL` until evidence is
attached: staging OpenAPI compatibility, two-process Redis/WebSocket and
worker/SMTP smoke, an encrypted restore rehearsal into an isolated database,
alert delivery, and application rollback. Use
`docs/operations/RELEASE_EVIDENCE_TEMPLATE.md` to record timestamps, release
commit, migration checksum, RPO/RTO and the incident owner.

Production also requires `NODE_ENV=production`, PostgreSQL/Redis/JWT,
SMTP, an explicit persistent `CABINET_UPLOADS_DIR`, an S3 attachment provider,
an outbox encryption key and bootstrap super-admin identity. The preflight
fails closed when these values are absent or still contain example
placeholders.
