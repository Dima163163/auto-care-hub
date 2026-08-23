import type { AutomotivePriceType, AutomotiveProviderStatus } from '../../entities/automotive/automotive.entity.js'
import type { AutomotiveProviderChangeRequestKind, AutomotiveProviderChangeRequestStatus } from '../../entities/automotive/provider-change-request.entity.js'
import type { AutomotiveCatalogGapRequestStatus } from '../../entities/automotive/catalog-gap-request.entity.js'
import type { ServiceMessageOffer, ServiceRequestStatus } from '../../entities/automotive/service-request.entity.js'
import type { AutoCareChatThreadStatus, AutoCareChatThreadType } from '../../entities/automotive/service-request.entity.js'
import type { AutoCareAppealStatus, AutoCareAppealSubject } from '../../entities/automotive/appeal.entity.js'

export type AutoCareAppealResponse = {
    id: string
    subject: AutoCareAppealSubject
    subjectId: string
    submittedById: string
    providerId: string | null
    reason: string
    evidenceIds: string[]
    status: AutoCareAppealStatus
    decidedById: string | null
    decisionReason: string | null
    createdAt: string
    decidedAt: string | null
}

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
    phones: string[]
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
    trustScore: number
    trustBadge: string | null
    trustReassessedAt: string | null
    location: AutoCareLocationResponse
    offers?: AutoCareOfferResponse[]
}

