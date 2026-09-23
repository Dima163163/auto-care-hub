import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    getRepository: vi.fn(),
    transaction: vi.fn(),
}))

vi.mock('../../database/data-source.js', () => ({ AppDataSource: mocks }))

import {
    AutoCareRescheduleRequestEntity,
    AutoCareServiceQuoteEntity,
    AutomotiveMarketCountryEntity,
    AutomotiveMarketEntity,
    AutomotiveProviderEntity,
    AutomotiveServiceDefinitionEntity,
    AutomotiveServiceLocationEntity,
    AutomotiveServiceOfferingEntity,
    ServiceRequestEntity,
} from '../../entities/index.js'
import { createAutoCareServiceRequest, getAutoCareServiceRequest } from './autocare-request.service.js'

const providerId = '11111111-1111-4111-8111-111111111111'
const locationId = '22222222-2222-4222-8222-222222222222'
const offeringId = '33333333-3333-4333-8333-333333333333'
const definitionId = '44444444-4444-4444-8444-444444444444'
const requestId = '55555555-5555-4555-8555-555555555555'
const client = { id: 'client-1', role: 'client' } as never

describe('service request market launch readiness', () => {
    beforeEach(() => {
        mocks.getRepository.mockReset()
        mocks.transaction.mockReset()
    })

    it('does not create a new service request for an unlaunched market', async () => {
        const providerRepository = { findOneBy: vi.fn().mockResolvedValue({ id: providerId }) }
        const locationRepository = { findOneBy: vi.fn().mockResolvedValue({ id: locationId, providerId, marketId: 'market-hidden' }) }
        const marketRepository = { findOneBy: vi.fn().mockResolvedValue(null) }
        const offeringRepository = { findOneBy: vi.fn() }
        mocks.getRepository.mockImplementation((entity: unknown) => {
            if (entity === AutomotiveProviderEntity) return providerRepository
            if (entity === AutomotiveServiceLocationEntity) return locationRepository
            if (entity === AutomotiveMarketEntity) return marketRepository
            if (entity === AutomotiveServiceOfferingEntity) return offeringRepository
            return { findOneBy: vi.fn() }
        })

        await expect(createAutoCareServiceRequest(client, {
            providerId,
            locationId,
            offeringId,
            preferredAt: '2026-09-24T10:00:00.000Z',
            vehicleSnapshot: null,
            contactSnapshot: { name: 'Pilot Client', email: 'client@example.com', phone: '+79990000000' },
            dataProcessingConsent: true,
        } as never)).rejects.toMatchObject({ statusCode: 404 })

        expect(marketRepository.findOneBy).toHaveBeenCalledWith({ id: 'market-hidden', launchReady: true })
        expect(offeringRepository.findOneBy).not.toHaveBeenCalled()
        expect(mocks.transaction).not.toHaveBeenCalled()
    })

    it('does not create a new service request while the market country is inactive', async () => {
        const providerRepository = { findOneBy: vi.fn().mockResolvedValue({ id: providerId }) }
        const locationRepository = { findOneBy: vi.fn().mockResolvedValue({ id: locationId, providerId, marketId: 'market-ready' }) }
        const marketRepository = { findOneBy: vi.fn().mockResolvedValue({ id: 'market-ready', countryId: 'country-disabled', launchReady: true }) }
        const countryRepository = { findOneBy: vi.fn().mockResolvedValue(null) }
        const offeringRepository = { findOneBy: vi.fn() }
        mocks.getRepository.mockImplementation((entity: unknown) => {
            if (entity === AutomotiveProviderEntity) return providerRepository
            if (entity === AutomotiveServiceLocationEntity) return locationRepository
            if (entity === AutomotiveMarketEntity) return marketRepository
            if (entity === AutomotiveMarketCountryEntity) return countryRepository
            if (entity === AutomotiveServiceOfferingEntity) return offeringRepository
            return { findOneBy: vi.fn() }
        })

        await expect(createAutoCareServiceRequest(client, {
            providerId,
            locationId,
            offeringId,
            preferredAt: '2026-09-24T10:00:00.000Z',
            vehicleSnapshot: null,
            contactSnapshot: { name: 'Pilot Client', email: 'client@example.com', phone: '+79990000000' },
        } as never)).rejects.toMatchObject({ statusCode: 404 })

        expect(offeringRepository.findOneBy).not.toHaveBeenCalled()
        expect(mocks.transaction).not.toHaveBeenCalled()
    })

    it('rechecks and share-locks market publication inside the request transaction', async () => {
        const providerRepository = { findOneBy: vi.fn().mockResolvedValue({ id: providerId }) }
        const locationRepository = { findOneBy: vi.fn().mockResolvedValue({ id: locationId, providerId, marketId: 'market-ready' }) }
        const marketRepository = { findOneBy: vi.fn().mockResolvedValue({ id: 'market-ready', countryId: 'country-1', launchReady: true }) }
        const countryRepository = { findOneBy: vi.fn().mockResolvedValue({ id: 'country-1', active: true }) }
        const offeringRepository = { findOneBy: vi.fn().mockResolvedValue({ id: offeringId, definitionId, active: true, durationMinutes: 60, bookingMode: 'request' }) }
        const definitionRepository = { findOneBy: vi.fn().mockResolvedValue({ id: definitionId, slug: 'brakes', labels: { en: 'Brakes' }, active: true }) }
        const requestRepository = { findOneBy: vi.fn(), save: vi.fn() }
        const lockedMarketLookup = vi.fn().mockResolvedValue(null)
        const manager = {
            getRepository: vi.fn((entity: unknown) => entity === AutomotiveMarketEntity
                ? { findOne: lockedMarketLookup }
                : entity === ServiceRequestEntity ? requestRepository : { findOne: vi.fn() }),
        }
        mocks.getRepository.mockImplementation((entity: unknown) => {
            if (entity === AutomotiveProviderEntity) return providerRepository
            if (entity === AutomotiveServiceLocationEntity) return locationRepository
            if (entity === AutomotiveMarketEntity) return marketRepository
            if (entity === AutomotiveMarketCountryEntity) return countryRepository
            if (entity === AutomotiveServiceOfferingEntity) return offeringRepository
            if (entity === AutomotiveServiceDefinitionEntity) return definitionRepository
            if (entity === ServiceRequestEntity) return requestRepository
            return { findOneBy: vi.fn() }
        })
        mocks.transaction.mockImplementation(async (callback: (manager: never) => unknown) => callback(manager as never))

        await expect(createAutoCareServiceRequest(client, {
            providerId,
            locationId,
            offeringId,
            preferredAt: '2026-09-24T10:00:00.000Z',
            vehicleSnapshot: null,
            contactSnapshot: { name: 'Pilot Client', email: 'client@example.com', phone: '+79990000000' },
        } as never)).rejects.toMatchObject({ statusCode: 404 })

        expect(lockedMarketLookup).toHaveBeenCalledWith({
            where: { id: 'market-ready', launchReady: true },
            lock: { mode: 'pessimistic_read' },
        })
        expect(requestRepository.save).not.toHaveBeenCalled()
    })

    it('keeps existing service requests readable after their market is no longer launch ready', async () => {
        const now = new Date('2026-09-23T12:00:00.000Z')
        const request = {
            id: requestId,
            clientId: client.id,
            providerId,
            locationId,
            definitionId,
            offeringId,
            offeringSnapshot: { serviceSlug: 'brakes', serviceLabels: { en: 'Brakes' }, description: null, priceFromMinor: 25000, priceToMinor: null, currencyCode: 'RUB', durationMinutes: 60, inclusions: [], warrantyText: null, priceType: 'from', bookingMode: 'request' },
            vehicleId: null,
            vehicleSnapshot: null,
            contactSnapshot: { name: 'Pilot Client', email: 'client@example.com', phone: '+79990000000' },
            preferredAt: now,
            note: null,
            estimateSnapshot: null,
            acceptedQuoteVersion: null,
            acceptedQuoteSnapshot: null,
            acceptedQuoteAt: null,
            bookingSnapshot: null,
            status: 'awaiting_reply',
            clientConfirmedAt: null,
            providerConfirmedAt: null,
            cancelledAt: null,
            cancelledById: null,
            cancellationReason: null,
            noShowAt: null,
            noShowById: null,
            noShowReason: null,
            completedAt: null,
            completedById: null,
            completionNote: null,
            createdAt: now,
            updatedAt: now,
        }
        const requestRepository = { findOneBy: vi.fn().mockResolvedValue(request) }
        const provider = { id: providerId, name: 'Existing Garage' }
        const location = { id: locationId, marketId: 'market-now-hidden', address: 'Samara, 1' }
        const definition = { id: definitionId, slug: 'brakes', labels: { en: 'Brakes' } }
        const offering = { id: offeringId, description: null, priceFromMinor: 25000, currencyCode: 'RUB' }
        mocks.getRepository.mockImplementation((entity: unknown) => {
            if (entity === ServiceRequestEntity) return requestRepository
            if (entity === AutomotiveProviderEntity) return { findOneBy: vi.fn().mockResolvedValue(provider) }
            if (entity === AutomotiveServiceLocationEntity) return { findOneBy: vi.fn().mockResolvedValue(location) }
            if (entity === AutomotiveServiceDefinitionEntity) return { findOneBy: vi.fn().mockResolvedValue(definition) }
            if (entity === AutomotiveServiceOfferingEntity) return { findOneBy: vi.fn().mockResolvedValue(offering) }
            if (entity === AutoCareServiceQuoteEntity) return { find: vi.fn().mockResolvedValue([]) }
            if (entity === AutoCareRescheduleRequestEntity) return { findOne: vi.fn().mockResolvedValue(null) }
            return undefined
        })

        await expect(getAutoCareServiceRequest(client, requestId)).resolves.toMatchObject({
            id: requestId,
            providerId,
            locationId,
            status: 'awaiting_reply',
        })
        expect(mocks.getRepository).not.toHaveBeenCalledWith(AutomotiveMarketEntity)
    })
})
