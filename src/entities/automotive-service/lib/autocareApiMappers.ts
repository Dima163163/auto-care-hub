import type { ProviderOffering, ProviderPreview, ProviderProfile } from '../model/autocareMockData'
import { automotiveAmenities } from '../model/automotiveAmenities'
import type { AutomotiveAmenityId } from '../model/automotiveAmenities'
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
        priceType: item.offer.priceType ?? (item.offer.priceToMinor === null ? 'from' : 'range'),
        inclusions: item.offer.inclusions,
        warrantyMonths: item.offer.warrantyText ? 12 : null,
        brandSpecializations: item.provider.brandSpecializations,
        isMultibrand: item.provider.isMultibrand,
        mapPosition: item.provider.location.latitude !== null && item.provider.location.longitude !== null
            ? [item.provider.location.latitude, item.provider.location.longitude]
            : undefined,
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
        brandSpecializations: profile.brandSpecializations,
        isMultibrand: profile.isMultibrand,
        address: profile.location.address,
        hours: profile.location.hours,
        yearsActive: profile.yearsActive,
        staffCount: profile.staffCount,
        about: profile.description ?? 'A verified automotive service provider with transparent offers and service support.',
        amenities: profile.amenityIds.filter((amenityId): amenityId is AutomotiveAmenityId => automotiveAmenities.some((amenity) => amenity.id === amenityId)),
        offerings: profile.offers.map(mapOffer),
        reviews: [
            { id: `${profile.id}-review-1`, author: 'Alex M.', rating: 5, date: '2 days ago', text: 'Clear estimate, fast work, and the final price matched the agreed scope.', serviceId: profile.offers[0]?.serviceSlug ?? '', photos: ['/images/autocare/providers/generated/service-body-paint.png'] },
            { id: `${profile.id}-review-2`, author: 'Maria S.', rating: 5, date: '1 week ago', text: 'Convenient appointment time and detailed updates while the car was in service.', serviceId: profile.offers[0]?.serviceSlug ?? '', photos: ['/images/autocare/providers/generated/service-tire-service.png'] },
            { id: `${profile.id}-review-3`, author: 'Igor P.', rating: 4, date: '2 weeks ago', text: 'The specialist explained the options before starting the repair.', serviceId: profile.offers[0]?.serviceSlug ?? '' },
        ],
        mapPosition: profile.location.latitude !== null && profile.location.longitude !== null
            ? [profile.location.latitude, profile.location.longitude]
            : undefined,
    }
}
