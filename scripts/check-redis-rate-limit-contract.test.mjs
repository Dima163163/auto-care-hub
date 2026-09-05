import assert from 'node:assert/strict'
import test from 'node:test'

import { evaluateRedisRateLimitContract } from './check-redis-rate-limit-contract.mjs'

test('Redis fail-closed contract covers probe, fake outage and production boundary', async () => {
    const results = await evaluateRedisRateLimitContract()
    assert.equal(results.length, 5)
    assert.equal(results.every((result) => result.status === 'pass'), true)
})
