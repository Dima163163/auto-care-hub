import test from 'node:test'
import assert from 'node:assert/strict'

import { getMigrationInventoryChecksum } from './migration-inventory.mjs'

test('creates a stable checksum independent of migration order', () => {
    const first = getMigrationInventoryChecksum([
        { fileName: '002.ts', source: 'export class Two {}' },
        { fileName: '001.ts', source: 'export class One {}' },
    ])
    const second = getMigrationInventoryChecksum([
        { fileName: '001.ts', source: 'export class One {}' },
        { fileName: '002.ts', source: 'export class Two {}' },
    ])

    assert.equal(first, second)
    assert.equal(first.length, 64)
    assert.notEqual(first, getMigrationInventoryChecksum([
        { fileName: '001.ts', source: 'export class Changed {}' },
        { fileName: '002.ts', source: 'export class Two {}' },
    ]))
})

test('rejects malformed inventory entries', () => {
    assert.throws(() => getMigrationInventoryChecksum([{ fileName: '001.ts' }]), /fileName and source/)
})
