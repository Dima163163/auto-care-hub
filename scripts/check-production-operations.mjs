import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

import { formatIntegrationPrerequisiteFailure, getMissingIntegrationPrerequisites } from './check-integration-prerequisites.mjs'

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url))
export const PROJECT_ROOT = resolve(SCRIPT_DIRECTORY, '..')

const SECRET_PLACEHOLDER_PATTERN = /(?:replace|change[-_ ]?me|mock|example\.com|admin@example\.com)/i

function hasConfiguredValue(value) {
    const normalized = String(value ?? '').trim()
    return Boolean(normalized) && !SECRET_PLACEHOLDER_PATTERN.test(normalized)
}

function hasStrongSecret(value, minimumLength = 32) {
    const normalized = String(value ?? '').trim()
    return hasConfiguredValue(normalized) && normalized.length >= minimumLength
}

function check(name, status, detail) {
    return { name, status, detail }
}

function parseDotEnv(source) {
    const values = {}
    for (const line of String(source).split(/\r?\n/)) {
        const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line)
        if (!match) continue
        let value = match[2]
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1)
        }
        values[match[1]] = value
    }
    return values
}

export function loadEnvironmentFile(filePath) {
    return parseDotEnv(readFileSync(filePath, 'utf8'))
}

function getEnvironmentWithOptionalFile(environment, envFile) {
    if (!envFile) return environment
    const fileValues = loadEnvironmentFile(resolve(PROJECT_ROOT, envFile))
    return { ...fileValues, ...environment }
}

function getRuntimeConfigurationChecks(environment) {
    const checks = []
    const nodeEnv = String(environment.NODE_ENV ?? '').trim().toLowerCase()
    checks.push(nodeEnv === 'production'
        ? check('Production runtime mode', 'pass', 'NODE_ENV=production is explicitly configured')
        : check('Production runtime mode', 'blocked', 'set NODE_ENV=production for a production operations rehearsal'))

    const integrationMissing = getMissingIntegrationPrerequisites(environment)
    checks.push(integrationMissing.length === 0
        ? check('PostgreSQL, Redis, and JWT configuration', 'pass', 'database, Redis and signing secrets are configured')
        : check('PostgreSQL, Redis, and JWT configuration', 'blocked', formatIntegrationPrerequisiteFailure(integrationMissing).split('\n')[0]))

    const weakJwtSecrets = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']
        .filter((name) => !hasStrongSecret(environment[name]))
    checks.push(weakJwtSecrets.length === 0
        ? check('JWT secret strength', 'pass', 'access and refresh secrets meet the 32-character production minimum')
        : check('JWT secret strength', 'blocked', `${weakJwtSecrets.join(', ')} must be random, non-placeholder values of at least 32 characters`))

    const smtpNames = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'MAIL_FROM']
    const missingSmtp = environment.MAIL_MODE !== 'smtp'
        ? ['MAIL_MODE=smtp']
        : smtpNames.filter((name) => !hasConfiguredValue(environment[name]))
    checks.push(missingSmtp.length === 0
        ? check('SMTP configuration', 'pass', 'SMTP mode and non-placeholder delivery settings are configured')
        : check('SMTP configuration', 'blocked', `missing or placeholder values: ${missingSmtp.join(', ')}`))

    const cabinetUploadsDir = String(environment.CABINET_UPLOADS_DIR ?? '').trim()
    checks.push(hasConfiguredValue(cabinetUploadsDir)
        ? check('Persistent media storage path', 'pass', 'CABINET_UPLOADS_DIR is explicit; mount durability is still an infrastructure gate')
        : check('Persistent media storage path', 'blocked', 'set CABINET_UPLOADS_DIR to an approved persistent volume path'))

    const attachmentProvider = String(environment.AUTOCARE_ATTACHMENT_STORAGE_PROVIDER ?? '').trim().toLowerCase()
    if (nodeEnv === 'production' && attachmentProvider !== 's3') {
        checks.push(check('Private attachment storage', 'blocked', 'production requires AUTOCARE_ATTACHMENT_STORAGE_PROVIDER=s3'))
    } else if (attachmentProvider === 's3') {
        checks.push(check('Private attachment storage', 'pass', 'S3-compatible attachment storage is selected; bucket, credentials and signed access remain deployment secrets'))
    } else {
        checks.push(check('Private attachment storage', 'manual', 'local filesystem attachment storage is allowed only for development; configure S3 before production'))
    }

    const s3Names = ['AUTOCARE_ATTACHMENT_S3_BUCKET', 'AUTOCARE_ATTACHMENT_S3_ACCESS_KEY_ID', 'AUTOCARE_ATTACHMENT_S3_SECRET_ACCESS_KEY']
    const missingS3 = attachmentProvider === 's3'
        ? s3Names.filter((name) => !hasConfiguredValue(environment[name]))
        : []
    if (attachmentProvider === 's3') {
        checks.push(missingS3.length === 0
            ? check('Private attachment storage credentials', 'pass', 'S3 bucket and credentials are configured without exposing values')
            : check('Private attachment storage credentials', 'blocked', `missing or placeholder values: ${missingS3.join(', ')}`))
    }

    const bootstrapMissing = ['BOOTSTRAP_SUPER_ADMIN_EMAIL', 'BOOTSTRAP_SUPER_ADMIN_NAME']
        .filter((name) => !hasConfiguredValue(environment[name]))
    checks.push(bootstrapMissing.length === 0
        ? check('Bootstrap super-admin', 'pass', 'bootstrap identity is explicitly configured')
        : check('Bootstrap super-admin', 'blocked', `missing or placeholder values: ${bootstrapMissing.join(', ')}`))

    checks.push(hasStrongSecret(environment.OUTBOX_TOKEN_ENCRYPTION_KEY)
        ? check('Outbox secret', 'pass', 'OUTBOX_TOKEN_ENCRYPTION_KEY is configured without exposing its value')
        : check('Outbox secret', 'blocked', 'set a random OUTBOX_TOKEN_ENCRYPTION_KEY of at least 32 characters'))

    return checks
}

