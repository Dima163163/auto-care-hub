import assert from 'node:assert/strict'
import test from 'node:test'

import { readCiCdPolicySources, validateCiCdPolicy } from './check-ci-cd-policy.mjs'

test('keeps the repository CI/CD promotion policy fail-closed', async () => {
    const checks = validateCiCdPolicy(await readCiCdPolicySources())

    assert.deepEqual(
        checks.filter(({ passed }) => !passed),
        [],
    )
})

test('rejects a promotion workflow without an explicit CI wait', async () => {
    const sources = await readCiCdPolicySources()
    const checks = validateCiCdPolicy({
        ...sources,
        promotion: sources.promotion.replace('gh pr checks', 'gh pr status'),
    })

    assert.ok(checks.some(({ name, passed }) => name === 'Promotion requires successful CI' && !passed))
})