export type AutoCareLocationResponse = {
    id: string
    marketId: string
    zoneId: string | null
    address: string
    hours: string
    timezone: string
    weeklySchedule: Record<string, { open: string; close: string; closed: boolean }>
    blackoutDates: string[]
    latitude: number | null
    longitude: number | null
    supportsMobile: boolean
    supportsPickup: boolean
    coverageRadiusKm: number | null
    dispatchBasePriceMinor: number
    etaMinutes: number | null
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
    bookingMode: 'request' | 'instant'
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

export type AutoCarePriceBenchmarkResponse = {
    serviceDefinitionId: string
    serviceSlug: string
    marketId: string | null
    makeId: string | null
    modelId: string | null
    minPriceMinor: number
    medianPriceMinor: number
    maxPriceMinor: number
    currencyCode: string
    methodology: Record<string, unknown>
    source: string
    generatedAt: string
}

export type AutoCareDiscoveryQuery = {
    serviceId?: string
    providerName?: string
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

export type AutoCareProviderAnalyticsResponse = {
    providerId: string
    generatedAt: string
    inquiries: number
    openRequests: number
    confirmedBookings: number
    completedVisits: number
    cancelledRequests: number
    noShowRequests: number
    completionRate: number
    quoteConversionRate: number
    averageResponseMinutes: number | null
    repeatCustomers: number
    reviewCount: number
    averageRating: number
    bonusLiabilityPoints: number
    tracking: {
        impressions: number
        profileOpens: number
        available: boolean
    }
}

export type AutoCareFavoriteResponse = {
    id: string
    providerId: string
    locationId: string
    createdAt: string
    provider: AutoCareProviderResponse
    offer: AutoCareOfferResponse | null
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
export type CreateAutoCareReviewInput = { requestId: string; rating: number; text: string }
export type UpdateAutoCareReviewInput = { rating: number; text: string }

export type AutoCareProviderReviewsResponse = {
    providerId: string
    totalReviews: number
    averageRating: number
    distribution: Record<'1' | '2' | '3' | '4' | '5', number>
    reviews: AutoCareReviewResponse[]
}

export type AutoCareBonusProgramResponse = {
    id: string
    providerId: string
    name: string
    earnPercent: number
    maxEarnPointsPerVisit: number | null
    expiresAfterDays: number | null
    active: boolean
    createdAt: string
    updatedAt: string
}

export type AutoCareBonusLedgerEntryResponse = {
    id: string
    type: 'earn' | 'redeem' | 'expire' | 'adjustment'
    points: number
    reason: string
    requestId: string | null
    expiresAt: string | null
    createdAt: string
}

export type AutoCareBonusAccountResponse = {
    id: string
    providerId: string
    balancePoints: number
    earnedPoints: number
    redeemedPoints: number
    entries: AutoCareBonusLedgerEntryResponse[]
}

export type OwnerAutoCareBonusProgramInput = {
    name: string
    earnPercent: number
    maxEarnPointsPerVisit?: number | null
    expiresAfterDays?: number | null
    active?: boolean
}

export type RedeemAutoCareBonusInput = {
    providerId: string
    requestId: string
    points: number
}

export type GrantAutoCareBonusInput = {
    providerId: string
    clientId: string
    points: number
    reason: string
}

export type OwnerAutoCareProviderReviewsResponse = AutoCareProviderReviewsResponse

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
    timezone: string
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
    timezone?: string
    weeklySchedule?: Record<string, { open: string; close: string; closed: boolean }>
    blackoutDates?: string[]
    yearsActive: number
    staffCount: number
    workstationCount?: number
    phone?: string | null
    phones?: string[]
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

export type AutoCareProviderChangeRequestPayload = Record<string, unknown>

export type CreateAutoCareProviderChangeRequestInput = {
    kind: AutomotiveProviderChangeRequestKind
    payload?: AutoCareProviderChangeRequestPayload
}

export type AutoCareProviderChangeRequestResponse = {
    id: string
    providerId: string
    requestedById: string
    kind: AutomotiveProviderChangeRequestKind
    status: AutomotiveProviderChangeRequestStatus
    payload: AutoCareProviderChangeRequestPayload
    reviewedById: string | null
    reviewReason: string | null
    reviewedAt: string | null
    createdAt: string
    updatedAt: string
}

export type CreateAutoCareCatalogGapRequestInput = {
    providerId?: string | null
    proposedSlug: string
    categorySlug: string
    labels: Record<string, string>
    priceType: AutomotivePriceType
    comparisonAttributes: string[]
    rationale: string
}

export type AutoCareCatalogGapRequestResponse = {
    id: string
    requestedById: string
    providerId: string | null
    proposedSlug: string
    categorySlug: string
    labels: Record<string, string>
    priceType: AutomotivePriceType
    comparisonAttributes: string[]
    rationale: string
    status: AutomotiveCatalogGapRequestStatus
    reviewedById: string | null
    reviewReason: string | null
    reviewedAt: string | null
    createdAt: string
    updatedAt: string
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
    quoteHistory: AutoCareServiceQuoteHistoryResponse[]
    acceptedQuoteVersion: number | null
    acceptedQuoteSnapshot: Record<string, unknown> | null
    acceptedQuoteAt: string | null
    booking: AutoCareBookingSnapshotResponse | null
    status: ServiceRequestStatus
    clientConfirmedAt: string | null
    providerConfirmedAt: string | null
    cancelledAt: string | null
    cancelledById: string | null
    cancellationReason: string | null
    noShowAt: string | null
    noShowById: string | null
    noShowReason: string | null
    completedAt: string | null
    completedById: string | null
    completionNote: string | null
    reschedule: AutoCareRescheduleResponse | null
    createdAt: string
    updatedAt: string
}

export type AutoCareBookingSnapshotResponse = {
    requestId: string
    quoteVersion: number
    amountMinor: number
    currencyCode: string
    lineItems: AutoCareQuoteLineItemResponse[]
    scheduledAt: string
    timezone: string
    serviceSlug: string
    providerId: string
    locationId: string
    status: 'confirmed'
    createdAt: string
}

export type AutoCareRescheduleResponse = {
    id: string
    proposedAt: string
    requestedById: string
    status: 'pending' | 'accepted' | 'rejected'
    reason: string | null
    resolvedById: string | null
    resolutionReason: string | null
    createdAt: string
    resolvedAt: string | null
}

export type AutoCareServiceQuoteResponse = {
    amountMinor: number
    lineItems: AutoCareQuoteLineItemResponse[]
    subtotalMinor: number
    taxMinor: number
    feesMinor: number
    currencyCode: string
    note: string | null
    validUntil: string | null
    priceLocked: boolean
    createdAt: string
}

export type AutoCareServiceQuoteHistoryResponse = AutoCareServiceQuoteResponse & {
    id: string
    version: number
}

export type AutoCareQuoteLineItemResponse = {
    kind: 'part' | 'labour' | 'consumable' | 'tax' | 'fee' | 'discount'
    title: string
    quantity: number
    unitPriceMinor: number
    totalMinor: number
}

export type AutoCareRepairEventResponse = {
    id: string
    requestId: string
    eventType: string
    actorId: string | null
    title: string
    notes: string | null
    metadata: Record<string, unknown>
    createdAt: string
}

export type CreateAutoCareBroadcastRequestInput = {
    serviceDefinitionId: string
    marketId?: string | null
    issueDescription: string
    vehicleSnapshot?: AutoCareRequestSnapshot | null
    photoUrls?: string[]
    preferredAt?: string | null
    maxProviders?: number
}

export type AutoCareBroadcastOfferResponse = {
    id: string
    broadcastRequestId: string
    providerId: string
    providerName: string
    locationId: string
    address: string
    offerSnapshot: Record<string, unknown>
    status: string
    createdAt: string
}

export type AutoCareBroadcastRequestResponse = {
    id: string
    serviceDefinitionId: string
    serviceSlug: string
    marketId: string | null
    issueDescription: string
    vehicleSnapshot: AutoCareRequestSnapshot | null
    preferredAt: string | null
    status: string
    maxProviders: number
    expiresAt: string
    createdAt: string
    offers: AutoCareBroadcastOfferResponse[]
}

export type CreateAutoCareBroadcastOfferInput = {
    locationId: string
    amountMinor: number
    currencyCode: string
    note?: string | null
    durationMinutes?: number
    validUntil?: string | null
}

export type AutoCareTrustEvidenceResponse = {
    id: string
    providerId: string
    kind: string
    label: string
    status: string
    expiresAt: string | null
    verifiedAt: string | null
}

export type AutoCareTrustFactorsResponse = {
    profile: number
    reviews: number
    evidence: number
    reliability: number
    claimsPenalty: number
}

export type AutoCareTrustSnapshotResponse = {
    id: string
    providerId: string
    locationId: string
    policyVersion: string
    score: number
    badge: string | null
    computedAt: string
    validUntil: string
    inputCounters: Record<string, number>
    reasonCodes: string[]
}

export type AutoCareGuaranteeClaimResponse = {
    id: string
    requestId: string
    claimType: string
    status: string
    summary: string
    evidenceUrls: string[]
    resolution: string | null
    createdAt: string
    updatedAt: string
}

export type AutoCareExpertQuestionResponse = {
    id: string
    symptoms: string
    categorySlug: string | null
    vehicleSnapshot: Record<string, unknown> | null
    status: string
    answer: string | null
    createdAt: string
    answeredAt: string | null
}

export type AutoCareFleetVehicleResponse = {
    id: string
    fleetId: string
    label: string
    vehicleSnapshot: Record<string, unknown>
    approvalPolicy: string | null
    createdAt: string
}

export type AutoCareFleetResponse = {
    id: string
    name: string
    notes: string | null
    vehicles: AutoCareFleetVehicleResponse[]
    createdAt: string
    updatedAt: string
}

export type CreateAutoCareFleetInput = { name: string; notes?: string | null }
export type CreateAutoCareFleetVehicleInput = { label: string; vehicleSnapshot: Record<string, unknown>; approvalPolicy?: string | null }

export type CreateAutoCareProviderInvitationInput = {
    email: string
    role: 'manager' | 'staff'
    locationId?: string | null
}

export type AutoCareProviderInvitationResponse = {
    id: string
    providerId: string
    email: string
    locationId: string | null
    role: 'manager' | 'staff'
    status: 'pending' | 'accepted' | 'revoked' | 'expired'
    expiresAt: string
    acceptedAt: string | null
    revokedAt: string | null
    createdAt: string
    inviteToken: string | null
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
    nextCursor: string | null
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
    nextCursor: string | null
}

export type CreateAutoCareServiceMessageInput = {
    body: string
    idempotencyKey?: string
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
    lineItems?: AutoCareQuoteLineItemInput[]
    taxMinor?: number
    feesMinor?: number
    validUntil?: string | null
    priceLocked?: boolean
}

export type AutoCareQuoteLineItemInput = {
    kind: 'part' | 'labour' | 'consumable' | 'tax' | 'fee' | 'discount'
    title: string
    quantity: number
    unitPriceMinor: number
}
