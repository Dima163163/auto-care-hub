import type { AutomotivePriceType, AutomotiveProviderStatus } from '../../entities/automotive/automotive.entity.js'
import type { ServiceRequestStatus } from '../../entities/automotive/service-request.entity.js'

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
    logoUrl: string | null
    coverImageUrl: string | null
    galleryImageUrls: string[]
    amenityIds: string[]
    brandSpecializations: string[]
    isMultibrand: boolean
    location: AutoCareLocationResponse
    offers?: AutoCareOfferResponse[]
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
    priceType?: 'fixed' | 'from' | 'range' | 'quote_required'
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

export type AutoCareDiscoveryQuery = {
    serviceId?: string
    marketId?: string
    radiusKm: number
    sort: 'recommended' | 'price_asc' | 'rating_desc' | 'distance_asc'
    cursor?: string
    limit: number
    minPrice?: number
    maxPrice?: number
    minRating?: number
    priceType?: 'fixed' | 'from' | 'range' | 'quote_required'
    availableToday?: boolean
    verifiedOnly?: boolean
    warrantyOnly?: boolean
    hasBonus?: boolean
    inclusion?: string
    brandId?: string
}

export type AutoCareProviderProfileResponse = AutoCareProviderResponse & {
    offers: AutoCareOfferResponse[]
}

export type AutoCareReviewResponse = {
    id: string
    providerId: string
    authorName: string
    vehicleLabel: string
    rating: number
    text: string
    avatarUrl: string | null
    createdAt: string
}

export type AutoCareAvailabilitySlotResponse = {
    startTime: string
    endTime: string
}

export type AutoCareAvailabilityResponse = {
    date: string
    durationMinutes: number
    slots: AutoCareAvailabilitySlotResponse[]
}

export type OwnerAutoCareProviderInput = {
    name: string
    description?: string | null
    marketId: string
    address: string
    hours: string
    yearsActive: number
    staffCount: number
    isMultibrand: boolean
    brandSpecializations: string[]
    amenityIds: string[]
    logoUrl?: string | null
}

export type AutoCareRequestSnapshot = Record<string, string | number | null>

export type CreateAutoCareServiceRequestInput = {
    providerId: string
    locationId: string
    offeringId: string
    preferredAt: string
    vehicleSnapshot?: AutoCareRequestSnapshot | null
    contactSnapshot: AutoCareRequestSnapshot
    note?: string | null
    idempotencyKey?: string
}

export type AutoCareServiceRequestResponse = {
    id: string
    providerId: string
    providerName: string
    locationId: string
    address: string
    definitionId: string
    serviceSlug: string
    serviceLabels: Record<string, string>
    offeringId: string | null
    priceFromMinor: number | null
    currencyCode: string | null
    preferredAt: string | null
    vehicleSnapshot: AutoCareRequestSnapshot | null
    contactSnapshot: AutoCareRequestSnapshot | null
    note: string | null
    quote: AutoCareServiceQuoteResponse | null
    status: ServiceRequestStatus
    clientConfirmedAt: string | null
    providerConfirmedAt: string | null
    createdAt: string
    updatedAt: string
}

export type AutoCareServiceQuoteResponse = {
    amountMinor: number
    currencyCode: string
    note: string | null
    createdAt: string
}

export type AutoCareServiceMessageResponse = {
    id: string
    senderId: string
    kind: 'text' | 'system'
    body: string | null
    createdAt: string
}

export type AutoCareServiceAttachmentResponse = {
    id: string
    uploadedById: string
    contentType: string
    bytes: number
    status: 'pending' | 'ready' | 'rejected'
    url: string
    createdAt: string
}

export type AutoCareServiceRequestConversationResponse = {
    request: AutoCareServiceRequestResponse
    messages: AutoCareServiceMessageResponse[]
    attachments: AutoCareServiceAttachmentResponse[]
}

export type CreateAutoCareServiceMessageInput = {
    body: string
}

export type CreateAutoCareServiceAttachmentInput = {
    fileName: string
    contentType: 'image/jpeg' | 'image/png' | 'image/webp'
    size: number
    contentBase64: string
}

export type CreateAutoCareServiceQuoteInput = {
    amountMinor: number
    currencyCode: string
    note?: string | null
}