const OPERATIONAL_CONTRACTS = [
    {
        name: 'Worker runtime contract',
        files: {
            'render.yaml': ['key: RUNTIME_MODE\n        value: worker', 'startCommand: "npm run start:server"'],
            'server/src/server.ts': ['shouldStartWorker', 'startBackgroundJobs'],
        },
        detail: 'Render declares a dedicated worker and the server starts background jobs only for worker/all modes',
    },
    {
        name: 'Reminder, outbox, and dead-letter contract',
        files: {
            'server/src/modules/jobs/maintenance-jobs.service.ts': ['booking.reminder', 'processOutboxBatch', 'dead_letter'],
            'server/src/modules/outbox/outbox.service.ts': ['OUTBOX_MAX_ATTEMPTS', 'getOutboxFailureDisposition'],
            'server/src/routes/health.route.ts': ['dead_letter_threshold_exceeded', 'outbox_readiness_threshold_breach'],
        },
        detail: 'reminders, bounded retries, dead-letter transitions and readiness metrics are wired',
    },
    {
        name: 'Encrypted backup/restore harness',
        files: {
            'server/scripts/backup.sh': ['openssl enc -aes-256-cbc', 'shasum -a 256', 'BACKUP_ENCRYPTION_PASSWORD_FILE'],
            'server/scripts/restore.sh': ['shasum -a 256 -c', 'ALLOW_SAME_DATABASE_RESTORE', '--set ON_ERROR_STOP=1'],
            'docs/operations/BACKUP_RESTORE_RUNBOOK.md': ['Restore rehearsal', 'encrypted daily full backup'],
        },
        detail: 'backup encryption, checksum verification, isolated restore guard and runbook are present',
    },
    {
        name: 'Alert configuration',
        files: {
            'docs/operations/alerts.example.yml': ['AutoCareApiUnavailable', 'AutoCareOutboxDeadLetter', 'AutoCareBackupExpired'],
            'docs/OBSERVABILITY.md': ['Configure these alerts'],
        },
        detail: 'API, outbox and backup alert rules are versioned; provider destinations remain external',
    },
    {
        name: 'Rollback and migration contract',
        files: {
            'render.yaml': ['preDeployCommand: "npm run release:migrate"', 'startCommand: "npm run start:server"'],
            'docs/INCIDENT_RUNBOOK.md': ['Migration or release rollback', 'Do not run migrations manually while a rollback is in progress'],
            'docs/RELEASE_CHECKLIST.md': ['Record the migration inventory checksum', 'rollback owner'],
        },
        detail: 'forward migrations, migration-free start and rollback runbook are documented',
    },
]

