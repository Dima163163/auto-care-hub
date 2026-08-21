import { describe, expect, it } from 'vitest'

import { AUTOMOTIVE_MOCK_MARKETS } from './autocare-mock-catalog.js'
import { findFallbackMarket, getFallbackServiceDefinitions, getFallbackZones, toFallbackMarketResponse } from './autocare-catalog-fallback.js'

describe('AutoCare catalog fallback', () => {
    it('resolves city codes and API-style market ids', () => {
        expect(findFallbackMarket('samara')?.cityName).toBe('Самара')
        expect(findFallbackMarket('market-samara')?.cityCode).toBe('samara')
        expect(findFallbackMarket('unknown-city')).toBeNull()
    })

    it('returns a stable market response with a frontend-safe id', () => {
        const market = AUTOMOTIVE_MOCK_MARKETS.find((item) => item.cityCode === 'samara')!
        const response = toFallbackMarketResponse(market)

        expect(response.id).toBe('market-samara')
        expect(response.cityName).toBe('Самара')
        expect(response.supportedLocales).toEqual(['ru', 'en'])
    })

    it('returns city-specific zones in display order and supports coordinate sorting', () => {
        const market = AUTOMOTIVE_MOCK_MARKETS.find((item) => item.cityCode === 'samara')!
        const zones = getFallbackZones(market, { limit: 20 })
        const nearest = getFallbackZones(market, { coordinates: { latitude: 53.195, longitude: 50.102 }, limit: 1 })

        expect(zones.length).toBeGreaterThanOrEqual(5)
        expect(zones.every((zone) => zone.marketId === 'market-samara')).toBe(true)
        expect(nearest[0]?.slug).toBe('leninsky')
    })

    it('keeps the service picker populated before the database seed', () => {
        const definitions = getFallbackServiceDefinitions()

        expect(definitions.length).toBeGreaterThanOrEqual(18)
        expect(definitions.find((item) => item.slug === 'oil-change')).toMatchObject({
            id: 'definition-oil-change',
            categorySlug: 'maintenance',
            active: true,
        })
    })
})
