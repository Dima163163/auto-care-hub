import type { AutomotivePriceType, AutomotiveProviderStatus } from '../../entities/automotive/automotive.entity.js'
import type { ServiceMessageOffer, ServiceRequestStatus } from '../../entities/automotive/service-request.entity.js'
import type { AutoCareChatThreadStatus, AutoCareChatThreadType } from '../../entities/automotive/service-request.entity.js'

export type AutoCareMarketResponse = {
    id: string
    countryCode: string
    countryName: string
    cityCode: string
    cityName: string
    regionCode: string | null
    regionName: string | null
    centerLatitude: number | null
    centerLongitude: number | null
    currencyCode: string
    defaultLocale: string
    supportedLocales: string[]
    timezone: string
    launchReady: boolean
}

export type AutoCareLocationZoneResponse = {
    id: string
    marketId: string
    parentId: string | null
    slug: string
    zoneType: 'district' | 'neighborhood' | 'service_area'
    names: Record<string, string>
    centerLatitude: number | null
    centerLongitude: number | null
    radiusKm: number | null
    imageUrl: string | null
    serviceCount: number
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
    phone: string | null
    email: string | null
    websiteUrl: string | null
    metroStation: string | null
    workstationCount: number
    warrantyText: string | null
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
    zoneId: string | null
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
    description: string | null
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
    zoneId?: string
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
    photoUrls: string[]
    createdAt: string
    serviceRequestId: string | null
    serviceSlug: string | null
    revisionAllowedUntil: string | null
    revisionUsedAt: string | null
    canContact: boolean
    canEdit: boolean
}

export type AutoCareReviewPromoResponse = {
    id: string
    reviewId: string
    providerId: string
    serviceRequestId: string | null
    serviceSlug: string | null
    code: string
    discountPercent: number
    status: 'active' | 'redeemed' | 'revoked' | 'expired'
    expiresAt: string
    redeemedAt: string | null
}

export type CreateAutoCareReviewPromoInput = {
    discountPercent: number
    serviceSlug?: string | null
    expiresInDays: number
}

export type RedeemAutoCareReviewPromoInput = { code: string }
export type UpdateAutoCareReviewInput = { rating: number; text: string }

export type OwnerAutoCareProviderReviewsResponse = {
    providerId: string
    totalReviews: number
    averageRating: number
    distribution: Record<'1' | '2' | '3' | '4' | '5', number>
    reviews: AutoCareReviewResponse[]
}

export type OwnerAutoCareReviewsProviderResponse = {
    id: string
    name: string
    address: string
    rating: number
    reviewCount: number
}

export type OwnerAutoCareReviewsResponse = {
    selectedProviderId: string | null
    providers: OwnerAutoCareReviewsProviderResponse[]
    totalReviews: number
    averageRating: number
    distribution: Record<'1' | '2' | '3' | '4' | '5', number>
    reviews: Array<AutoCareReviewResponse & { providerName: string; providerAddress: string }>
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
    zoneId?: string | null
    address: string
    hours: string
    yearsActive: number
    staffCount: number
    workstationCount?: number
    phone?: string | null
    email?: string | null
    websiteUrl?: string | null
    metroStation?: string | null
    warrantyText?: string | null
    bonusSummary?: string | null
    isMultibrand: boolean
    brandSpecializations: string[]
    amenityIds: string[]
    logoUrl?: string | null
    coverImageUrl?: string | null
    galleryImageUrls?: string[]
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
    serviceDescription: string | null
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
    kind: 'text' | 'system' | 'offer'
    body: string | null
    offer: ServiceMessageOffer | null
    deliveredAt: string | null
    readAt: string | null
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

export type AutoCareChatThreadResponse = {
    id: string
    type: AutoCareChatThreadType
    status: AutoCareChatThreadStatus
    subject: string
    requestId: string | null
    providerId: string | null
    providerName: string | null
    clientId: string | null
    lastMessageAt: string | null
    unreadCount: number
    createdAt: string
    updatedAt: string
}

export type AutoCareChatConversationResponse = {
    thread: AutoCareChatThreadResponse
    messages: AutoCareServiceMessageResponse[]
    attachments: AutoCareServiceAttachmentResponse[]
}

export type CreateAutoCareChatInput = {
    type: 'provider_inquiry' | 'support' | 'admin_escalation'
    providerId?: string
    requestId?: string
    subject: string
}

export type CreateAutoCareChatMessageInput = { body: string }

export type AutoCareServiceRequestConversationResponse = {
    request: AutoCareServiceRequestResponse
    messages: AutoCareServiceMessageResponse[]
    attachments: AutoCareServiceAttachmentResponse[]
}

export type CreateAutoCareServiceMessageInput = {
    body: string
}

export type CreateAutoCareServiceOfferInput = {
    type: 'discount' | 'alternative'
    title: string
    description?: string | null
    discountPercent?: number | null
    couponCode?: string | null
    amountMinor?: number | null
    currencyCode?: string | null
    expiresAt?: string | null
}

export type AutoCareServiceOfferDecision = 'accept' | 'decline'

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
