import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import test from 'node:test'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { evaluateMigrationChecksumManifest } from './check-migration-checksum.mjs'
import { evaluatePublishedMigrationImmutability } from './migration-inventory.mjs'
import { getMigrationInventoryChecksum, getMigrationSourceSha256 } from './migration-inventory.mjs'

test('published migration checksum comparison fails on a changed applied file', () => {
    const result = evaluatePublishedMigrationImmutability({
        currentMigrations: [{ fileName: '1786310000000-Appeal.ts', source: 'new', sha256: 'b'.repeat(64) }],
        publishedMigrations: [{ fileName: '1786310000000-Appeal.ts', sha256: 'a'.repeat(64) }],
    })
    assert.equal(result.pass, false)
    assert.equal(result.mismatches[0].fileName, '1786310000000-Appeal.ts')
})

test('new forward migrations are reported separately from immutable published files', () => {
    const result = evaluatePublishedMigrationImmutability({
        currentMigrations: [
            { fileName: '001-First.ts', source: 'same', sha256: 'a'.repeat(64) },
            { fileName: '002-Next.ts', source: 'new', sha256: 'b'.repeat(64) },
        ],
        publishedMigrations: [{ fileName: '001-First.ts', sha256: 'a'.repeat(64) }],
    })
    assert.equal(result.pass, true)
    assert.deepEqual(result.additions, ['002-Next.ts'])
})

test('candidate additions pass while changed published sources are blocked', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'autocarehub-migration-checksum-'))
    const manifestPath = join(directory, 'published.json')
    try {
        const originalSource = 'export class First001 {}'
        await writeFile(join(directory, '001-First.ts'), originalSource)
        const published = [{ fileName: '001-First.ts', sha256: getMigrationSourceSha256(originalSource) }]
        await writeFile(join(directory, '002-Next.ts'), 'export class Next002 {}')
        await writeFile(manifestPath, JSON.stringify({ schemaVersion: 1, inventoryChecksum: getMigrationInventoryChecksum([{ fileName: published[0].fileName, source: originalSource }]), migrations: published }))
        const additions = await evaluateMigrationChecksumManifest({ migrationDirectory: directory, manifestPath })
        assert.equal(additions.pass, true)
        assert.deepEqual(additions.additions, ['002-Next.ts'])

        await writeFile(join(directory, '001-First.ts'), 'export class First001 { changed }')
        const changed = await evaluateMigrationChecksumManifest({ migrationDirectory: directory, manifestPath })
        assert.equal(changed.pass, false)
        assert.equal(changed.mismatches[0].fileName, '001-First.ts')
    } finally {
        await rm(directory, { recursive: true, force: true })
    }
})
