import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { buildMigrationInventory } from './check-migration-inventory.mjs'

test('builds a deterministic migration inventory from TypeScript files', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'autocarehub-migrations-'))
    await mkdir(join(directory, 'nested'))
    await writeFile(join(directory, '002-Second.ts'), 'export class Second002 {}')
    await writeFile(join(directory, '001-First.ts'), 'export class First001 {}')
    await writeFile(join(directory, '001-First.test.ts'), 'test-only fixture')
    await writeFile(join(directory, 'README.md'), 'ignored')

    const inventory = await buildMigrationInventory(directory)
    assert.equal(inventory.count, 2)
    assert.equal(inventory.checksum.length, 64)
})

test('rejects an empty migration directory', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'autocarehub-empty-migrations-'))

    await assert.rejects(
        () => buildMigrationInventory(directory),
        /No TypeScript migrations found/,
    )
})
