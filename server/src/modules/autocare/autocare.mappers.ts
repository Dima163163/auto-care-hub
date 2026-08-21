import type {
    AutomotiveMarketEntity,
    AutomotiveLocationZoneEntity,
    AutomotiveProviderEntity,
    AutomotiveServiceDefinitionEntity,
    AutomotiveServiceLocationEntity,
    AutomotiveServiceOfferingEntity,
} from '../../entities/index.js'
import type {
    AutoCareLocationResponse,
    AutoCareLocationZoneResponse,
    AutoCareMarketResponse,
    AutoCareOfferResponse,
    AutoCareProviderResponse,
    AutoCareProviderResultResponse,
    AutoCareServiceDefinitionResponse,
} from './autocare.types.js'

/**
 * PostgreSQL returns NUMERIC columns as strings. Keep that database detail out
 * of the public API contract, which is intentionally numeric for both the
 * mock and real clients.
 */
function toNumber(value: unknown, fallback = 0) {
    const parsed = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
}

function toNullableNumber(value: unknown) {
    if (value === null || value === undefined || value === '') return null
    const parsed = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(parsed) ? parsed : null
}

export function toMarketResponse(entity: AutomotiveMarketEntity): AutoCareMarketResponse {
    return {
        id: entity.id,
        countryCode: entity.countryCode,
        countryName: entity.countryName,
        cityCode: entity.cityCode,
        cityName: entity.cityName,
        regionCode: entity.regionCode,
        regionName: entity.regionName,
        centerLatitude: toNullableNumber(entity.centerLatitude),
        centerLongitude: toNullableNumber(entity.centerLongitude),
        currencyCode: entity.currencyCode,
        defaultLocale: entity.defaultLocale,
        supportedLocales: entity.supportedLocales,
        timezone: entity.timezone,
        launchReady: entity.launchReady,
    }
}

export function toServiceDefinitionResponse(entity: AutomotiveServiceDefinitionEntity): AutoCareServiceDefinitionResponse {
    return { ...entity }
}

export function toLocationResponse(entity: AutomotiveServiceLocationEntity): AutoCareLocationResponse {
    return {
        id: entity.id,
        marketId: entity.marketId,
        zoneId: entity.zoneId,
        address: entity.address,
        hours: entity.hours,
        timezone: entity.timezone,
        weeklySchedule: entity.weeklySchedule,
        blackoutDates: entity.blackoutDates,
        latitude: toNullableNumber(entity.latitude),
        longitude: toNullableNumber(entity.longitude),
        supportsMobile: entity.supportsMobile,
        supportsPickup: entity.supportsPickup,
        coverageRadiusKm: toNullableNumber(entity.coverageRadiusKm),
        dispatchBasePriceMinor: toNumber(entity.dispatchBasePriceMinor),
        etaMinutes: entity.etaMinutes === null ? null : toNumber(entity.etaMinutes),
    }
}

export function toLocationZoneResponse(entity: AutomotiveLocationZoneEntity, serviceCount: number): AutoCareLocationZoneResponse {
    return {
        id: entity.id,
        marketId: entity.marketId,
        parentId: entity.parentId,
        slug: entity.slug,
        zoneType: entity.zoneType,
        names: entity.names,
        centerLatitude: toNullableNumber(entity.centerLatitude),
        centerLongitude: toNullableNumber(entity.centerLongitude),
        radiusKm: toNullableNumber(entity.radiusKm),
        imageUrl: entity.imageUrl,
        serviceCount: toNumber(serviceCount),
    }
}

export function toOfferResponse(entity: AutomotiveServiceOfferingEntity, definition?: AutomotiveServiceDefinitionEntity): AutoCareOfferResponse {
    return {
        id: entity.id,
        serviceDefinitionId: entity.definitionId,
        serviceSlug: definition?.slug,
        serviceLabels: definition?.labels,
        description: entity.description,
        priceFromMinor: toNumber(entity.priceFromMinor),
        priceToMinor: entity.priceToMinor === null ? null : toNumber(entity.priceToMinor),
        currencyCode: entity.currencyCode,
        durationMinutes: toNumber(entity.durationMinutes),
        inclusions: entity.inclusions,
        warrantyText: entity.warrantyText,
        active: entity.active,
        priceType: definition?.priceType,
    }
}

export function toProviderResponse(
    provider: AutomotiveProviderEntity,
    location: AutomotiveServiceLocationEntity,
): AutoCareProviderResponse {
    const phones = provider.phones?.length
        ? provider.phones
        : provider.phone
            ? [provider.phone]
            : []

    return {
        id: provider.id,
        name: provider.name,
        description: provider.description,
        status: provider.status,
        verified: provider.verified,
        yearsActive: toNumber(provider.yearsActive),
        staffCount: toNumber(provider.staffCount),
        rating: toNumber(provider.rating),
        reviewCount: toNumber(provider.reviewCount),
        bonusSummary: provider.bonusSummary,
        phone: provider.phone,
        phones,
        email: provider.email,
        websiteUrl: provider.websiteUrl,
        metroStation: provider.metroStation,
        workstationCount: toNumber(provider.workstationCount),
        warrantyText: provider.warrantyText,
        logoUrl: provider.logoUrl,
        coverImageUrl: provider.coverImageUrl,
        galleryImageUrls: provider.galleryImageUrls.length > 0
            ? provider.galleryImageUrls
            : ['/images/autocare/placeholders/provider.svg'],
        amenityIds: provider.amenityIds,
        brandSpecializations: provider.brandSpecializations,
        isMultibrand: provider.isMultibrand,
        trustScore: toNumber(provider.trustScore),
        trustBadge: provider.trustBadge,
        trustReassessedAt: provider.trustReassessedAt?.toISOString() ?? null,
        location: toLocationResponse(location),
    }
}

export function toDiscoveryResponse(input: {
    provider: AutomotiveProviderEntity
    location: AutomotiveServiceLocationEntity
    offer: AutomotiveServiceOfferingEntity
    definition?: AutomotiveServiceDefinitionEntity
    distanceKm: number
    nextSlot?: string | null
}): AutoCareProviderResultResponse {
    return {
        provider: toProviderResponse(input.provider, input.location),
        offer: toOfferResponse(input.offer, input.definition),
        distanceKm: input.distanceKm,
        nextSlot: input.nextSlot ?? null,
    }
}
