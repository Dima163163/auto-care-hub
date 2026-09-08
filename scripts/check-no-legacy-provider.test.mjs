import test from 'node:test'
import assert from 'node:assert/strict'

import { isIgnoredDirectory } from './check-no-legacy-provider.mjs'

test('legacy payment scan ignores generated Next output variants', () => {
    assert.equal(isIgnoredDirectory('.next'), true)
    assert.equal(isIgnoredDirectory('.next-real-e2e'), true)
    assert.equal(isIgnoredDirectory('.next-mock-preview'), true)
    assert.equal(isIgnoredDirectory('src'), false)
})
