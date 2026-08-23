import { describe, expect, it } from 'vitest'
import { ServiceRequestStatus } from '../../entities/automotive/service-request.entity.js'
import { buildQualityMetrics } from './quality-metrics.js'

describe('quality metrics', () => {
    it('summarizes catalog, supply and booking reliability without private content', () => {
        const createdAt = new Date('2026-08-20T10:00:00.000Z')
        const replyAt = new Date('2026-08-20T10:15:00.000Z')
        const result = buildQualityMetrics({
            providers: [{ id: 'p1', status: 'active' }, { id: 'p2', status: 'draft' }],
            definitions: [{ id: 'd1', active: true }, { id: 'd2', active: false }],
            locations: [{ id: 'l1', providerId: 'p1', marketId: 'samara' }],
            offers: [{ locationId: 'l1', definitionId: 'd1', active: true, priceFromMinor: 2_900_00, priceToMinor: null, currencyCode: 'RUB' }],
            requests: [{ id: 'r1', providerId: 'p1', status: ServiceRequestStatus.Closed, createdAt, clientConfirmedAt: replyAt, providerConfirmedAt: replyAt }],
            messages: [{ requestId: 'r1', senderId: 'p1', createdAt: replyAt }],
        })
        expect(result.catalog).toMatchObject({ activeDefinitions: 1, activeOffers: 1, providersWithOffers: 1, offerCoveragePercent: 100, priceCoveragePercent: 100 })
        expect(result.supply.markets).toEqual([{ marketId: 'samara', providers: 1, locations: 1, activeOffers: 1 }])
        expect(result.reliability).toMatchObject({ responseSamples: 1, averageResponseMinutes: 15, confirmedBookings: 1, confirmationReliabilityPercent: 100 })
    })
})
