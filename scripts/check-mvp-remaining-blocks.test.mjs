import test from 'node:test'
import assert from 'node:assert/strict'

import { parseRemainingMvpBlocks, validateRemainingMvpBlocks } from './check-mvp-remaining-blocks.mjs'

test('remaining MVP queue contains exact 100-step blocks', () => {
    const blocks = parseRemainingMvpBlocks([
        '## BLOCK-01 — local',
        ...Array.from({ length: 100 }, (_, index) => `${index + 1}. \`[ ]\` task`),
        '## BLOCK-02 — external',
        ...Array.from({ length: 100 }, (_, index) => `${index + 1}. \`[E]\` task`),
    ].join('\n'))

    assert.deepEqual(validateRemainingMvpBlocks(blocks), [])
})

test('remaining MVP queue rejects short or misnumbered blocks', () => {
    const blocks = parseRemainingMvpBlocks('## BLOCK-01\n1. `[ ]` task\n3. `[ ]` task')
    assert.match(validateRemainingMvpBlocks(blocks).join('\n'), /has 2 tasks|task 2 is numbered 3/)
})
