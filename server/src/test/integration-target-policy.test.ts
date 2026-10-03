import { describe, expect, it } from 'vitest'

import { resolveIntegrationTargets } from './integration-target-policy.js'

const safeEnvironment = {
    NODE_ENV: 'test',
    TEST_DATABASE_URL: 'postgresql://test_user:synthetic-password@127.0.0.1:5432/autocarehub_test',
    TEST_REDIS_URL: 'redis://127.0.0.1:6379/15',
}

describe('Integration target isolation', () => {
    it.each([undefined, 'development', 'production'])('rejects NODE_ENV=%s before selecting a service', (NODE_ENV) => {
        expect(() => resolveIntegrationTargets({ ...safeEnvironment, NODE_ENV })).toThrow('NODE_ENV=test')
    })

    it.each([
        undefined,
        '',
        'not-a-url',
        'mysql://localhost/autocarehub_test',
        'postgresql://production.example.test/autocarehub_test',
        'postgresql://localhost/autocarehub',
        'postgresql://localhost/postgres',
        'postgresql://localhost/autocarehub_production_test',
        'postgresql://localhost/autocarehub_test?host=production.example.test',
        'postgresql://localhost/autocarehub_test#production',
        'postgresql://localhost/autocarehub_test%2Fproduction',
        'postgresql://localhost/%invalid_test',
    ])('rejects an unsafe PostgreSQL target without exposing credentials', (TEST_DATABASE_URL) => {
        expect(() => resolveIntegrationTargets({ ...safeEnvironment, TEST_DATABASE_URL })).toThrow('TEST_DATABASE_URL')
        try {
            resolveIntegrationTargets({ ...safeEnvironment, TEST_DATABASE_URL })
        } catch (error) {
            expect(String(error)).not.toContain('synthetic-password')
        }
    })

    it.each([
        undefined,
        '',
        'redis://production.example.test/15',
        'redis://localhost',
        'redis://localhost/0',
        'redis://localhost/16',
        'redis://localhost/15?db=0',
    ])('rejects an implicit, shared or remote Redis target', (TEST_REDIS_URL) => {
        expect(() => resolveIntegrationTargets({ ...safeEnvironment, TEST_REDIS_URL })).toThrow('TEST_REDIS_URL')
    })

    it('accepts explicit local disposable PostgreSQL and Redis services', () => {
        expect(resolveIntegrationTargets(safeEnvironment)).toEqual({
            databaseUrl: safeEnvironment.TEST_DATABASE_URL,
            redisUrl: safeEnvironment.TEST_REDIS_URL,
        })
    })

    it('accepts a uniquely named disposable database and IPv6 loopback', () => {
        const targets = resolveIntegrationTargets({
            ...safeEnvironment,
            TEST_DATABASE_URL: 'postgresql://test_user:synthetic-password@[::1]:5432/autocarehub_test_123',
            TEST_REDIS_URL: 'redis://[::1]:6379/1',
        })
        expect(targets.databaseUrl).toContain('/autocarehub_test_123')
        expect(targets.redisUrl).toBe('redis://[::1]:6379/1')
    })
})
