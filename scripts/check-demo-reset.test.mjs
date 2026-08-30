import test from 'node:test'
import assert from 'node:assert/strict'

import { evaluateDemoResetSource, runDemoResetChecks } from './check-demo-reset.mjs'

test('demo reset contract passes against the production script', () => {
    const results = runDemoResetChecks()
    assert.deepEqual(results.filter((result) => result.status === 'blocked'), [])
})

test('demo reset contract fails when shared catalog deletion is introduced', () => {
    const evaluation = evaluateDemoResetSource([
        'DEMO_USER_EMAILS',
        'AUTOMOTIVE_MOCK_PROVIDERS',
        'provider.ownerId === null',
        "demoUserIdSet.has(provider.ownerId ?? '')",
        'ANY($1::uuid[])',
        'ids: string[]',
        'DELETE FROM "autocare_markets"',
    ].join('\n'))
    assert.equal(evaluation.passed, false)
    assert.deepEqual(evaluation.forbidden, ['DELETE FROM "autocare_markets"'])
})
