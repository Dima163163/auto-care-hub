import assert from 'node:assert/strict'
import test from 'node:test'

import { evaluateMvpInteractionContract } from './check-mvp-interaction-contract.mjs'

test('all local MVP interaction contracts are present', async () => {
    const results = await evaluateMvpInteractionContract()
    assert.equal(results.length, 8)
    assert.equal(results.every((result) => result.status === 'pass'), true)
})

test('the contract ids stay unique and cover the remaining local MVP range', async () => {
    const results = await evaluateMvpInteractionContract()
    const ids = results.map((result) => result.id)
    assert.deepEqual(ids, [13, 14, 15, 16, 17, 18, 19, 20])
    assert.equal(new Set(ids).size, ids.length)
})
