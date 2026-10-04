

export type AutoCareApiOffer = {
    id: string
    serviceDefinitionId: string
    serviceSlug?: string
    serviceLabels?: Record<string, string>
    description?: string | null
    priceFromMinor: number
    priceToMinor: number | null
    currencyCode: string
    durationMinutes: number
    inclusions: string[]
    warrantyText: string | null
    active: boolean
    priceType?: 'fixed' | 'from' | 'range' | 'quote_required'
    bookingMode?: 'request' | 'instant'
    requiredResourceTypes?: Array<'specialist' | 'bay' | 'lift' | 'equipment'>
    requiredResourceIds?: string[]
}

export type UpdateAutoCareOfferInput = {
    providerId: string
    offerId: string
    description: string | null
    priceFromMinor: number
    bookingMode?: 'request' | 'instant'
    requiredResourceTypes?: Array<'specialist' | 'bay' | 'lift' | 'equipment'>
    requiredResourceIds?: string[]
}

export type AutoCareApiProvider = {
    id: string
    name: string
    description: string | null
    status: 'draft' | 'active' | 'suspended'
    verified: boolean
    yearsActive: number
    staffCount: number
    rating: number
    reviewCount: number
    bonusSummary: string | null
    phone?: string | null
    phones: string[]
    email?: string | null
    websiteUrl?: string | null
    metroStation?: string | null
    workstationCount?: number
    teamSize?: 'solo' | 'small_team' | 'team' | 'enterprise'
    businessType?: 'sole_proprietor' | 'self_employed' | 'company' | 'private_master' | 'other'
    chatEnabled?: boolean
    communicationMode?: 'online' | 'request_then_confirm' | 'phone_only'
    responseWindowMinutes?: number | null
    responseHours?: 'working_hours' | 'always_on'
    phoneBookingEnabled?: boolean
    callbackEnabled?: boolean
    requestPhotosEnabled?: boolean
    publicContactNote?: string | null
    warrantyText?: string | null
    logoUrl: string | null
    coverImageUrl: string | null
    galleryImageUrls: string[]
    amenityIds: string[]
    brandSpecializations: string[]
    isMultibrand: boolean
    location: {
        id: string
        marketId: string
        zoneId?: string | null
        address: string
        hours: string
        appointmentCapacity?: number
        timezone?: string
        weeklySchedule?: Record<string, { open: string; close: string; closed: boolean }>
        blackoutDates?: string[]
        latitude: number | null
        longitude: number | null
        supportsMobile?: boolean
        supportsPickup?: boolean
        coverageRadiusKm?: number | null
        dispatchBasePriceMinor?: number
        etaMinutes?: number | null
    }
    trustScore?: number
    trustBadge?: string | null
    trustReassessedAt?: string | null
    offers?: AutoCareApiOffer[]
    locations?: Array<{
        location: AutoCareApiProvider['location']
        offers: AutoCareApiOffer[]
    }>
    /** True when the API intentionally returned a usable subset while another projection is still loading. */
    partial?: boolean
}

export type AutoCareApiDiscoveryItem = {
    provider: AutoCareApiProvider
    offer: AutoCareApiOffer
    distanceKm: number
    nextSlot: string | null
}

export type AutoCareApiDiscoveryResponse = {
    items: AutoCareApiDiscoveryItem[]
    nextCursor: string | null
    totalCount: number
    totalCountIsLowerBound: boolean
    partial?: boolean
}

export type AutoCareApiProviderProfile = AutoCareApiProvider & {
    offers: AutoCareApiOffer[]
    locations?: Array<{
        location: AutoCareApiProvider['location']
        offers: AutoCareApiOffer[]
    }>
}

export type UpdateAutoCareCommunicationSettingsInput = {
    providerId: string
    teamSize: NonNullable<AutoCareApiProvider['teamSize']>
    businessType: NonNullable<AutoCareApiProvider['businessType']>
    chatEnabled: boolean
    communicationMode: NonNullable<AutoCareApiProvider['communicationMode']>
    responseWindowMinutes: number | null
    responseHours: NonNullable<AutoCareApiProvider['responseHours']>
    phoneBookingEnabled: boolean
    callbackEnabled: boolean
    requestPhotosEnabled: boolean
    publicContactNote: string | null
}

export type AutoCareProviderAnalytics = {
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
    tracking: { impressions: number; profileOpens: number; available: boolean }
    privacy: { consentRequired: boolean; retentionDays: number }
}

export type OwnerAutoCareEvidence = {
    id: string
    providerId: string
    kind: string
    label: string
    status: string
    reference: string | null
    notes: string | null
    expiresAt: string | null
    createdAt: string
    verifiedAt: string | null
}

export type AutoCareFavorite = {
    id: string
    providerId: string
    locationId: string
    createdAt: string
    provider: AutoCareApiProvider
    offer: AutoCareApiOffer | null
}

export type CreateOwnerAutoCareProviderInput = {
    name: string
    description?: string
    marketId?: string
    countryCode?: string
    countryName?: string
    cityName?: string
    currencyCode?: string
    address: string
    hours: string
    timezone?: string
    weeklySchedule?: Record<string, { open: string; close: string; closed: boolean }>
    blackoutDates?: string[]
    yearsActive: number
    staffCount: number
    workstationCount?: number
    teamSize?: 'solo' | 'small_team' | 'team' | 'enterprise'
    businessType?: 'sole_proprietor' | 'self_employed' | 'company' | 'private_master' | 'other'
    chatEnabled?: boolean
    communicationMode?: 'online' | 'request_then_confirm' | 'phone_only'
    responseWindowMinutes?: number | null
    responseHours?: 'working_hours' | 'always_on'
    phoneBookingEnabled?: boolean
    callbackEnabled?: boolean
    requestPhotosEnabled?: boolean
    publicContactNote?: string | null
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
    documents?: Array<{ label: string; reference: string; expiresAt?: string | null }>
}

export type UploadOwnerAutoCareProviderMediaInput = {
    kind: 'cover' | 'gallery'
    fileName: string
    mimeType: string
    size: number
    contentBase64: string
}

export type AutoCareDiscoveryQuery = {
    serviceId?: string
    providerName?: string
    marketId?: string
    zoneId?: string
    radiusKm?: number
    sort?: 'recommended' | 'price_asc' | 'rating_desc' | 'distance_asc'
    limit?: number
    cursor?: string
    minPrice?: number
    maxPrice?: number
    minRating?: number
    availableToday?: boolean
    priceType?: 'fixed' | 'from' | 'range' | 'quote_required'
    verifiedOnly?: boolean
    warrantyOnly?: boolean
    hasBonus?: boolean
    inclusion?: string
    brandId?: string
}
