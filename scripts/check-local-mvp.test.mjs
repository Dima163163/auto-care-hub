import test from 'node:test'
import assert from 'node:assert/strict'

import { LOCAL_MVP_CHECKS, formatLocalMvpGate, redactEvidence, runLocalMvpGate } from './check-local-mvp.mjs'

test('local gate has an explicit, shell-free command inventory', () => {
    assert.ok(LOCAL_MVP_CHECKS.length >= 20)
    assert.ok(LOCAL_MVP_CHECKS.some((check) => check.id === 'responsive-contract' && check.runtime))
    for (const check of LOCAL_MVP_CHECKS) {
        assert.equal(typeof check.executable, 'string')
        assert.ok(Array.isArray(check.args))
        assert.ok(!check.args.some((arg) => /[;&|`$()]/.test(arg)), `${check.id} must not contain shell syntax`)
    }
})

test('dry-run produces a redacted, reproducible report without executing checks', async () => {
    const report = await runLocalMvpGate({ dryRun: true, includeRuntime: false })
    assert.equal(report.counts.planned, LOCAL_MVP_CHECKS.length - 1)
    assert.equal(report.counts.manual, 1)
    assert.equal(report.counts.blocked ?? 0, 0)
    assert.match(formatLocalMvpGate(report), /Result: dry run/)
})

test('evidence redaction removes credentials and direct contact values', () => {
    const redacted = redactEvidence('password=super-secret Bearer eyJhbGciOiJIUzI1NiJ9 user@example.com')
    assert.doesNotMatch(redacted, /super-secret|eyJhbGciOiJIUzI1NiJ9|user@example\.com/)
    assert.match(redacted, /password=\[REDACTED\]/)
    assert.match(redacted, /Bearer \[REDACTED\]/)
    assert.match(redacted, /\[EMAIL\]/)
})
