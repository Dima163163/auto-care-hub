import test from 'node:test'
import assert from 'node:assert/strict'

import {
    buildLocalReleaseSummary,
    evaluateHistoricalMigrationImmutability,
    getWorkingTreeMigrationCommands,
} from './check-release-summary.mjs'

test('migration immutability scans unstaged, staged and untracked paths', () => {
    const commands = getWorkingTreeMigrationCommands().map((command) => command.join(' '))
    assert.ok(commands.includes('diff --name-only -- server/src/database/migrations'))
    assert.ok(commands.includes('diff --cached --name-only -- server/src/database/migrations'))
    assert.ok(commands.includes('ls-files --others --exclude-standard -- server/src/database/migrations'))
})

test('historical migration immutability fails closed when a pre-boundary file changes', () => {
    const clean = evaluateHistoricalMigrationImmutability({
        fileNames: ['1785690000000-Legacy.ts', '1785700000000-AutoCare.ts'],
        modifiedPaths: ['server/src/database/migrations/1785700000000-AutoCare.ts'],
        boundary: 1785700000000,
    })
    assert.equal(clean.result.status, 'pass')
    assert.equal(clean.historicalCount, 1)

    const changed = evaluateHistoricalMigrationImmutability({
        fileNames: ['1785690000000-Legacy.ts', '1785700000000-AutoCare.ts'],
        modifiedPaths: ['server/src/database/migrations/1785690000000-Legacy.ts'],
        boundary: 1785700000000,
    })
    assert.equal(changed.result.status, 'blocked')
    assert.match(changed.result.detail, /1785690000000-Legacy\.ts/)
})

test('local release summary contains a versioned non-production claim and migration checksum', async () => {
    const summary = await buildLocalReleaseSummary()
    assert.equal(summary.schemaVersion, 1)
    assert.equal(summary.environment, 'local')
    assert.equal(summary.productionClaims, false)
    assert.equal(typeof summary.provenance.commitSha, 'string')
    assert.match(summary.provenance.dirtyManifestSha256, /^[a-f0-9]{64}$/)
    assert.equal(typeof summary.provenance.clean, 'boolean')
    assert.match(summary.migration.checksum, /^[a-f0-9]{64}$/)
    assert.ok(summary.checks.some((item) => item.name === 'Migration inventory checksum' && item.status === 'pass'))
    assert.ok(summary.checks.some((item) => item.name === 'Historical migration immutability'))
    assert.ok(summary.checks.some((item) => item.name === 'Replacement coverage'))
})
