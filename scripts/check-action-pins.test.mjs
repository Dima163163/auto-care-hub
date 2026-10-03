import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { checkWorkflowActionPins, findMutableActions } from './check-action-pins.mjs'

test('accepts full commit SHA, local actions and content-addressed docker actions', () => {
    assert.deepEqual(findMutableActions(`- uses: actions/checkout@${'a'.repeat(40)} # v4\n- uses: './local-action'\n- uses: docker://example/image@sha256:${'b'.repeat(64)}`), [])
})
test('rejects tags, branches, short SHAs and dynamic action selection', () => {
    for (const ref of ['actions/checkout@v4', 'owner/repo@main', 'owner/repo@abcdef0', '${{ env.ACTION }}']) assert.equal(findMutableActions(`- uses: ${ref}`).length, 1)
})
test('all active workflows use immutable action references', async () => {
    assert.deepEqual(await checkWorkflowActionPins(fileURLToPath(new URL('..', import.meta.url))), [])
})
