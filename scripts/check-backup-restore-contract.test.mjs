import test from 'node:test'
import assert from 'node:assert/strict'
import {
    evaluateBackupRestoreContract,
    parseSha256Manifest,
    redactBackupDiagnostic,
    validateBackupArchiveNames,
    validateBackupArchiveName,
    verifyBackupArtifactChecksum,
} from './check-backup-restore-contract.mjs'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

test('accepts only unique, canonical archive names', () => {
        assert.equal(validateBackupArchiveName('db_backup_20260904_120000_1_1.sql.gz.enc'), true)
        assert.equal(validateBackupArchiveName('../db_backup_20260904_120000_1_1.sql.gz.enc'), false)
        assert.equal(validateBackupArchiveNames([
            'db_backup_20260904_120000_1_1.sql.gz',
            'db_backup_20260904_120001_1_2.sql.gz',
        ]).valid, true)
        assert.equal(validateBackupArchiveNames([
            'db_backup_20260904_120000_1_1.sql.gz',
            'db_backup_20260904_120000_1_1.sql.gz',
        ]).valid, false)
    })

test('parses a basename-bound SHA-256 manifest and rejects mismatches', () => {
        const digest = 'a'.repeat(64)
        assert.deepEqual(parseSha256Manifest(`${digest}  backup.sql.gz`, 'backup.sql.gz'), { digest, basename: 'backup.sql.gz' })
        assert.throws(() => parseSha256Manifest(`${digest}  other.sql.gz`, 'backup.sql.gz'))
    })

test('verifies an artifact checksum before restore', async () => {
        const directory = await mkdtemp(join('/tmp', 'autocare-backup-test-'))
        try {
            const artifactPath = join(directory, 'db_backup_20260904_120000_1_1.sql.gz')
            const checksumPath = `${artifactPath}.sha256`
            const payload = Buffer.from('synthetic')
            await writeFile(artifactPath, payload)
            const digest = createHash('sha256').update(await readFile(artifactPath)).digest('hex')
            await writeFile(checksumPath, `${digest}  ${artifactPath.split('/').pop()}\n`)
            const verified = await verifyBackupArtifactChecksum({ artifactPath, checksumPath })
            assert.deepEqual(verified, { basename: 'db_backup_20260904_120000_1_1.sql.gz', bytes: payload.byteLength, sha256: digest })
            await writeFile(artifactPath, Buffer.from('tampered'))
            await assert.rejects(verifyBackupArtifactChecksum({ artifactPath, checksumPath }), /checksum/i)
        } finally {
            await rm(directory, { recursive: true, force: true })
        }
    })

test('redacts secrets from diagnostics and passes repository contracts', async () => {
        const diagnostic = redactBackupDiagnostic('password=secret token=abc123')
        assert.equal(diagnostic.includes('secret'), false)
        assert.equal(diagnostic.includes('abc123'), false)
        const results = await evaluateBackupRestoreContract()
        assert.equal(results.every((result) => result.status === 'pass'), true)
    })
