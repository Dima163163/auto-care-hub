import test from 'node:test'
import assert from 'node:assert/strict'

import { formatLegacyFileClassification, runLegacyFileClassification } from './check-legacy-file-classification.mjs'

test('classifies retained legacy candidates without unknown files', async () => {
    const result = await runLegacyFileClassification()

    assert.deepEqual(result.failures, [])
    assert.ok(result.classified.some((item) => item.disposition === 'retained_compatibility'))
    assert.ok(result.classified.some((item) => item.disposition === 'retained_immutable'))
    assert.match(formatLegacyFileClassification(result), /every retained legacy candidate has an explicit disposition/)
})
