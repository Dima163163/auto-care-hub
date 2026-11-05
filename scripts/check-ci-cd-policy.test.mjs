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
        promotionWait: sources.promotionWait.replace("'pr', 'checks'", "'pr', 'status'"),
    })

    assert.ok(checks.some(({ name, passed }) => name === 'Promotion requires successful CI' && !passed))
})

test('rejects promotion that could reuse another PR run for the same commit', async () => {
    const sources = await readCiCdPolicySources()
    const checks = validateCiCdPolicy({
        ...sources,
        promotionWait: sources.promotionWait.replace('run.display_title === currentPrRunName', 'run.head_sha === sourceSha'),
    })

    assert.ok(checks.some(({ name, passed }) => name === 'Promotion binds the pull-request Quality run to the current PR' && !passed))
})

test('requires Quality to expose the PR number in its run name', async () => {
    const sources = await readCiCdPolicySources()
    const checks = validateCiCdPolicy({
        ...sources,
        quality: sources.quality.replace('github.event.pull_request.number', 'github.ref'),
    })

    assert.ok(checks.some(({ name, passed }) => name === 'Promotion binds the pull-request Quality run to the current PR' && !passed))
})

test('rejects promotion that does not bind Quality to the exact dev commit', async () => {
    const sources = await readCiCdPolicySources()
    const checks = validateCiCdPolicy({
        ...sources,
        promotion: sources.promotion.replace('head_sha', 'head_branch'),
    })

    assert.ok(checks.some(({ name, passed }) => name === 'Promotion is limited to the trusted dev branch' && !passed))
})

test('rejects promotion that could select a pull-request Quality run', async () => {
    const sources = await readCiCdPolicySources()
    const checks = validateCiCdPolicy({
        ...sources,
        promotion: sources.promotion.replace('and .event == "push"', ''),
    })

    assert.ok(checks.some(({ name, passed }) => name === 'Promotion selects a push Quality run' && !passed))
})

test('rejects promotion without a protected pull-request path to main', async () => {
    const sources = await readCiCdPolicySources()
    const checks = validateCiCdPolicy({
        ...sources,
        promotion: sources.promotion.replaceAll('--base main', '--base release'),
    })

    assert.ok(checks.some(({ name, passed }) => name === 'Promotion targets main through a protected pull request' && !passed))
})

test('rejects squash promotion that drops dev ancestry', async () => {
    const sources = await readCiCdPolicySources()
    const checks = validateCiCdPolicy({
        ...sources,
        promotion: sources.promotion.replace('--auto --merge', '--auto --squash'),
    })

    assert.ok(checks.some(({ name, passed }) => name === 'Promotion preserves dev ancestry' && !passed))
})
