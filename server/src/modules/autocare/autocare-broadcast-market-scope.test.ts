import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    getRepository: vi.fn(),
    transaction: vi.fn(),
    getManagedProviderPermissionScopes: vi.fn(),
}))

vi.mock('../../database/data-source.js', () => ({ AppDataSource: mocks }))
vi.mock('./provider-access.service.js', () => ({
    getManagedProviderPermissionScopes: mocks.getManagedProviderPermissionScopes,
    hasProviderWorkspacePermission: vi.fn(),
    hasProviderWorkspacePermissionWithManager: vi.fn(),
    isManagedProviderLocationAllowed: (scopes: Array<{ providerId: string; locationIds: string[] | null }>, providerId: string, locationId: string | null | undefined) => {
        const scope = scopes.find((item) => item.providerId === providerId)
        return scope?.locationIds === null ? true : Boolean(scope && locationId && scope.locationIds?.includes(locationId))
    },
}))

import {
    AutoCareBroadcastOfferEntity,
    AutoCareBroadcastRequestEntity,
    AutomotiveMarketCountryEntity,
    AutomotiveMarketEntity,
    AutomotiveProviderEntity,
    AutomotiveProviderStatus,
    AutomotiveServiceDefinitionEntity,
    AutomotiveServiceLocationEntity,
    AutomotiveServiceOfferingEntity,
} from '../../entities/index.js'
import { UserRole } from '../../entities/user/user.entity.js'
import { assertOwnerBroadcastAccess, createAutoCareBroadcastRequest, getAutoCareBroadcastRequest, getOwnerAutoCareBroadcastRequests } from './autocare-marketplace.service.js'

const owner = { id: 'owner-1', role: UserRole.Owner } as never
const client = { id: 'client-1', role: UserRole.Client } as never
const provider = { id: '11111111-1111-4111-8111-111111111111', status: AutomotiveProviderStatus.Active }
const location = { id: '22222222-2222-4222-8222-222222222222', providerId: provider.id, marketId: 'market-1', address: 'Branch 1' }
const readyMarket = { id: 'market-1', countryId: 'country-1', countryCode: 'RU', launchReady: true }
const activeCountry = { id: 'country-1', active: true }
const scope = { providerId: provider.id, locationIds: [location.id], roles: ['owner'] }

function openRequest(id: string, marketId: string | null) {
    return {
        id,
        clientId: 'another-client',
        serviceDefinitionId: 'definition-1',
        marketId,
        issueDescription: 'A sufficiently detailed brake issue.',
        vehicleSnapshot: null,
        preferredAt: null,
        status: 'open',
        maxProviders: 5,
        expiresAt: new Date(Date.now() + 60_000),
        createdAt: new Date('2026-09-20T10:00:00.000Z'),
    }
}

