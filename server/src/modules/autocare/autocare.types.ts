import type { AutomotivePriceType, AutomotiveProviderStatus } from '../../entities/automotive/automotive.entity.js'

export type AutoCareMarketResponse = {
    id: string
    countryCode: string
    countryName: string
    cityCode: string
    cityName: string
    currencyCode: string
    defaultLocale: string
    supportedLocales: string[]
    timezone: string
    launchReady: boolean
}

export type AutoCareServiceDefinitionResponse = {
    id: string
    slug: string
    categorySlug: string
    labels: Record<string, string>
    priceType: AutomotivePriceType
    comparisonAttributes: string[]
    active: boolean
}

export type AutoCareProviderResponse = {
    id: string
    name: string
    description: string | null
    status: AutomotiveProviderStatus
    verified: boolean
    yearsActive: number
    staffCount: number
    rating: number
    reviewCount: number
    bonusSummary: string | null
    coverImageUrl: string
    galleryImageUrls: string[]
    location: AutoCareLocationResponse
}

export type AutoCareLocationResponse = {
    id: string
    marketId: string
    address: string
    hours: string
    latitude: number | null
    longitude: number | null
}

export type AutoCareOfferResponse = {
    id: string
    serviceDefinitionId: string
    serviceSlug?: string
    serviceLabels?: Record<string, string>
    priceFromMinor: number
    priceToMinor: number | null
    currencyCode: string
    durationMinutes: number
    inclusions: string[]
    warrantyText: string | null
    active: boolean
}

export type AutoCareProviderResultResponse = {
    provider: AutoCareProviderResponse
    offer: AutoCareOfferResponse
    distanceKm: number
    nextSlot: string | null
}

export type AutoCareDiscoveryResponse = {
    items: AutoCareProviderResultResponse[]
    nextCursor: string | null
}

export type AutoCareProviderProfileResponse = AutoCareProviderResponse & {
    offers: AutoCareOfferResponse[]
}
