import { describe, expect, it } from 'vitest'

import {
    assertCabinetImageStorageProviderAvailable,
    isCabinetImageStorageProviderConfigured,
    resolveCabinetImageStorageProvider,
} from './storage-provider-policy.js'

describe('cabinet image storage provider policy', () => {
    it('defaults to filesystem and rejects unknown providers', () => {
        expect(resolveCabinetImageStorageProvider(undefined)).toBe('filesystem')
        expect(resolveCabinetImageStorageProvider('s3')).toBe('s3')
        expect(() => resolveCabinetImageStorageProvider('local')).toThrow()
    })

    it('keeps explicit provider availability environment-aware', () => {
        expect(isCabinetImageStorageProviderConfigured('filesystem', 'development')).toBe(true)
        expect(isCabinetImageStorageProviderConfigured('s3', 'production')).toBe(true)
        expect(isCabinetImageStorageProviderConfigured('s3', 'development')).toBe(false)
    })

    it('fails fast when an unavailable adapter is selected', () => {
        expect(() => assertCabinetImageStorageProviderAvailable('filesystem')).not.toThrow()
        expect(() => assertCabinetImageStorageProviderAvailable('s3')).toThrow(/adapter/)
    })
})
