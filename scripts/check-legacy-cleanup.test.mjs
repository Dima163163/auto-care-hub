import test from 'node:test'
import assert from 'node:assert/strict'

import { runLegacyCleanupChecks } from './check-legacy-cleanup.mjs'

test('legacy cleanup audit keeps compatibility paths gated and removes dead commission runtime', async () => {
    const checks = await runLegacyCleanupChecks()
    const blocked = checks.filter((item) => item.status === 'blocked')

    assert.deepEqual(blocked, [])
    assert.ok(checks.some((item) => item.name === 'Replacement coverage' && item.status === 'pass'))
    assert.ok(checks.some((item) => item.name === 'Historical migration inventory' && item.status === 'pass'))
})
