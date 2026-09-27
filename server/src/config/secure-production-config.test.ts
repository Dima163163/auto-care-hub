import { describe, expect, it } from 'vitest'

import { assertProductionDatabaseTlsPolicy, assertProductionJwtSecretPolicy, getDefaultBindHost } from './secure-production-config.js'

describe('secure production environment policy', () => {
    it('binds local development to loopback by default while keeping production container compatibility', () => {
        expect(getDefaultBindHost('development')).toBe('127.0.0.1')
        expect(getDefaultBindHost('test')).toBe('127.0.0.1')
        expect(getDefaultBindHost('production')).toBe('0.0.0.0')
    })

    it('rejects disabling PostgreSQL certificate verification in production', () => {
        expect(() => assertProductionDatabaseTlsPolicy('production', false)).toThrow(/must be true in production/)
        expect(() => assertProductionDatabaseTlsPolicy('production', true)).not.toThrow()
        expect(() => assertProductionDatabaseTlsPolicy('development', false)).not.toThrow()
    })

    it('requires explicit, sufficiently long and distinct access and refresh secrets in production', () => {
        const validSecrets = {
            nodeEnv: 'production' as const,
            accessSecret: 'access-secret-0123456789-abcdefghijkl',
            refreshSecret: 'refresh-secret-0123456789-abcdefghij',
        }

        expect(() => assertProductionJwtSecretPolicy(validSecrets)).not.toThrow()
        expect(() => assertProductionJwtSecretPolicy({ ...validSecrets, refreshSecret: undefined })).toThrow(/separate JWT_ACCESS_SECRET and JWT_REFRESH_SECRET/)
        expect(() => assertProductionJwtSecretPolicy({ ...validSecrets, accessSecret: 'short' })).toThrow(/at least 32 characters/)
        expect(() => assertProductionJwtSecretPolicy({ ...validSecrets, refreshSecret: validSecrets.accessSecret })).toThrow(/must be different/)
        expect(() => assertProductionJwtSecretPolicy({ ...validSecrets, nodeEnv: 'development', refreshSecret: undefined })).not.toThrow()
    })
})
