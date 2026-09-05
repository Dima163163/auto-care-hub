import assert from 'node:assert/strict'
import test from 'node:test'

import { evaluatePilotEvidenceToolkit } from './check-pilot-evidence-toolkit.mjs'

test('pilot evidence toolkit contract is present', async () => {
    const results = await evaluatePilotEvidenceToolkit()
    assert.equal(results.length, 1)
    assert.equal(results[0].status, 'pass')
})
