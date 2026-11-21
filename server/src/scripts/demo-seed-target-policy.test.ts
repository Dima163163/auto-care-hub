import { describe, expect, it } from 'vitest'

import { getDemoSeedTargetError } from './demo-seed-target-policy.js'

const testDatabase = {
    nodeEnv: 'test',
    host: '127.0.0.1',
    port: 5432,
    username: 'autocarehub',
    name: 'autocarehub_test',
    url: null,
} as const

describe('demo seed database target', () => {
    it('allows local disposable targets and the documented development Compose target', () => {
        expect(getDemoSeedTargetError(testDatabase)).toBeNull()
        expect(getDemoSeedTargetError({ ...testDatabase, name: 'autocarehub_real_e2e' })).toBeNull()
        expect(getDemoSeedTargetError({
            ...testDatabase, nodeEnv: 'development', name: 'autocarehub', port: 5433,
        })).toBeNull()
    })

    it('rejects production mode, remote databases and staging names', () => {
        expect(getDemoSeedTargetError({ ...testDatabase, nodeEnv: 'production' })).toMatch(/disabled/)
        expect(getDemoSeedTargetError({ ...testDatabase, host: 'db.example.com' })).toMatch(/loopback/)
        expect(getDemoSeedTargetError({ ...testDatabase, name: 'staging_test' })).toMatch(/disposable/)
        expect(getDemoSeedTargetError({ ...testDatabase, name: 'autocarehub' })).toMatch(/disposable/)
    })

    it('rejects query parameters that can change the actual PostgreSQL target', () => {
        const url = 'postgresql://autocarehub@127.0.0.1/autocarehub_test?host=db.example.com'
        expect(getDemoSeedTargetError({ ...testDatabase, url })).toMatch(/parameters/)
    })
})
