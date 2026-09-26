import { describe, expect, it } from 'vitest'

import { getDemoResetTargetError } from './demo-reset-target-policy.js'

const safeTarget = {
    nodeEnv: 'test' as const,
    configuredDatabaseName: 'autocarehub_real_e2e',
    connectedDatabaseName: 'autocarehub_real_e2e',
    confirmation: 'autocarehub_real_e2e',
}

describe('demo reset target policy', () => {
    it('allows an explicitly confirmed disposable test database', () => {
        expect(getDemoResetTargetError(safeTarget)).toBeNull()
    })

    it('blocks production even when the database name and confirmation look disposable', () => {
        expect(getDemoResetTargetError({ ...safeTarget, nodeEnv: 'production' })).toMatch(/disabled in production/i)
    })

    it('blocks a database name that does not identify itself as disposable', () => {
        expect(getDemoResetTargetError({
            ...safeTarget,
            configuredDatabaseName: 'autocarehub',
            connectedDatabaseName: 'autocarehub',
            confirmation: 'autocarehub',
        })).toMatch(/disposable database name/i)
    })

    it('blocks a connection that resolved to a database other than the configured target', () => {
        expect(getDemoResetTargetError({ ...safeTarget, connectedDatabaseName: 'autocarehub_prod' }))
            .toMatch(/does not match the configured database/i)
    })

    it('requires an exact disposable database confirmation', () => {
        expect(getDemoResetTargetError({ ...safeTarget, confirmation: 'autocarehub_test' }))
            .toMatch(/DEMO_RESET_CONFIRM_DATABASE/i)
    })
})
