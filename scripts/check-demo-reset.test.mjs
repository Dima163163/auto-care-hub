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

test('demo reset contract fails when append-only audit deletion is introduced', () => {
    const evaluation = evaluateDemoResetSource([
        'DEMO_USER_EMAILS',
        'AUTOMOTIVE_MOCK_PROVIDERS',
        'provider.ownerId === null',
        "demoUserIdSet.has(provider.ownerId ?? '')",
        'ANY($1::uuid[])',
        'ids: string[]',
        'manager.getRepository(AuditLogEntity).delete',
    ].join('\n'))
    assert.equal(evaluation.passed, false)
    assert.deepEqual(evaluation.forbidden, ['AuditLogEntity).delete'])
})

test('demo reset contract requires fixture-scoped outbox cleanup', () => {
    const evaluation = evaluateDemoResetSource([
        'DEMO_USER_EMAILS',
        'AUTOMOTIVE_MOCK_PROVIDERS',
        'provider.ownerId === null',
        "demoUserIdSet.has(provider.ownerId ?? '')",
        'ANY($1::uuid[])',
        'ids: string[]',
        'deleteByAny(manager, \'autocare_service_requests\'',
        'deleteDemoOutboxEvents',
    ].join('\n'))
    assert.equal(evaluation.passed, false)
    assert.ok(evaluation.missing.includes('DELETE FROM "outbox_events"'))
})

test('demo reset contract requires a confirmed disposable database target', () => {
    const evaluation = evaluateDemoResetSource([
        'DEMO_USER_EMAILS',
        'AUTOMOTIVE_MOCK_PROVIDERS',
        'provider.ownerId === null',
        "demoUserIdSet.has(provider.ownerId ?? '')",
        'ANY($1::uuid[])',
        'ids: string[]',
    ].join('\n'))
    assert.equal(evaluation.passed, false)
    assert.ok(evaluation.missing.includes('getDemoResetTargetError'))
    assert.ok(evaluation.missing.includes('DEMO_RESET_CONFIRM_DATABASE'))
})

test('demo reset contract checks the target before opening its deletion transaction', () => {
    const source = [
        'getDemoResetTargetError',
        'DEMO_RESET_CONFIRM_DATABASE',
        'SELECT current_database() AS database_name',
        'if (targetError) throw new Error(targetError)',
        'await AppDataSource.transaction(',
    ].join('\n')
    assert.equal(evaluateDemoResetSource(source).targetGuardBeforeTransaction, true)
    assert.equal(evaluateDemoResetSource(source.replace('if (targetError) throw new Error(targetError)', '// moved below reset transaction')).targetGuardBeforeTransaction, false)
})
