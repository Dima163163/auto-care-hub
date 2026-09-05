import test from 'node:test'
import assert from 'node:assert/strict'

import { evaluateAutonomousPlan, parseAutonomousPlan } from './check-pilot-autonomous-plan.mjs'

function planWith(statuses) {
    return statuses.map((status, index) => `${index + 1}. \`[${status}]\` item ${index + 1}`).join('\n')
}

test('accepts exactly 100 uniquely numbered plan items', () => {
    const result = evaluateAutonomousPlan(planWith(Array.from({ length: 100 }, () => 'x')))
    assert.deepEqual(result.failures, [])
    assert.equal(result.counts.complete, 100)
    assert.equal(parseAutonomousPlan(planWith(['x'])).length, 1)
})

test('reports missing and duplicate item numbers', () => {
    const source = [
        '1. `[x]` first',
        '1. `[x]` duplicate',
    ].join('\n')
    const result = evaluateAutonomousPlan(source)
    assert.match(result.failures.join('\n'), /expected 100 numbered items/)
    assert.match(result.failures.join('\n'), /missing item numbers/)
    assert.match(result.failures.join('\n'), /duplicate item numbers: 1/)
})

test('strict mode blocks partial and external statuses', () => {
    const result = evaluateAutonomousPlan(planWith(Array.from({ length: 99 }, () => 'x').concat('~')), { strict: true })
    assert.match(result.failures.join('\n'), /strict mode requires all items complete/)
})
