import type { AutoCareLocationZoneResponse, AutoCareMarketResponse } from './autocare.types.js'
import { AutomotivePriceType } from '../../entities/automotive/automotive.entity.js'
import {
    AUTOMOTIVE_MOCK_LOCATION_ZONES,
    AUTOMOTIVE_MOCK_MARKETS,
    AUTOMOTIVE_MOCK_SERVICES,
    type AutomotiveMockLocationZone,
} from './autocare-mock-catalog.js'

type MockMarket = (typeof AUTOMOTIVE_MOCK_MARKETS)[number]

export function findFallbackMarket(value: string | undefined) {
    if (!value) return null
    const normalized = value.startsWith('market-') ? value.slice('market-'.length) : value
    return AUTOMOTIVE_MOCK_MARKETS.find((market) => market.cityCode === value || market.cityCode === normalized) ?? null
}

export function toFallbackMarketResponse(market: MockMarket): AutoCareMarketResponse {
    return {
        id: `market-${market.cityCode}`,
        countryCode: market.countryCode,
        countryName: market.countryName,
        cityCode: market.cityCode,
        cityName: market.cityName,
        regionCode: market.regionCode ?? null,
        regionName: market.regionName ?? null,
        centerLatitude: market.centerLatitude,
        centerLongitude: market.centerLongitude,
        currencyCode: market.currencyCode,
        defaultLocale: market.defaultLocale,
        supportedLocales: [...market.supportedLocales],
        timezone: market.timezone,
        launchReady: market.launchReady,
    }
}

/**
 * Keep the public service picker useful before the optional catalog seed runs.
 * IDs are deliberately namespaced so they cannot be mistaken for persisted
 * UUIDs; once definitions exist in PostgreSQL they remain the source of truth.
 */
export function getFallbackServiceDefinitions() {
    return AUTOMOTIVE_MOCK_SERVICES.map((service) => ({
        id: `definition-${service.slug}`,
        slug: service.slug,
        categorySlug: service.categorySlug,
        labels: { ...service.labels },
        priceType: AutomotivePriceType.From,
        comparisonAttributes: ['price', 'rating', 'distance', 'nextSlot'],
        active: true,
    }))
}

function zoneDistance(zone: AutomotiveMockLocationZone, coordinates: { latitude: number; longitude: number }) {
    const latitudeDelta = (zone.centerLatitude - coordinates.latitude) * 111
    const longitudeDelta = (zone.centerLongitude - coordinates.longitude) * 111
        * Math.cos((coordinates.latitude * Math.PI) / 180)
    return Math.sqrt(latitudeDelta ** 2 + longitudeDelta ** 2)
}

export function getFallbackZones(
    market: MockMarket,
    options: { coordinates?: { latitude: number; longitude: number }; limit: number },
): AutoCareLocationZoneResponse[] {
    const zones = AUTOMOTIVE_MOCK_LOCATION_ZONES
        .filter((zone) => zone.marketCode === market.cityCode)
        .slice()
        .sort((left, right) => options.coordinates
            ? zoneDistance(left, options.coordinates) - zoneDistance(right, options.coordinates)
            : left.displayOrder - right.displayOrder || left.slug.localeCompare(right.slug))

    return zones.slice(0, options.limit).map((zone) => ({
        id: `zone-${market.cityCode}-${zone.slug}`,
        marketId: `market-${market.cityCode}`,
        parentId: null,
        slug: zone.slug,
        zoneType: zone.zoneType,
        names: { ...zone.names },
        centerLatitude: zone.centerLatitude,
        centerLongitude: zone.centerLongitude,
        radiusKm: zone.radiusKm,
        imageUrl: zone.imageUrl ?? null,
        serviceCount: 0,
    }))
}
