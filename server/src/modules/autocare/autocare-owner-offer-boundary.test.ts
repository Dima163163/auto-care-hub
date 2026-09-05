import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    getRepository: vi.fn(),
    hasProviderWorkspacePermission: vi.fn(),
}))

vi.mock('../../database/data-source.js', () => ({ AppDataSource: mocks }))
vi.mock('./provider-access.service.js', () => ({
    getManagedProviderPermissionScopes: vi.fn(),
    getManagedProviderScopes: vi.fn(),
    hasProviderWorkspacePermission: mocks.hasProviderWorkspacePermission,
    isManagedProviderLocationAllowed: vi.fn(),
}))

import { AutoCareCapacityResourceEntity, AutomotiveProviderEntity, AutomotiveServiceDefinitionEntity, AutomotiveServiceLocationEntity, AutomotiveServiceOfferingEntity } from '../../entities/index.js'
import { updateOwnerAutoCareOffer } from './autocare.service.js'

const providerId = '11111111-1111-4111-8111-111111111111'
const offerId = '22222222-2222-4222-8222-222222222222'
const locationId = '33333333-3333-4333-8333-333333333333'

const input = {
    description: 'Oil change',
    priceFromMinor: 2_500,
}

describe('owner offer update boundary', () => {
    beforeEach(() => {
        mocks.getRepository.mockReset()
        mocks.hasProviderWorkspacePermission.mockReset()
    })

    it('rejects malformed provider/offer ids before repository access', async () => {
        await expect(updateOwnerAutoCareOffer({ id: 'owner-1' } as never, 'provider-1', offerId, input)).rejects.toMatchObject({ statusCode: 422 })
        await expect(updateOwnerAutoCareOffer({ id: 'owner-1' } as never, providerId, 'offer-1', input)).rejects.toMatchObject({ statusCode: 422 })
        expect(mocks.getRepository).not.toHaveBeenCalled()
    })

    it('rejects malformed update payloads before provider lookup', async () => {
        await expect(updateOwnerAutoCareOffer({ id: 'owner-1' } as never, providerId, offerId, { ...input, ownerId: 'attacker' } as never)).rejects.toMatchObject({ statusCode: 422 })
        await expect(updateOwnerAutoCareOffer({ id: 'owner-1' } as never, providerId, offerId, { ...input, priceFromMinor: '2500' } as never)).rejects.toMatchObject({ statusCode: 422 })
        expect(mocks.getRepository).not.toHaveBeenCalled()
    })

    it('checks offer ownership through its branch before permission mutation', async () => {
        const providerRepository = { findOneBy: vi.fn().mockResolvedValue({ id: providerId, status: 'active' }) }
        const offeringRepository = { findOne: vi.fn().mockResolvedValue({ id: offerId, locationId, active: true }) }
        const locationRepository = { findOneBy: vi.fn().mockResolvedValue(null) }
        mocks.getRepository.mockImplementation((entity: unknown) => {
            if (entity === AutomotiveProviderEntity) return providerRepository
            if (entity === AutomotiveServiceOfferingEntity) return offeringRepository
            if (entity === AutomotiveServiceLocationEntity) return locationRepository
            return undefined
        })

        await expect(updateOwnerAutoCareOffer({ id: 'owner-1' } as never, ` ${providerId.toUpperCase()} `, ` ${offerId.toUpperCase()} `, input)).rejects.toMatchObject({ statusCode: 404 })
        expect(providerRepository.findOneBy).toHaveBeenCalledWith({ id: providerId })
        expect(offeringRepository.findOne).toHaveBeenCalledWith({ where: { id: offerId, active: true } })
        expect(locationRepository.findOneBy).toHaveBeenCalledWith({ id: locationId, providerId })
    })

    it('rejects resource ids whose entity type is absent from declared offer types', async () => {
        const providerRepository = { findOneBy: vi.fn().mockResolvedValue({ id: providerId, status: 'active' }) }
        const offeringRepository = { findOne: vi.fn().mockResolvedValue({ id: offerId, locationId, definitionId: '44444444-4444-4444-8444-444444444444', active: true, priceToMinor: null }), save: vi.fn() }
        const locationRepository = { findOneBy: vi.fn().mockResolvedValue({ id: locationId, providerId }) }
        const definitionRepository = { findOneBy: vi.fn().mockResolvedValue({ id: '44444444-4444-4444-8444-444444444444', slug: 'oil-change', labels: {}, priceType: 'from' }) }
        const resourceRepository = { findBy: vi.fn().mockResolvedValue([{ id: '55555555-5555-4555-8555-555555555555', type: 'lift' }]) }
        mocks.getRepository.mockImplementation((entity: unknown) => {
            if (entity === AutomotiveProviderEntity) return providerRepository
            if (entity === AutomotiveServiceOfferingEntity) return offeringRepository
            if (entity === AutomotiveServiceLocationEntity) return locationRepository
            if (entity === AutomotiveServiceDefinitionEntity) return definitionRepository
            if (entity === AutoCareCapacityResourceEntity) return resourceRepository
            return undefined
        })
        mocks.hasProviderWorkspacePermission.mockResolvedValue(true)

        await expect(updateOwnerAutoCareOffer({ id: 'owner-1' } as never, providerId, offerId, {
            ...input,
            requiredResourceTypes: ['bay'],
            requiredResourceIds: ['55555555-5555-4555-8555-555555555555'],
        })).rejects.toMatchObject({ statusCode: 422 })
        expect(offeringRepository.save).not.toHaveBeenCalled()
    })
})
