import { describe, expect, it } from 'vitest'

import {
    AUTOMOTIVE_MOCK_PROVIDERS,
    AUTOMOTIVE_MOCK_LOCATION_ZONES,
    AUTOMOTIVE_MOCK_MARKETS,
    AUTOMOTIVE_MOCK_SERVICES,
    AUTOCARE_MOCK_FALLBACK_IMAGE,
    resolveMockAssetUrl,
} from './autocare-mock-catalog.js'

describe('AutoCare mock catalog assets', () => {
    it('ships a data-driven market and location hierarchy', () => {
        expect(AUTOMOTIVE_MOCK_MARKETS.length).toBeGreaterThanOrEqual(10)
        expect(new Set(AUTOMOTIVE_MOCK_MARKETS.map((market) => market.cityCode)).size).toBe(AUTOMOTIVE_MOCK_MARKETS.length)
        for (const market of AUTOMOTIVE_MOCK_MARKETS) {
            const marketZones = AUTOMOTIVE_MOCK_LOCATION_ZONES.filter((zone) => zone.marketCode === market.cityCode)
            expect(marketZones.length).toBeGreaterThanOrEqual(3)
            expect(new Set(marketZones.map((zone) => zone.slug)).size).toBe(marketZones.length)
        }
        expect(AUTOMOTIVE_MOCK_LOCATION_ZONES.every((zone) => zone.names.ru && zone.radiusKm > 0)).toBe(true)
    })

    it('keeps generated image references where a provider added photos', () => {
        expect(AUTOMOTIVE_MOCK_PROVIDERS).toHaveLength(3)
        expect(AUTOMOTIVE_MOCK_PROVIDERS.filter((provider) => provider.imageUrl).every((provider) => provider.imageUrl?.endsWith('.webp'))).toBe(true)
        expect(AUTOMOTIVE_MOCK_PROVIDERS.some((provider) => !provider.imageUrl)).toBe(true)
        expect(AUTOMOTIVE_MOCK_PROVIDERS.find((provider) => provider.key === 'proservice-moscow')?.logoUrl).toMatch(/\/logos\/proservice\.svg$/)
        expect(AUTOMOTIVE_MOCK_PROVIDERS.find((provider) => provider.key === 'autolux-moscow')?.logoUrl).toMatch(/\/logos\/autolux\.svg$/)
        expect(AUTOMOTIVE_MOCK_PROVIDERS.find((provider) => provider.key === 'formula-moscow')?.logoUrl).toBeUndefined()
        expect(AUTOMOTIVE_MOCK_SERVICES.length).toBeGreaterThanOrEqual(18)
        expect(AUTOMOTIVE_MOCK_SERVICES.map((service) => service.slug)).toEqual(expect.arrayContaining([
            'tow-truck', 'mobile-diagnostics', 'electric', 'roadside-assistance', 'battery-service',
        ]))
    })

    it('falls back when an image is missing or unsafe', () => {
        expect(resolveMockAssetUrl(undefined, '/tmp/does-not-exist')).toBe(AUTOCARE_MOCK_FALLBACK_IMAGE)
        expect(resolveMockAssetUrl('https://example.com/image.webp', '/tmp/does-not-exist')).toBe(AUTOCARE_MOCK_FALLBACK_IMAGE)
    })

    it('rejects traversal outside the public asset root', () => {
        expect(resolveMockAssetUrl('/../private/image.webp', '/tmp/public')).toBe(AUTOCARE_MOCK_FALLBACK_IMAGE)
    })
})
