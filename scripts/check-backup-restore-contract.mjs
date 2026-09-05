import { createHash, randomUUID } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url))
export const PROJECT_ROOT = resolve(SCRIPT_DIRECTORY, '..')

const BACKUP_NAME_PATTERN = /^db_backup_(\d{8}_\d{6})_(\d+)_([0-9]+)\.sql\.gz(?:\.enc)?$/
const SHA256_PATTERN = /^[a-f0-9]{64}$/i
const SECRET_PATTERN = /(password|secret|token|authorization|cookie|bearer)\s*[:=]\s*[^\s,;]+/gi

const CONTRACT_FILES = {
    backup: {
        path: 'server/scripts/backup.sh',
        fragments: [
            'umask 077',
            'BACKUP_ENCRYPTION_PASSWORD_FILE',
            'RUN_SUFFIX=',
            'shasum -a 256',
            'BACKUP_MARKER_FILE',
            'find "$BACKUP_DIR" -type f',
        ],
    },
    restore: {
        path: 'server/scripts/restore.sh',
        fragments: [
            'shasum -a 256 -c',
            'ALLOW_SAME_DATABASE_RESTORE',
            '--set ON_ERROR_STOP=1',
            '--single-transaction',
            'ALLOW_UNENCRYPTED_LOCAL_RESTORE',
        ],
    },
    runbook: {
        path: 'docs/operations/BACKUP_RESTORE_RUNBOOK.md',
        fragments: [
            'RPO',
            'RTO',
            'restore target isolated from production',
            'encrypted daily full backup',
            'no values in logs or exports',
        ],
    },
    evidence: {
        path: 'docs/operations/BACKUP_RESTORE_EVIDENCE_TEMPLATE.md',
        fragments: [
            'RPO (minutes)',
            'RTO (minutes)',
            'Encrypted archive created',
            'Isolated restore target',
            'Never put',
        ],
    },
    quarantine: {
        path: 'server/src/modules/autocare/autocare-attachment-storage.ts',
        fragments: [
            'buildAutoCareAttachmentOrphanReport',
            'cleanupOrphanedAutoCareAttachmentObjects',
            'gracePeriodMs',
            "candidate.storageTier === 'quarantine'",
            'removeAutoCareAttachmentQuarantineObject',
        ],
    },
}

function pass(name, detail) {
    return { name, status: 'pass', detail }
}

function blocked(name, detail) {
    return { name, status: 'blocked', detail }
}

export function validateBackupArchiveName(name) {
    const basename = String(name ?? '')
    if (basename.includes('/') || basename.includes('\\') || basename !== basename.trim()) return false
    return BACKUP_NAME_PATTERN.test(basename)
}

export function validateBackupArchiveNames(names) {
    const normalized = names.map((name) => String(name ?? ''))
    const duplicates = normalized.filter((name, index) => normalized.indexOf(name) !== index)
    return {
        valid: normalized.every(validateBackupArchiveName) && duplicates.length === 0,
        duplicates: [...new Set(duplicates)],
        invalid: normalized.filter((name) => !validateBackupArchiveName(name)),
    }
}

export function parseSha256Manifest(manifest, expectedBasename) {
    const line = String(manifest ?? '').trim()
    const match = /^([a-f0-9]{64})\s+[* ]?([^\s]+)$/.exec(line)
    if (!match || !SHA256_PATTERN.test(match[1]) || match[2] !== expectedBasename) {
        throw new Error('Backup checksum manifest must contain one SHA-256 digest for the archive basename.')
    }
    return { digest: match[1].toLowerCase(), basename: match[2] }
}

export async function verifyBackupArtifactChecksum({ artifactPath, checksumPath }) {
    const [artifactInfo, checksumInfo] = await Promise.all([stat(artifactPath), stat(checksumPath)])
    if (!artifactInfo.isFile() || !checksumInfo.isFile()) throw new Error('Backup artifact and checksum must be regular files.')
    const artifact = await readFile(artifactPath)
    const checksum = await readFile(checksumPath, 'utf8')
    const expected = parseSha256Manifest(checksum, artifactPath.split(/[\\/]/).pop())
    const actual = createHash('sha256').update(artifact).digest('hex')
    if (actual !== expected.digest) throw new Error('Backup checksum does not match the archive.')
    return { basename: expected.basename, bytes: artifact.byteLength, sha256: actual }
}

