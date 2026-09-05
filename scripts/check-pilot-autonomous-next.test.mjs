import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { evaluateNextAutonomousPlan } from './check-pilot-autonomous-next.mjs'

test('next autonomous backlog contains exactly 100 locally complete items', () => {
    const planPath = resolve(fileURLToPath(new URL('..', import.meta.url)), 'docs/operations/PILOT_AUTONOMOUS_100_NEXT.md')
    const result = evaluateNextAutonomousPlan(readFileSync(planPath, 'utf8'))
    assert.deepEqual(result.failures, [])
    assert.equal(result.counts.complete, 100)
    assert.equal(result.counts.partial, 0)
    assert.equal(result.counts.external, 0)
})
