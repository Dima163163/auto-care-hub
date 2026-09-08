import test from 'node:test'
import assert from 'node:assert/strict'

import {
    evaluateCombinedAutonomousPlan,
    formatCombinedAutonomousPlanReport,
    parseCombinedAutonomousPlan,
} from './check-pilot-autonomous-200.mjs'

function planWith(statuses, offset = 0) {
    return statuses.map((status, index) => `${index + 1}. \`[${status}]\` item ${index + 1 + offset}`).join('\n')
}

test('combines two valid 100-item halves into one 200-point plan', () => {
    const result = evaluateCombinedAutonomousPlan(
        planWith(Array.from({ length: 100 }, () => 'x')),
        planWith(Array.from({ length: 100 }, () => 'x')),
    )

    assert.deepEqual(result.failures, [])
    assert.equal(result.items.length, 200)
    assert.equal(result.items[0].number, 1)
    assert.equal(result.items.at(-1)?.number, 200)
    assert.equal(result.counts.complete, 200)
    assert.equal(result.readiness, 100)
    assert.match(formatCombinedAutonomousPlanReport(result), /200 numbered items: 200/)
})

test('preserves partial status and readiness across the combined halves', () => {
    const firstStatuses = Array.from({ length: 93 }, () => 'x').concat(Array.from({ length: 7 }, () => '~'))
    const result = evaluateCombinedAutonomousPlan(planWith(firstStatuses), planWith(Array.from({ length: 100 }, () => 'x')))

    assert.equal(parseCombinedAutonomousPlan(planWith(firstStatuses), planWith(Array.from({ length: 100 }, () => 'x'))).at(-1)?.number, 200)
    assert.equal(result.counts.complete, 193)
    assert.equal(result.counts.partial, 7)
    assert.equal(result.readiness, 96.5)
})

test('strict mode blocks any incomplete item in either half', () => {
    const result = evaluateCombinedAutonomousPlan(
        planWith(Array.from({ length: 99 }, () => 'x').concat('~')),
        planWith(Array.from({ length: 100 }, () => 'x')),
        { strict: true },
    )

    assert.match(result.failures.join('\n'), /strict mode requires all items complete/)
})
