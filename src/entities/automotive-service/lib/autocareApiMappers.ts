import type { ProviderOffering, ProviderPreview, ProviderProfile } from '../model/autocareMockData'
import { automotiveAmenities } from '../model/automotiveAmenities'
import { IS_MOCK_API } from '@/shared/config/api'
import type { AutomotiveAmenityId } from '../model/automotiveAmenities'
import type { AutoCareApiDiscoveryItem, AutoCareApiOffer, AutoCareApiProviderProfile, AutoCareApiProviderReviews } from '../api/autocareApi'

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
        priceTo: item.offer.priceToMinor === null ? null : item.offer.priceToMinor / 100,
        currency: item.offer.currencyCode,
        nextSlot: item.nextSlot ?? '—',
        image: item.provider.coverImageUrl,
        logoUrl: item.provider.logoUrl,
        bonus: item.provider.bonusSummary ?? undefined,
        verified: item.provider.verified,
        trustScore: item.provider.trustScore,
        trustBadge: item.provider.trustBadge,
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
        id: offer.id,
        serviceId: offer.serviceSlug ?? offer.serviceDefinitionId,
        priceLabel: formatPrice(offer.priceFromMinor, offer.currencyCode),
        duration: `${offer.durationMinutes} min`,
        availability: 'Available on request',
        includes: offer.inclusions,
    }
}

function mapReview(review: AutoCareApiProviderReviews['reviews'][number]): ProviderProfile['reviews'][number] {
    return {
        id: review.id,
        author: review.authorName,
        vehicleLabel: review.vehicleLabel,
        avatarUrl: review.avatarUrl,
        rating: review.rating,
        date: formatReviewDate(review.createdAt),
        text: review.text,
        serviceId: review.serviceSlug ?? '',
        photos: review.photoUrls,
    }
}

function formatReviewDate(value: string) {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date)
}

export function mapAutoCareProviderProfile(profile: AutoCareApiProviderProfile, reviewSummary?: AutoCareApiProviderReviews): ProviderProfile {
    return {
        id: profile.id,
        status: profile.status,
        locationId: profile.location.id,
        name: profile.name,
        rating: reviewSummary?.averageRating ?? profile.rating,
        reviewCount: reviewSummary?.totalReviews ?? profile.reviewCount,
        reviewDistribution: reviewSummary?.distribution,
        distance: '—',
        price: profile.offers[0]?.priceFromMinor ? profile.offers[0].priceFromMinor / 100 : 0,
        currency: profile.offers[0]?.currencyCode ?? 'RUB',
        nextSlot: 'Available on request',
        image: profile.coverImageUrl,
        logoUrl: profile.logoUrl,
        bonus: profile.bonusSummary ?? undefined,
        verified: profile.verified,
        brandSpecializations: profile.brandSpecializations,
        isMultibrand: profile.isMultibrand,
        trustScore: profile.trustScore,
        trustBadge: profile.trustBadge,
        address: profile.location.address,
        hours: profile.location.hours,
        yearsActive: profile.yearsActive,
        staffCount: profile.staffCount,
        workstationCount: profile.workstationCount ?? 0,
        phone: profile.phone ?? null,
        phones: profile.phones.length > 0 ? profile.phones : profile.phone ? [profile.phone] : [],
        email: profile.email ?? null,
        websiteUrl: profile.websiteUrl ?? null,
        metroStation: profile.metroStation ?? null,
        warrantyText: profile.warrantyText ?? null,
        galleryImageUrls: profile.galleryImageUrls,
        about: profile.description ?? 'A verified automotive service provider with transparent offers and service support.',
        amenities: profile.amenityIds.filter((amenityId): amenityId is AutomotiveAmenityId => automotiveAmenities.some((amenity) => amenity.id === amenityId)),
        offerings: profile.offers.map(mapOffer),
        reviews: reviewSummary ? reviewSummary.reviews.map(mapReview) : IS_MOCK_API ? [
            { id: `${profile.id}-review-1`, author: 'Alex M.', rating: 5, date: '2 days ago', text: 'Clear estimate, fast work, and the final price matched the agreed scope.', serviceId: profile.offers[0]?.serviceSlug ?? '', photos: ['/images/autocare/providers/generated/service-body-paint.png'] },
            { id: `${profile.id}-review-2`, author: 'Maria S.', rating: 5, date: '1 week ago', text: 'Convenient appointment time and detailed updates while the car was in service.', serviceId: profile.offers[0]?.serviceSlug ?? '', photos: ['/images/autocare/providers/generated/service-tire-service.png'] },
            { id: `${profile.id}-review-3`, author: 'Igor P.', rating: 4, date: '2 weeks ago', text: 'The specialist explained the options before starting the repair.', serviceId: profile.offers[0]?.serviceSlug ?? '' },
        ] : [],
        mapPosition: profile.location.latitude !== null && profile.location.longitude !== null
            ? [profile.location.latitude, profile.location.longitude]
            : undefined,
        supportsMobile: profile.location.supportsMobile,
        supportsPickup: profile.location.supportsPickup,
        coverageRadiusKm: profile.location.coverageRadiusKm,
        teamSize: profile.teamSize ?? 'small_team',
        businessType: profile.businessType ?? 'company',
        chatEnabled: profile.chatEnabled ?? true,
        communicationMode: profile.communicationMode ?? 'online',
        responseWindowMinutes: profile.responseWindowMinutes ?? 240,
        responseHours: profile.responseHours ?? 'working_hours',
        phoneBookingEnabled: profile.phoneBookingEnabled ?? true,
        callbackEnabled: profile.callbackEnabled ?? true,
        requestPhotosEnabled: profile.requestPhotosEnabled ?? true,
        publicContactNote: profile.publicContactNote ?? null,
        timezone: profile.location.timezone,
        weeklySchedule: profile.location.weeklySchedule,
        blackoutDates: profile.location.blackoutDates,
        appointmentCapacity: profile.location.appointmentCapacity,
    }
}
