import { describe, expect, it } from 'vitest'

import { buildOwnerAutoCareMetrics } from './ownerAutoCareMetrics'

describe('buildOwnerAutoCareMetrics', () => {
    it('derives owner metrics only from service profiles and requests', () => {
        const metrics = buildOwnerAutoCareMetrics(
            [{ status: 'active', rating: 4.8, reviewCount: 20 }, { status: 'draft', rating: 0, reviewCount: 0 }] as never,
            [{ status: 'accepted', quote: { amountMinor: 15_000, currencyCode: 'RUB', note: null, createdAt: '' } }, { status: 'open', quote: null }] as never,
        )

        expect(metrics).toMatchObject({ activeProviders: 1, averageRating: 4.8, confirmedRequests: 1, conversionRate: 50, estimatedRevenueMinor: 15_000, needsReply: 1, openRequests: 2 })
    })
})
