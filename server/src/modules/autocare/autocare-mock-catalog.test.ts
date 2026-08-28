import { describe, expect, it } from 'vitest'

import {
    AUTOMOTIVE_MOCK_PROVIDERS,
    AUTOMOTIVE_MOCK_LOCATION_ZONES,
    AUTOMOTIVE_MOCK_MARKETS,
    AUTOMOTIVE_MOCK_SERVICES,
    AUTOCARE_MOCK_FALLBACK_IMAGE,
    resolveMockAssetUrl,
} from './autocare-mock-catalog.js'
import { toLocationZoneResponse, toMarketResponse } from './autocare.mappers.js'
import type { AutomotiveLocationZoneEntity, AutomotiveMarketEntity } from '../../entities/index.js'

describe('AutoCare mock catalog assets', () => {
    it('ships a data-driven market and location hierarchy', () => {
        expect(AUTOMOTIVE_MOCK_MARKETS.length).toBeGreaterThanOrEqual(50)
        expect(new Set(AUTOMOTIVE_MOCK_MARKETS.map((market) => market.cityCode)).size).toBe(AUTOMOTIVE_MOCK_MARKETS.length)
        expect(new Set(AUTOMOTIVE_MOCK_MARKETS.map((market) => market.countryCode))).toEqual(new Set(['RU', 'ES', 'MD']))
        expect(AUTOMOTIVE_MOCK_MARKETS.map((market) => market.cityCode)).toEqual(expect.arrayContaining([
            'moscow', 'samara', 'saint-petersburg', 'krasnodar', 'vladivostok', 'sochi',
            'madrid', 'barcelona', 'seville', 'malaga',
            'chisinau', 'balti', 'tiraspol', 'bender', 'rybnitsa',
        ]))
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

    it('covers different service catalogs so service filtering is observable', () => {
        const catalogs = AUTOMOTIVE_MOCK_PROVIDERS.map((provider) => new Set(provider.offerings.map((offering) => offering.serviceSlug)))
        const offeredServices = new Set(AUTOMOTIVE_MOCK_PROVIDERS.flatMap((provider) => provider.offerings.map((offering) => offering.serviceSlug)))

        expect(AUTOMOTIVE_MOCK_SERVICES.every((service) => offeredServices.has(service.slug))).toBe(true)
        expect(catalogs.some((catalog) => catalog.has('tire-service'))).toBe(true)
        expect(catalogs.some((catalog) => catalog.has('air-conditioning'))).toBe(true)
        expect(catalogs.some((catalog) => catalog.has('detailing'))).toBe(true)
        expect(catalogs.some((catalog) => !catalog.has('tire-service'))).toBe(true)
        expect(catalogs.some((catalog) => !catalog.has('detailing'))).toBe(true)
    })

    it('covers every customer contact mode in the seeded provider catalog', () => {
        expect(AUTOMOTIVE_MOCK_PROVIDERS.map((provider) => provider.communicationMode)).toEqual([
            'online',
            'request_then_confirm',
            'phone_only',
        ])
        const phoneOnly = AUTOMOTIVE_MOCK_PROVIDERS.find((provider) => provider.communicationMode === 'phone_only')
        expect(phoneOnly?.chatEnabled).toBe(false)
        expect(phoneOnly?.phoneBookingEnabled).toBe(true)
        expect(phoneOnly?.phone || phoneOnly?.phones?.[0]).toMatch(/^\+7 /)
        expect(AUTOMOTIVE_MOCK_PROVIDERS.filter((provider) => provider.communicationMode !== 'phone_only').every((provider) => (provider.responseWindowMinutes ?? 0) >= 120)).toBe(true)
    })

    it('falls back when an image is missing or unsafe', () => {
        expect(resolveMockAssetUrl(undefined, '/tmp/does-not-exist')).toBe(AUTOCARE_MOCK_FALLBACK_IMAGE)
        expect(resolveMockAssetUrl('https://example.com/image.webp', '/tmp/does-not-exist')).toBe(AUTOCARE_MOCK_FALLBACK_IMAGE)
    })

    it('rejects traversal outside the public asset root', () => {
        expect(resolveMockAssetUrl('/../private/image.webp', '/tmp/public')).toBe(AUTOCARE_MOCK_FALLBACK_IMAGE)
    })

    it('normalizes PostgreSQL numeric values for the real API contract', () => {
        const market = {
            id: 'market-1',
            countryCode: 'RU',
            countryName: 'Россия',
            cityCode: 'samara',
            cityName: 'Самара',
            regionCode: 'samara-oblast',
            regionName: 'Самарская область',
            centerLatitude: '53.1959000',
            centerLongitude: '50.1002000',
            currencyCode: 'RUB',
            defaultLocale: 'ru',
            supportedLocales: ['ru', 'en'],
            timezone: 'Europe/Samara',
            launchReady: true,
        } as unknown as AutomotiveMarketEntity
        const zone = {
            id: 'zone-1',
            marketId: 'market-1',
            parentId: null,
            slug: 'central',
            zoneType: 'district',
            names: { ru: 'Центральный район' },
            centerLatitude: '53.1959000',
            centerLongitude: '50.1002000',
            radiusKm: '5.00',
            imageUrl: null,
        } as unknown as AutomotiveLocationZoneEntity

        expect(toMarketResponse(market).centerLatitude).toBe(53.1959)
        expect(toMarketResponse(market).centerLongitude).toBe(50.1002)
        expect(toLocationZoneResponse(zone, 3).radiusKm).toBe(5)
        expect(toLocationZoneResponse(zone, 3).serviceCount).toBe(3)
    })
})