describe('AutoCare broadcast market boundaries', () => {
    beforeEach(() => {
        mocks.getRepository.mockReset()
        mocks.transaction.mockReset()
        mocks.getManagedProviderPermissionScopes.mockReset().mockResolvedValue([scope])
    })

    it('requires a selected public market before persisting a broadcast request', async () => {
        const definitionRepository = { findOneBy: vi.fn().mockResolvedValue({ id: 'definition-1' }) }
        const marketRepository = { findOneBy: vi.fn().mockResolvedValue({ ...readyMarket, launchReady: false }) }
        const countryRepository = { findOneBy: vi.fn().mockResolvedValue(activeCountry) }
        mocks.getRepository.mockImplementation((entity: unknown) => {
            if (entity === AutomotiveServiceDefinitionEntity) return definitionRepository
            if (entity === AutomotiveMarketEntity) return marketRepository
            if (entity === AutomotiveMarketCountryEntity) return countryRepository
            return undefined
        })

        await expect(createAutoCareBroadcastRequest(client, {
            serviceDefinitionId: 'brake-pads',
            marketId: 'samara',
            issueDescription: 'The brakes squeak under normal pressure.',
        })).rejects.toMatchObject({ statusCode: 404 })
        await expect(createAutoCareBroadcastRequest(client, {
            serviceDefinitionId: 'brake-pads',
            issueDescription: 'The brakes squeak under normal pressure.',
        })).rejects.toMatchObject({ statusCode: 422 })
        marketRepository.findOneBy.mockResolvedValue(null)
        await expect(createAutoCareBroadcastRequest(client, {
            serviceDefinitionId: 'brake-pads',
            marketId: 'unknown-city',
            issueDescription: 'The brakes squeak under normal pressure.',
        })).rejects.toMatchObject({ statusCode: 404 })

        marketRepository.findOneBy.mockResolvedValue(readyMarket)
        countryRepository.findOneBy.mockResolvedValue(null)
        await expect(createAutoCareBroadcastRequest(client, {
            serviceDefinitionId: 'brake-pads',
            marketId: 'samara',
            issueDescription: 'The brakes squeak under normal pressure.',
        })).rejects.toMatchObject({ statusCode: 404 })
        expect(mocks.transaction).not.toHaveBeenCalled()
    })

    it('does not grant pre-offer direct access across market boundaries', async () => {
        const providerRepository = { find: vi.fn().mockResolvedValue([provider]) }
        const locationRepository = { find: vi.fn().mockResolvedValue([location]) }
        const offerRepository = { find: vi.fn().mockResolvedValue([]) }
        const offeringRepository = { findOne: vi.fn().mockResolvedValue({ id: 'offering-1' }) }
        mocks.getRepository.mockImplementation((entity: unknown) => {
            if (entity === AutomotiveProviderEntity) return providerRepository
            if (entity === AutomotiveServiceLocationEntity) return locationRepository
            if (entity === AutoCareBroadcastOfferEntity) return offerRepository
            if (entity === AutomotiveServiceOfferingEntity) return offeringRepository
            return undefined
        })

        await expect(assertOwnerBroadcastAccess(owner, openRequest('broadcast-1', 'market-other') as never)).rejects.toMatchObject({ statusCode: 403 })
        expect(offeringRepository.findOne).not.toHaveBeenCalled()
    })

    it('allows an existing owner participant to retain direct access after market unlaunch', async () => {
        const broadcastId = '33333333-3333-4333-8333-333333333333'
        const priorOffer = { broadcastRequestId: broadcastId, providerId: provider.id, locationId: location.id }
        const providerRepository = { find: vi.fn().mockResolvedValue([provider]) }
        const locationRepository = { find: vi.fn().mockResolvedValue([location]) }
        const offerRepository = { find: vi.fn().mockResolvedValue([priorOffer]) }
        mocks.getRepository.mockImplementation((entity: unknown) => {
            if (entity === AutomotiveProviderEntity) return providerRepository
            if (entity === AutomotiveServiceLocationEntity) return locationRepository
            if (entity === AutoCareBroadcastOfferEntity) return offerRepository
            return undefined
        })

        await expect(assertOwnerBroadcastAccess(owner, openRequest(broadcastId, 'market-1') as never)).resolves.toBeUndefined()
        expect(offerRepository.find).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({ broadcastRequestId: broadcastId, locationId: expect.any(Object) }),
        }))
        expect(mocks.getRepository).not.toHaveBeenCalledWith(AutomotiveMarketEntity)
    })

    it('keeps an existing owner offer readable after market unlaunch', async () => {
        const broadcastId = '77777777-7777-4777-8777-777777777777'
        const request = openRequest(broadcastId, 'market-1')
        const priorOffer = {
            id: 'offer-1',
            broadcastRequestId: broadcastId,
            providerId: provider.id,
            locationId: location.id,
            offerSnapshot: { amountMinor: 25_000, currencyCode: 'RUB' },
            status: 'pending',
            createdAt: new Date('2026-09-20T10:00:00.000Z'),
        }
        mocks.getRepository.mockImplementation((entity: unknown) => {
            if (entity === AutoCareBroadcastRequestEntity) return { findOneBy: vi.fn().mockResolvedValue(request) }
            if (entity === AutomotiveProviderEntity) return { find: vi.fn().mockResolvedValue([provider]) }
            if (entity === AutomotiveServiceLocationEntity) return { find: vi.fn().mockResolvedValue([location]) }
            if (entity === AutoCareBroadcastOfferEntity) return { find: vi.fn().mockResolvedValue([priorOffer]) }
            if (entity === AutomotiveServiceDefinitionEntity) return { findOneBy: vi.fn().mockResolvedValue({ id: 'definition-1', slug: 'brakes' }) }
            return undefined
        })

        const result = await getAutoCareBroadcastRequest(owner, broadcastId)

        expect(result.offers).toHaveLength(1)
        expect(result.offers[0]).toMatchObject({ id: 'offer-1', locationId: location.id, providerId: provider.id })
        expect(mocks.getRepository).not.toHaveBeenCalledWith(AutomotiveMarketEntity)
    })

    it('filters owner inbox candidates by eligible market before loading request details', async () => {
        const matchingRequest = openRequest('44444444-4444-4444-8444-444444444444', 'market-1')
        const otherMarketRequest = openRequest('55555555-5555-4555-8555-555555555555', 'market-2')
        const requestRepository = {
            find: vi.fn().mockResolvedValue([matchingRequest, otherMarketRequest]),
            findOneBy: vi.fn().mockResolvedValue(matchingRequest),
        }
        const providerRepository = { find: vi.fn().mockResolvedValue([provider]) }
        const locationRepository = { find: vi.fn().mockResolvedValue([location]) }
        const offerRepository = { find: vi.fn().mockResolvedValue([]) }
        const marketRepository = {
            find: vi.fn().mockResolvedValue([readyMarket]),
            findOneBy: vi.fn().mockResolvedValue(readyMarket),
        }
        const countryRepository = {
            find: vi.fn().mockResolvedValue([activeCountry]),
            findOneBy: vi.fn().mockResolvedValue(activeCountry),
        }
        const offeringRepository = {
            find: vi.fn().mockResolvedValue([{ definitionId: 'definition-1', locationId: location.id }]),
            findOne: vi.fn().mockResolvedValue({ id: 'offering-1' }),
        }
        const definitionRepository = { findOneBy: vi.fn().mockResolvedValue({ id: 'definition-1', slug: 'brakes' }) }
        mocks.getRepository.mockImplementation((entity: unknown) => {
            if (entity === AutoCareBroadcastRequestEntity) return requestRepository
            if (entity === AutomotiveProviderEntity) return providerRepository
            if (entity === AutomotiveServiceLocationEntity) return locationRepository
            if (entity === AutoCareBroadcastOfferEntity) return offerRepository
            if (entity === AutomotiveMarketEntity) return marketRepository
            if (entity === AutomotiveMarketCountryEntity) return countryRepository
            if (entity === AutomotiveServiceOfferingEntity) return offeringRepository
            if (entity === AutomotiveServiceDefinitionEntity) return definitionRepository
            return undefined
        })

        const result = await getOwnerAutoCareBroadcastRequests(owner)

        expect(result.map((request) => request.id)).toEqual([matchingRequest.id])
        expect(requestRepository.findOneBy).toHaveBeenCalledWith({ id: matchingRequest.id })
        expect(requestRepository.findOneBy).not.toHaveBeenCalledWith({ id: otherMarketRequest.id })
    })

    it('hides unoffered owner-inbox requests when the market country is inactive', async () => {
        const request = openRequest('66666666-6666-4666-8666-666666666666', 'market-1')
        const requestRepository = { find: vi.fn().mockResolvedValue([request]), findOneBy: vi.fn() }
        const offerRepository = { find: vi.fn().mockResolvedValue([]) }
        const marketRepository = { find: vi.fn().mockResolvedValue([readyMarket]) }
        const countryRepository = { find: vi.fn().mockResolvedValue([]) }
        mocks.getRepository.mockImplementation((entity: unknown) => {
            if (entity === AutoCareBroadcastRequestEntity) return requestRepository
            if (entity === AutomotiveProviderEntity) return { find: vi.fn().mockResolvedValue([provider]) }
            if (entity === AutomotiveServiceLocationEntity) return { find: vi.fn().mockResolvedValue([location]) }
            if (entity === AutoCareBroadcastOfferEntity) return offerRepository
            if (entity === AutomotiveMarketEntity) return marketRepository
            if (entity === AutomotiveMarketCountryEntity) return countryRepository
            return { find: vi.fn().mockResolvedValue([]) }
        })

        await expect(getOwnerAutoCareBroadcastRequests(owner)).resolves.toEqual([])
        expect(requestRepository.findOneBy).not.toHaveBeenCalled()
    })
})
