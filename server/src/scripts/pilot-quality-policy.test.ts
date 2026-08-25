import { describe, expect, it } from 'vitest'

import { evaluatePilotQuality } from './pilot-quality-policy.js'

const catalog = {
    activeDefinitions: 4,
    activeOffers: 8,
    providersWithOffers: 2,
    offerCoveragePercent: 100,
    offersWithDescription: 8,
    offersWithPrice: 8,
    priceCoveragePercent: 100,
}

const supply = {
    activeMarkets: 1,
    averageLocationsPerProvider: 1,
    markets: [{ marketId: 'samara-ru', providers: 2, locations: 2, activeOffers: 8 }],
}

describe('pilot quality policy', () => {
    it('passes a market with complete catalog and minimum supply', () => {
        const checks = evaluatePilotQuality({ catalog, supply }, {
            marketId: 'samara-ru',
            minActiveProviders: 2,
            minActiveOffers: 8,
            minOfferCoveragePercent: 80,
            minPriceCoveragePercent: 95,
            minMarketProviders: 2,
            minMarketOffers: 8,
        })
        expect(checks.every((check) => check.status === 'pass')).toBe(true)
    })

    it('blocks a missing market instead of reporting an empty pilot as healthy', () => {
        const checks = evaluatePilotQuality({ catalog, supply }, {
            marketId: 'missing-market',
            minActiveProviders: 2,
            minActiveOffers: 8,
            minOfferCoveragePercent: 80,
            minPriceCoveragePercent: 95,
            minMarketProviders: 2,
            minMarketOffers: 8,
        })
        expect(checks.filter((check) => check.status === 'blocked').map((check) => check.name)).toEqual([
            'missing-market providers',
            'missing-market active offers',
        ])
    })
})
