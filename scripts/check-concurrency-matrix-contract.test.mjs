import assert from 'node:assert/strict'
import test from 'node:test'

import { evaluateConcurrencyMatrixContract } from './check-concurrency-matrix-contract.mjs'

test('transition matrix report contract is present', async () => {
    const results = await evaluateConcurrencyMatrixContract()
    assert.equal(results.length, 1)
    assert.equal(results[0].status, 'pass')
})