export function redactBackupDiagnostic(value) {
    return String(value ?? '')
        .replace(SECRET_PATTERN, '$1=[REDACTED]')
        .replace(/(?:\/|\\)[^\s,;]*(?:\.env|password|secret)[^\s,;]*/gi, '[REDACTED_PATH]')
}

export async function runSyntheticRestoreFixture() {
    const directory = await mkdtemp(join('/tmp', 'autocare-backup-'))
    try {
        const basename = 'db_backup_20260904_120000_1_1.sql.gz'
        const artifactPath = join(directory, basename)
        const checksumPath = `${artifactPath}.sha256`
        const payload = Buffer.from('-- synthetic restore fixture; no production data\n')
        await writeFile(artifactPath, gzipSync(payload), { mode: 0o600, flag: 'wx' })
        const digest = createHash('sha256').update(await readFile(artifactPath)).digest('hex')
        await writeFile(checksumPath, `${digest}  ${basename}\n`, { mode: 0o600, flag: 'wx' })
        const verified = await verifyBackupArtifactChecksum({ artifactPath, checksumPath })
        return { ...verified, targetDatabase: `restore_fixture_${randomUUID().replaceAll('-', '')}` }
    } finally {
        await rm(directory, { recursive: true, force: true })
    }
}

export async function evaluateBackupRestoreContract(root = PROJECT_ROOT) {
    const results = []
    for (const [name, contract] of Object.entries(CONTRACT_FILES)) {
        try {
            const source = await readFile(resolve(root, contract.path), 'utf8')
            const missing = contract.fragments.filter((fragment) => !source.includes(fragment))
            results.push(missing.length === 0
                ? pass(`${name} contract`, `${contract.path} contains the required safe controls`)
                : blocked(`${name} contract`, `missing controls: ${missing.join('; ')}`))
        } catch {
            results.push(blocked(`${name} contract`, `missing file: ${contract.path}`))
        }
    }

    const names = validateBackupArchiveNames([
        'db_backup_20260904_120000_1_1.sql.gz.enc',
        'db_backup_20260904_120001_1_2.sql.gz.enc',
    ])
    results.push(names.valid
        ? pass('unique backup archive names', 'per-run suffixes are accepted and duplicate names are rejected')
        : blocked('unique backup archive names', `invalid=${names.invalid.join(',')}; duplicates=${names.duplicates.join(',')}`))

    const malformed = validateBackupArchiveNames(['db_backup_20260904_120000_1_1.sql.gz', 'db_backup_20260904_120000_1_1.sql.gz'])
    results.push(!malformed.valid && malformed.duplicates.length === 1
        ? pass('duplicate archive regression', 'duplicate archive names are detected before a backup can overwrite an artifact')
        : blocked('duplicate archive regression', 'duplicate archive names were not detected'))

    const redacted = redactBackupDiagnostic('password=top-secret token=abc123 /var/run/my-secret.env')
    results.push(!redacted.includes('top-secret') && !redacted.includes('abc123')
        ? pass('backup diagnostics redaction', 'secret values and secret-looking paths are redacted')
        : blocked('backup diagnostics redaction', 'diagnostic redaction leaked a secret value'))

    try {
        const fixture = await runSyntheticRestoreFixture()
        results.push(fixture.bytes > 0 && SHA256_PATTERN.test(fixture.sha256)
            ? pass('synthetic restore fixture', `verified ${fixture.basename} (${fixture.bytes} bytes) in an isolated temporary directory`)
            : blocked('synthetic restore fixture', 'fixture checksum verification returned an invalid result'))
    } catch (error) {
        results.push(blocked('synthetic restore fixture', redactBackupDiagnostic(error instanceof Error ? error.message : String(error))))
    }

    return results
}

export function formatBackupRestoreContract(results) {
    const blockedCount = results.filter((result) => result.status === 'blocked').length
    return [
        'AutoCare Hub backup/restore contract',
        ...results.map((result) => `[${result.status.toUpperCase()}] ${result.name}: ${result.detail}`),
        blockedCount === 0 ? 'Result: all local backup/restore checks passed.' : `Result: blocked by ${blockedCount} check(s).`,
    ].join('\n')
}

async function main() {
    const results = await evaluateBackupRestoreContract()
    if (process.argv.includes('--json')) console.log(JSON.stringify({ schemaVersion: 1, status: results.some((result) => result.status === 'blocked') ? 'blocked' : 'pass', results }, null, 2))
    else console.log(formatBackupRestoreContract(results))
    if (results.some((result) => result.status === 'blocked')) process.exitCode = 1
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
