import type {
    AutomotiveMarketEntity,
    AutomotiveMarketCountryEntity,
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
    AutoCareMarketCountryResponse,
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
        capabilities: entity.capabilities ?? {},
        legalLinks: entity.legalLinks ?? {},
        launchReady: entity.launchReady,
    }
}

export function toMarketCountryResponse(entity: AutomotiveMarketCountryEntity): AutoCareMarketCountryResponse {
    return {
        id: entity.id,
        code: entity.code,
        names: entity.names ?? {},
        defaultLocale: entity.defaultLocale,
        supportedLocales: entity.supportedLocales,
        timezone: entity.timezone,
        currencyCode: entity.currencyCode,
        capabilities: entity.capabilities ?? {},
        legalLinks: entity.legalLinks ?? {},
        active: entity.active,
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
        appointmentCapacity: entity.appointmentCapacity,
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
        displayOrder: entity.displayOrder,
        active: entity.active,
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
        bookingMode: entity.bookingMode,
    }
}

type ProviderResponseOptions = {
    trustEnabled?: boolean
}

export function toProviderResponse(
    provider: AutomotiveProviderEntity,
    location: AutomotiveServiceLocationEntity,
    options: ProviderResponseOptions = {},
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
        teamSize: provider.teamSize,
        businessType: provider.businessType,
        chatEnabled: provider.chatEnabled,
        communicationMode: provider.communicationMode,
        responseWindowMinutes: provider.responseWindowMinutes === null ? null : toNumber(provider.responseWindowMinutes),
        responseHours: provider.responseHours,
        phoneBookingEnabled: provider.phoneBookingEnabled,
        callbackEnabled: provider.callbackEnabled,
        requestPhotosEnabled: provider.requestPhotosEnabled,
        publicContactNote: provider.publicContactNote,
        warrantyText: provider.warrantyText,
        logoUrl: provider.logoUrl,
        coverImageUrl: provider.coverImageUrl,
        galleryImageUrls: provider.galleryImageUrls.length > 0
            ? provider.galleryImageUrls
            : ['/images/autocare/placeholders/provider.svg'],
        amenityIds: provider.amenityIds,
        brandSpecializations: provider.brandSpecializations,
        isMultibrand: provider.isMultibrand,
        trustScore: options.trustEnabled === false ? 0 : toNumber(provider.trustScore),
        trustBadge: options.trustEnabled === false ? null : provider.trustBadge,
        trustReassessedAt: options.trustEnabled === false ? null : provider.trustReassessedAt?.toISOString() ?? null,
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
    trustEnabled?: boolean
}): AutoCareProviderResultResponse {
    return {
        provider: toProviderResponse(input.provider, input.location, { trustEnabled: input.trustEnabled }),
        offer: toOfferResponse(input.offer, input.definition),
        distanceKm: input.distanceKm,
        nextSlot: input.nextSlot ?? null,
    }
}
