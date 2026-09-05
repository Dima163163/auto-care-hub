# Stable web release evidence template

Copy this file for each release candidate. Attach redacted artifacts only;
never commit customer names, phone numbers, VINs, message text, photo content,
tokens or production credentials.

## Release identity

| Field | Value |
| --- | --- |
| Release candidate |  |
| Git commit |  |
| Artifact SHA-256 |  |
| Clean source / dev dirty manifest hash |  |
| Scope version | PILOT_SCOPE_FREEZE v2.0 |
| Configuration fingerprint (no secret values) |  |
| Evidence signature (algorithm/signer/reference) |  |
| Published migration manifest SHA-256 |  |
| Migration inventory SHA-256 |  |
| Environment | staging / production |
| Market and city |  |
| Product owner |  |
| Operations owner |  |
| Security/privacy reviewer |  |
| Evidence date |  |

## Pilot and marketplace quality

| Check | Pass condition | Artifact / metric | Owner | Status |
| --- | --- | --- | --- | --- |
| Provider/customer participants | At least two verified providers and consented customer journeys | Redacted participant IDs and run dates | Marketplace | ☐ |
| Real pilot evidence gate | Anonymized evidence document passes `npm run check:pilot-evidence` | Gate output and evidence file checksum | Operations | ☐ |
| Catalog coverage | Every pilot category has an active definition and provider offer | Catalog export and missing-price report | Marketplace | ☐ |
| Price quality | Missing/stale prices and quote-required categories are within agreed thresholds | Price review export and threshold decision | Marketplace | ☐ |
| Supply density | Providers and active offers meet the selected radius threshold | Discovery density export by zone | Marketplace | ☐ |
| Provider response | p50/p95 first response meets the agreed SLO | Quality-monitoring export | Operations | ☐ |
| Booking reliability | No duplicate slot, snapshot or confirmation in concurrent journeys | Booking IDs, conflict report and test notes | Engineering | ☐ |

## Security, privacy and resilience

| Check | Pass condition | Artifact / metric | Owner | Status |
| --- | --- | --- | --- | --- |
| Production security review | No open P0/P1 authorization, CSRF, upload or WebSocket findings | Redacted review report | Security | ☐ |
| Data export/deletion | Export is bounded; deletion/anonymization follows approved retention rules | Rehearsal IDs and sampled row counts | Privacy | ☐ |
| Retention purge | Audit/notification cleanup removes only eligible records | Before/after counts and policy version | Privacy | ☐ |
| Alerts | API, auth, booking, outbox, upload, database and backup alerts reach owners | Alert test timestamps | Operations | ☐ |
| Backup | Encrypted backup completed and age is within policy | Backup job ID and checksum | Platform | ☐ |
| Restore rehearsal | Isolated restore meets RPO/RTO and health/discovery smoke checks pass | Restore ticket and timings | Platform | ☐ |

## Web delivery and API compatibility

| Check | Pass condition | Artifact / metric | Owner | Status |
| --- | --- | --- | --- | --- |
| Responsive/accessibility/locale | Supported device matrix has no overflow, keyboard or screen-reader blocker | Matrix screenshots/report | Frontend | ☐ |
| SEO/prerender | Public route list, canonical/robots/sitemap and metadata validate | Lighthouse/HTML validation report | Frontend | ☐ |
| Map/media budgets | Map tiles and media stay within route budgets with lazy/offline fallback | Production performance export | Frontend | ☐ |
| Staging API | OpenAPI version/paths, health and mock parity checks pass against staging | `check:staging-api` output and OpenAPI hash | Engineering | ☐ |

## Go/no-go decision

For each required V2 gate attach command/exit code, measured value, pre-agreed
threshold, environment, release/artifact identity, execution date, evidence URI,
owner, reviewer and dependency references. The release promotion checker requires
all 54 fixed V2 IDs to be explicitly `pass`; required gates cannot be waived.
Local summaries and checkmarks alone are not sign-off.

Technical admission to real data requires all A–D gates in
`PILOT_SCOPE_FREEZE.md`, plus applicable participant consent. Pilot completion
additionally requires all E gates and the signed decision on this candidate.
Any required missing/failed/stale evidence, open P0/P1, unresolved privacy/legal
gap, failed restore or inconsistent booking snapshot is an automatic `NO-GO`.
Required security/data/release gates cannot be waived in this template.

The immutable promotion check is intentionally separate from local diagnostics:

```bash
PUBLISHED_MIGRATION_MANIFEST=/secure/applied-migrations.json \
RELEASE_EVIDENCE_FILE=/secure/release-evidence.json \
RELEASE_ARTIFACT_PATH=/secure/autocare-hub-artifact.tgz \
npm run check:release-promotion
```

The migration manifest must contain the checksummed sources already applied to
the target database. A changed published migration is blocked and requires a
forward correction migration; an absent manifest is also a release blocker.
The checked-in `.github/workflows/release-promotion.yml` downloads the reviewed
evidence, migration manifest and artifact from one immutable source run, verifies
the checkout is clean at the requested full SHA, then runs this gate behind the
production environment approval.
