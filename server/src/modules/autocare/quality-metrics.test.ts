import { describe, expect, it } from 'vitest'
import { ServiceRequestStatus } from '../../entities/automotive/service-request.entity.js'
import { buildQualityMetrics } from './quality-metrics.js'

describe('quality metrics', () => {
    it('summarizes catalog, supply and booking reliability without private content', () => {
        const createdAt = new Date('2026-08-20T10:00:00.000Z')
        const replyAt = new Date('2026-08-20T10:15:00.000Z')
        const result = buildQualityMetrics({
            providers: [{ id: 'p1', ownerId: 'owner-1', status: 'active' }, { id: 'p2', status: 'draft' }],
            providerMemberships: [],
            definitions: [{ id: 'd1', active: true }, { id: 'd2', active: false }],
            locations: [{ id: 'l1', providerId: 'p1', marketId: 'samara' }],
            offers: [{ locationId: 'l1', definitionId: 'd1', active: true, priceFromMinor: 2_900_00, priceToMinor: null, currencyCode: 'RUB' }],
            requests: [{ id: 'r1', clientId: 'client-1', providerId: 'p1', locationId: 'l1', status: ServiceRequestStatus.Closed, createdAt, clientConfirmedAt: replyAt, providerConfirmedAt: replyAt }],
            messages: [{ requestId: 'r1', senderId: 'owner-1', createdAt: replyAt }],
        })
        expect(result.catalog).toMatchObject({ activeDefinitions: 1, activeOffers: 1, providersWithOffers: 1, offerCoveragePercent: 100, priceCoveragePercent: 100 })
        expect(result.supply.markets).toEqual([{ marketId: 'samara', providers: 1, locations: 1, activeOffers: 1 }])
        expect(result.reliability).toMatchObject({ responseSamples: 1, averageResponseMinutes: 15, confirmedBookings: 1, confirmationReliabilityPercent: 100 })
    })

    it('counts only request-scoped provider members and ignores client/system or legacy provider-id senders', () => {
        const createdAt = new Date('2026-08-20T10:00:00.000Z')
        const replyAt = new Date('2026-08-20T10:15:00.000Z')
        const result = buildQualityMetrics({
            providers: [{ id: 'p1', ownerId: 'owner-1', status: 'active' }],
            providerMemberships: [
                { providerId: 'p1', userId: 'staff-1', locationId: 'l1', status: 'active' },
                { providerId: 'p1', userId: 'staff-revoked', locationId: 'l1', status: 'revoked' },
            ],
            definitions: [],
            locations: [{ id: 'l1', providerId: 'p1', marketId: 'samara' }],
            offers: [],
            requests: [{ id: 'r1', clientId: 'client-1', providerId: 'p1', locationId: 'l1', status: ServiceRequestStatus.Open, createdAt, clientConfirmedAt: null, providerConfirmedAt: null }],
            messages: [
                { requestId: 'r1', senderId: 'client-1', createdAt: new Date('2026-08-20T10:02:00.000Z') },
                { requestId: 'r1', senderId: 'system-1', kind: 'system', createdAt: new Date('2026-08-20T10:03:00.000Z') },
                { requestId: 'r1', senderId: 'p1', createdAt: new Date('2026-08-20T10:04:00.000Z') },
                { requestId: 'r1', senderId: 'staff-2', createdAt: new Date('2026-08-20T10:05:00.000Z') },
                { requestId: 'r1', senderId: 'staff-revoked', createdAt: new Date('2026-08-20T10:06:00.000Z') },
                { requestId: 'r1', senderId: 'staff-1', createdAt: replyAt },
            ],
        })

        expect(result.reliability).toMatchObject({ responseSamples: 1, averageResponseMinutes: 15, p95ResponseMinutes: 15 })
    })

    it('does not attribute a branch member response to a different request location', () => {
        const createdAt = new Date('2026-08-20T10:00:00.000Z')
        const result = buildQualityMetrics({
            providers: [{ id: 'p1', ownerId: null, status: 'active' }],
            providerMemberships: [{ providerId: 'p1', userId: 'staff-a', locationId: 'l1', status: 'active' }],
            definitions: [],
            locations: [{ id: 'l2', providerId: 'p1', marketId: 'samara' }],
            offers: [],
            requests: [{ id: 'r1', clientId: 'client-1', providerId: 'p1', locationId: 'l2', status: ServiceRequestStatus.Open, createdAt, clientConfirmedAt: null, providerConfirmedAt: null }],
            messages: [{ requestId: 'r1', senderId: 'staff-a', createdAt: new Date('2026-08-20T10:05:00.000Z') }],
        })

        expect(result.reliability).toMatchObject({ responseSamples: 0, averageResponseMinutes: null, p95ResponseMinutes: null })
    })

    it('excludes inactive providers, locations, definitions and orphan offers from public quality coverage', () => {
        const result = buildQualityMetrics({
            providers: [
                { id: 'active-provider', status: 'active' },
                { id: 'suspended-provider', status: 'suspended' },
                { id: 'draft-provider', status: 'draft' },
            ],
            providerMemberships: [],
            definitions: [
                { id: 'active-definition', active: true },
                { id: 'inactive-definition', active: false },
            ],
            locations: [
                { id: 'active-location', providerId: 'active-provider', marketId: 'samara' },
                { id: 'suspended-location', providerId: 'suspended-provider', marketId: 'samara' },
                { id: 'draft-location', providerId: 'draft-provider', marketId: 'samara' },
            ],
            offers: [
                { locationId: 'active-location', definitionId: 'active-definition', active: true, priceFromMinor: 1_000, priceToMinor: null, currencyCode: 'RUB' },
                { locationId: 'suspended-location', definitionId: 'active-definition', active: true, priceFromMinor: 1_000, priceToMinor: null, currencyCode: 'RUB' },
                { locationId: 'active-location', definitionId: 'inactive-definition', active: true, priceFromMinor: 1_000, priceToMinor: null, currencyCode: 'RUB' },
                { locationId: 'missing-location', definitionId: 'active-definition', active: true, priceFromMinor: 1_000, priceToMinor: null, currencyCode: 'RUB' },
            ],
            requests: [],
            messages: [],
        })

        expect(result.catalog).toMatchObject({
            activeDefinitions: 1,
            activeOffers: 1,
            providersWithOffers: 1,
            offerCoveragePercent: 100,
            priceCoveragePercent: 100,
        })
        expect(result.supply).toMatchObject({
            activeMarkets: 1,
            averageLocationsPerProvider: 1,
        })
        expect(result.supply.markets).toEqual([{ marketId: 'samara', providers: 1, locations: 1, activeOffers: 1 }])
    })

    it('does not count negative or inverted price ranges as priced offers', () => {
        const result = buildQualityMetrics({
            providers: [{ id: 'p1', status: 'active' }],
            providerMemberships: [],
            definitions: [{ id: 'd1', active: true }],
            locations: [{ id: 'l1', providerId: 'p1', marketId: 'samara' }],
            offers: [
                { locationId: 'l1', definitionId: 'd1', active: true, priceFromMinor: -1, priceToMinor: null, currencyCode: 'RUB' },
                { locationId: 'l1', definitionId: 'd1', active: true, priceFromMinor: 2_000, priceToMinor: 1_000, currencyCode: 'RUB' },
                { locationId: 'l1', definitionId: 'd1', active: true, priceFromMinor: 3_000, priceToMinor: 4_000, currencyCode: 'RUB' },
            ],
            requests: [],
            messages: [],
        })

        expect(result.catalog).toMatchObject({ activeOffers: 3, offersWithPrice: 1, priceCoveragePercent: 33.3 })
    })
})
