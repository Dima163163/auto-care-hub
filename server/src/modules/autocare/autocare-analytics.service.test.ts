import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    getManagedProviderPermissionScopes: vi.fn(),
    getRepository: vi.fn(),
}))

vi.mock('../../database/data-source.js', () => ({ AppDataSource: mocks }))
vi.mock('./provider-access.service.js', () => ({
    getManagedProviderPermissionScopes: mocks.getManagedProviderPermissionScopes,
}))

import { getOwnerAutoCareProviderAnalytics } from './autocare-analytics.service.js'

describe('owner analytics input boundary', () => {
    beforeEach(() => {
        mocks.getManagedProviderPermissionScopes.mockReset()
        mocks.getRepository.mockReset()
    })

    it('rejects malformed provider identifiers before authorization or repository access', async () => {
        await expect(getOwnerAutoCareProviderAnalytics({ id: 'owner-1' } as never, 'provider-1')).rejects.toMatchObject({
            statusCode: 422,
            code: 'VALIDATION_ERROR',
        })
        expect(mocks.getManagedProviderPermissionScopes).not.toHaveBeenCalled()
        expect(mocks.getRepository).not.toHaveBeenCalled()
    })

    it('passes canonical provider identifiers into the capability lookup', async () => {
        mocks.getManagedProviderPermissionScopes.mockResolvedValue([])
        const providerId = '11111111-1111-4111-8111-111111111111'
        await expect(getOwnerAutoCareProviderAnalytics({ id: 'owner-1' } as never, providerId.toUpperCase())).rejects.toMatchObject({ statusCode: 403 })
        expect(mocks.getManagedProviderPermissionScopes).toHaveBeenCalledWith('owner-1', 'analytics')
        expect(mocks.getRepository).not.toHaveBeenCalled()
    })
})
