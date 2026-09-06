import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    getRepository: vi.fn(),
    hasProviderWorkspacePermission: vi.fn(),
}))

vi.mock('../../database/data-source.js', () => ({ AppDataSource: mocks }))
vi.mock('./provider-access.service.js', () => ({ hasProviderWorkspacePermission: mocks.hasProviderWorkspacePermission }))

import { AutomotivePriceType } from '../../entities/index.js'
import { createAutoCareCatalogGapRequest } from './catalog-gap.service.js'

const input = {
    providerId: '11111111-1111-4111-8111-111111111111',
    proposedSlug: 'wheel-alignment',
    categorySlug: 'chassis',
    labels: { ru: 'Сход-развал', en: 'Wheel alignment' },
    priceType: AutomotivePriceType.From,
    comparisonAttributes: ['duration'],
    rationale: 'The provider offers this service, but it is missing from the shared catalog.',
}

function savedRequest() {
    const timestamp = new Date('2026-08-28T10:00:00.000Z')
    return {
        id: 'gap-1',
        requestedById: 'manager-1',
        ...input,
        status: 'pending',
        reviewedById: null,
        reviewReason: null,
        reviewedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
    }
}

describe('catalog gap provider authorization', () => {
    beforeEach(() => {
        mocks.getRepository.mockReset()
        mocks.hasProviderWorkspacePermission.mockReset()
    })

    it('rejects provider-specific proposals without the catalog permission', async () => {
        mocks.hasProviderWorkspacePermission.mockResolvedValue(false)
        const repository = { findOneBy: vi.fn(), create: vi.fn(), save: vi.fn() }
        mocks.getRepository.mockReturnValue(repository)

        await expect(createAutoCareCatalogGapRequest({ id: 'staff-1' } as never, input))
            .rejects.toMatchObject({ statusCode: 403 })
        expect(mocks.hasProviderWorkspacePermission).toHaveBeenCalledWith('staff-1', '11111111-1111-4111-8111-111111111111', 'catalog')
        expect(repository.findOneBy).not.toHaveBeenCalled()
    })

    it('allows an explicitly catalog-capable workspace member', async () => {
        mocks.hasProviderWorkspacePermission.mockResolvedValue(true)
        const entity = savedRequest()
        const repository = {
            findOneBy: vi.fn().mockResolvedValue(null),
            create: vi.fn((value) => value),
            save: vi.fn().mockResolvedValue(entity),
        }
        mocks.getRepository.mockReturnValue(repository)

        await expect(createAutoCareCatalogGapRequest({ id: 'manager-1' } as never, input))
            .resolves.toMatchObject({ id: 'gap-1', providerId: input.providerId, proposedSlug: 'wheel-alignment' })
        expect(mocks.hasProviderWorkspacePermission).toHaveBeenCalledWith('manager-1', '11111111-1111-4111-8111-111111111111', 'catalog')
        expect(repository.save).toHaveBeenCalledOnce()
    })
})