export function checkOperationalContracts(root = PROJECT_ROOT) {
    return OPERATIONAL_CONTRACTS.map((contract) => {
        const missing = []
        for (const [relativePath, fragments] of Object.entries(contract.files)) {
            let content
            try {
                content = readFileSync(resolve(root, relativePath), 'utf8')
            } catch {
                missing.push(relativePath)
                continue
            }
            for (const fragment of fragments) {
                if (!content.includes(fragment)) missing.push(`${relativePath}: ${fragment}`)
            }
        }
        return missing.length === 0
            ? check(contract.name, 'pass', contract.detail)
            : check(contract.name, 'blocked', `missing controls: ${missing.join('; ')}`)
    })
}

export function checkDockerDaemon(run = spawnSync) {
    let result
    try {
        result = run('docker', ['info', '--format', '{{.ServerVersion}}'], {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
        })
    } catch {
        return check('Docker daemon', 'blocked', 'Docker CLI is unavailable; start Docker Desktop before local service-backed checks')
    }
    if (result?.status === 0) {
        const version = String(result.stdout ?? '').trim()
        return check('Docker daemon', 'pass', version ? `Docker daemon is ready (server ${version})` : 'Docker daemon is ready')
    }
    return check('Docker daemon', 'blocked', 'Docker daemon is unavailable; start Docker Desktop before local service-backed checks')
}

function getExternalEvidenceChecks(environment) {
    const checks = []
    const stagingUrl = String(environment.STAGING_API_BASE_URL ?? '').trim()
    checks.push(stagingUrl
        ? check('Staging API compatibility', 'manual', 'run REQUIRE_STAGING_API=true npm run check:staging-api against the configured staging URL')
        : check('Staging API compatibility', 'manual', 'set STAGING_API_BASE_URL and run REQUIRE_STAGING_API=true npm run check:staging-api'))
    checks.push(check('Worker/Redis/SMTP smoke', 'manual', 'run migration, worker, reminder-outbox and multi-process Redis/WebSocket smoke with staging credentials'))
    checks.push(check('Backup/restore rehearsal', 'manual', 'create an encrypted backup and restore it into an isolated database; record RPO/RTO and evidence'))
    checks.push(check('Alert delivery', 'manual', 'configure on-call destinations and fire a redacted synthetic alert for each critical rule'))
    checks.push(check('Rollback rehearsal', 'manual', 'deploy a release candidate, verify migration gate, roll back application and retain the release artifact/checksum'))
    return checks
}

export function getProductionOperationsChecks(environment = process.env, options = {}) {
    const effectiveEnvironment = getEnvironmentWithOptionalFile(environment, options.envFile)
    const dockerCheck = options.dockerCheck ?? checkDockerDaemon()
    return [
        ...getRuntimeConfigurationChecks(effectiveEnvironment),
        dockerCheck,
        ...checkOperationalContracts(options.root ?? PROJECT_ROOT),
        ...getExternalEvidenceChecks(effectiveEnvironment),
    ]
}

export function formatProductionOperationsReport(checks) {
    const lines = ['AutoCare Hub production operations preflight']
    for (const item of checks) lines.push(`[${item.status.toUpperCase()}] ${item.name}: ${item.detail}`)
    const blocked = checks.filter((item) => item.status === 'blocked').length
    const manual = checks.filter((item) => item.status === 'manual').length
    lines.push(`Result: ${blocked > 0 ? `blocked by ${blocked} gate(s)` : 'local contracts are ready'}; ${manual} external rehearsal gate(s) remain manual.`)
    return lines.join('\n')
}

function getFlagValue(args, flag) {
    const index = args.indexOf(flag)
    return index >= 0 ? args[index + 1] : undefined
}

async function main() {
    const args = process.argv.slice(2)
    const envFile = getFlagValue(args, '--env-file')
    const checks = getProductionOperationsChecks(process.env, { envFile })
    if (args.includes('--json')) console.log(JSON.stringify(checks, null, 2))
    else console.log(formatProductionOperationsReport(checks))
    const blocked = checks.some((item) => item.status === 'blocked')
    const strict = args.includes('--strict') || process.env.REQUIRE_PRODUCTION_OPERATIONS === 'true'
    if (blocked || (strict && checks.some((item) => item.status === 'manual'))) process.exitCode = 1
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main()
