import type { ProviderOffering, ProviderPreview, ProviderProfile } from '../model/autocareMockData'
import type { AutoCareApiDiscoveryItem, AutoCareApiOffer, AutoCareApiProviderProfile } from '../api/autocareApi'

function formatDistance(distanceKm: number) {
    return `${distanceKm.toFixed(1)} km`
}

function formatPrice(priceFromMinor: number, currencyCode: string) {
    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currencyCode,
        maximumFractionDigits: 0,
    }).format(priceFromMinor / 100)
}

export function mapAutoCareDiscoveryItem(item: AutoCareApiDiscoveryItem): ProviderPreview {
    return {
        id: item.provider.id,
        name: item.provider.name,
        rating: item.provider.rating,
        reviewCount: item.provider.reviewCount,
        distance: formatDistance(item.distanceKm),
        price: item.offer.priceFromMinor / 100,
        currency: item.offer.currencyCode,
        nextSlot: item.nextSlot ?? '—',
        image: item.provider.coverImageUrl,
        bonus: item.provider.bonusSummary ?? undefined,
        verified: item.provider.verified,
    }
}

function mapOffer(offer: AutoCareApiOffer): ProviderOffering {
    return {
        serviceId: offer.serviceSlug ?? offer.serviceDefinitionId,
        priceLabel: formatPrice(offer.priceFromMinor, offer.currencyCode),
        duration: `${offer.durationMinutes} min`,
        availability: 'Available on request',
        includes: offer.inclusions,
    }
}

export function mapAutoCareProviderProfile(profile: AutoCareApiProviderProfile): ProviderProfile {
    return {
        id: profile.id,
        name: profile.name,
        rating: profile.rating,
        reviewCount: profile.reviewCount,
        distance: '—',
        price: profile.offers[0]?.priceFromMinor ? profile.offers[0].priceFromMinor / 100 : 0,
        currency: profile.offers[0]?.currencyCode ?? 'RUB',
        nextSlot: 'Available on request',
        image: profile.coverImageUrl,
        bonus: profile.bonusSummary ?? undefined,
        verified: profile.verified,
        address: profile.location.address,
        hours: profile.location.hours,
        yearsActive: profile.yearsActive,
        staffCount: profile.staffCount,
        about: profile.description ?? 'A verified automotive service provider with transparent offers and service support.',
        amenities: ['Photo assessment', 'Service updates', 'Direct payment to provider'],
        offerings: profile.offers.map(mapOffer),
        reviews: [],
    }
}
