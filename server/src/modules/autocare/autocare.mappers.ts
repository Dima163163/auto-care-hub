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

export function toMarketResponse(entity: AutomotiveMarketEntity): AutoCareMarketResponse {
    return { ...entity }
}

export function toServiceDefinitionResponse(entity: AutomotiveServiceDefinitionEntity): AutoCareServiceDefinitionResponse {
    return { ...entity }
}

export function toLocationResponse(entity: AutomotiveServiceLocationEntity): AutoCareLocationResponse {
    return { ...entity }
}

export function toLocationZoneResponse(entity: AutomotiveLocationZoneEntity, serviceCount: number): AutoCareLocationZoneResponse {
    return { ...entity, serviceCount }
}

export function toOfferResponse(entity: AutomotiveServiceOfferingEntity, definition?: AutomotiveServiceDefinitionEntity): AutoCareOfferResponse {
    return {
        id: entity.id,
        serviceDefinitionId: entity.definitionId,
        serviceSlug: definition?.slug,
        serviceLabels: definition?.labels,
        description: entity.description,
        priceFromMinor: entity.priceFromMinor,
        priceToMinor: entity.priceToMinor,
        currencyCode: entity.currencyCode,
        durationMinutes: entity.durationMinutes,
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
        yearsActive: provider.yearsActive,
        staffCount: provider.staffCount,
        rating: Number(provider.rating),
        reviewCount: provider.reviewCount,
        bonusSummary: provider.bonusSummary,
        phone: provider.phone,
        phones,
        email: provider.email,
        websiteUrl: provider.websiteUrl,
        metroStation: provider.metroStation,
        workstationCount: provider.workstationCount,
        warrantyText: provider.warrantyText,
        logoUrl: provider.logoUrl,
        coverImageUrl: provider.coverImageUrl,
        galleryImageUrls: provider.galleryImageUrls.length > 0
            ? provider.galleryImageUrls
            : ['/images/autocare/placeholders/provider.svg'],
        amenityIds: provider.amenityIds,
        brandSpecializations: provider.brandSpecializations,
        isMultibrand: provider.isMultibrand,
        trustScore: Number(provider.trustScore),
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
