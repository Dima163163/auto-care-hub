import { baseApi } from '@/shared/api/baseApi'
import { z } from 'zod'

export type AutoCareApiMarket = {
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

export type UpdateSuperAdminAutoCareMarketInput = {
    id: string
    defaultLocale: string
    supportedLocales: string[]
    timezone: string
    currencyCode: string
    launchReady: boolean
}

export type AutoCareApiLocationZone = {
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

export type AutoCareApiServiceDefinition = {
    id: string
    slug: string
    categorySlug: string
    labels: Record<string, string>
    priceType: 'fixed' | 'from' | 'range' | 'quote_required'
    comparisonAttributes: string[]
    active: boolean
}

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
}

export type UpdateAutoCareOfferInput = {
    providerId: string
    offerId: string
    description: string | null
    priceFromMinor: number
    bookingMode?: 'request' | 'instant'
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
}

export type AutoCareApiProviderProfile = AutoCareApiProvider & {
    offers: AutoCareApiOffer[]
    locations?: Array<{
        location: AutoCareApiProvider['location']
        offers: AutoCareApiOffer[]
    }>
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
}

export type AutoCareFavorite = {
    id: string
    providerId: string
    locationId: string
    createdAt: string
    provider: AutoCareApiProvider
    offer: AutoCareApiOffer | null
}

export type AdminAutoCareProvider = AutoCareApiProvider & {
    ownerName: string | null
    trustScore: number
}

export type SuperAdminPlatformOverview = {
    markets: Array<{ id: string; countryCode: string; countryName: string; cityCode: string; cityName: string; currencyCode: string; launchReady: boolean; supportedLocales: string[] }>
    providers: { total: number; active: number; draft: number; suspended: number; verified: number }
    users: { clients: number; owners: number; admins: number; superAdmins: number }
    billing: { phase: 'launch'; subscriptionsEnabled: boolean; promoCodesEnabled: boolean }
}

export type AutoCareQualityMonitoring = {
    generatedAt: string
    providers: { total: number; active: number; verified: number; trusted: number; suspended: number }
    reviews: { approved: number; pending: number; rejected: number; anomalyCandidates: number }
    requests: { total: number; completed: number; cancelled: number; noShows: number }
    ranking: { trustSnapshots: number; reassessedProviders: number; evidenceCoveragePercent: number }
    catalog: { activeDefinitions: number; activeOffers: number; providersWithOffers: number; offerCoveragePercent: number; offersWithDescription: number; offersWithPrice: number; priceCoveragePercent: number }
    supply: { activeMarkets: number; averageLocationsPerProvider: number; markets: Array<{ marketId: string; providers: number; locations: number; activeOffers: number }> }
    reliability: { responseSamples: number; averageResponseMinutes: number | null; p95ResponseMinutes: number | null; confirmedBookings: number; confirmationSamples: number; confirmationReliabilityPercent: number; bookingConflicts: number }
    appeals: { available: true; pending: number }
}

export type AutoCareAppeal = { id: string; subject: 'provider' | 'review' | 'suspension' | 'catalog'; subjectId: string; submittedById: string; providerId: string | null; reason: string; evidenceIds: string[]; status: 'pending' | 'accepted' | 'rejected' | 'withdrawn'; decidedById: string | null; decisionReason: string | null; createdAt: string; decidedAt: string | null }
export type CreateAutoCareAppealInput = { subject: AutoCareAppeal['subject']; subjectId: string; providerId?: string | null; reason: string; evidenceIds?: string[] }

export type AutoCareApiReview = {
    id: string
    providerId: string
    authorName: string
    vehicleLabel: string
    rating: number
    text: string
    avatarUrl: string | null
    photoUrls: string[]
    createdAt: string
    serviceRequestId?: string | null
    serviceSlug?: string | null
    revisionAllowedUntil?: string | null
    revisionUsedAt?: string | null
    canContact?: boolean
    canEdit?: boolean
    providerName?: string
    providerAddress?: string
}

export type AutoCareReviewPromo = {
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

export type AutoCareBonusProgram = {
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

export type AutoCareBonusLedgerEntry = {
    id: string
    type: 'earn' | 'redeem' | 'expire' | 'adjustment'
    points: number
    reason: string
    requestId: string | null
    expiresAt: string | null
    createdAt: string
}

export type AutoCareBonusAccount = {
    id: string
    providerId: string
    balancePoints: number
    earnedPoints: number
    redeemedPoints: number
    entries: AutoCareBonusLedgerEntry[]
}

export type OwnerAutoCareBonusProgramInput = {
    providerId: string
    name: string
    earnPercent: number
    maxEarnPointsPerVisit?: number | null
    expiresAfterDays?: number | null
    active?: boolean
}

export type AutoCareProviderMember = {
    id: string
    providerId: string
    userId: string
    locationId: string | null
    role: 'owner' | 'manager' | 'staff'
    status: 'active' | 'revoked'
    createdAt: string
}

export type AutoCareProviderInvitation = {
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

export type AutoCareProviderMembersResponse = {
    memberships: AutoCareProviderMember[]
    invitations: AutoCareProviderInvitation[]
}

export type RedeemAutoCareBonusInput = { providerId: string; requestId: string; points: number }
export type GrantAutoCareBonusInput = { providerId: string; clientId: string; points: number; reason: string }

export type AutoCareProviderChangeRequest = {
    id: string
    providerId: string
    requestedById: string
    kind: 'verification' | 'profile_update'
    status: 'pending' | 'approved' | 'rejected' | 'cancelled'
    payload: Record<string, unknown>
    reviewedById: string | null
    reviewReason: string | null
    reviewedAt: string | null
    createdAt: string
    updatedAt: string
}

export type CreateAutoCareProviderChangeRequestInput = {
    providerId: string
    kind: AutoCareProviderChangeRequest['kind']
    payload?: Record<string, unknown>
}

export type DecideAutoCareProviderChangeRequestInput = {
    id: string
    status: 'approved' | 'rejected'
    reason?: string | null
}

export type CreateAutoCareCatalogGapRequestInput = {
    providerId?: string | null
    proposedSlug: string
    categorySlug: string
    labels: Record<string, string>
    priceType: 'fixed' | 'from' | 'range' | 'quote_required'
    comparisonAttributes: string[]
    rationale: string
}

export type AutoCareCatalogGapRequest = {
    id: string
    requestedById: string
    providerId: string | null
    proposedSlug: string
    categorySlug: string
    labels: Record<string, string>
    priceType: 'fixed' | 'from' | 'range' | 'quote_required'
    comparisonAttributes: string[]
    rationale: string
    status: 'pending' | 'approved' | 'rejected'
    reviewedById: string | null
    reviewReason: string | null
    reviewedAt: string | null
    createdAt: string
    updatedAt: string
}

export type DecideAutoCareCatalogGapRequestInput = { id: string; status: 'approved' | 'rejected'; reason?: string | null }

export type CreateAutoCareProviderInvitationInput = { providerId: string; email: string; role: 'manager' | 'staff'; locationId?: string | null }
export type AcceptAutoCareProviderInvitationInput = { token: string }

export type IssueAutoCareReviewPromoInput = {
    providerId: string
    reviewId: string
    discountPercent: number
    serviceSlug?: string | null
    expiresInDays?: number
}

export type RedeemAutoCareReviewPromoInput = { code: string }
export type CreateAutoCareReviewInput = { requestId: string; rating: number; text: string }
export type UpdateAutoCareReviewInput = { reviewId: string; rating: number; text: string }

export type AutoCareApiProviderReviews = {
    providerId: string
    totalReviews: number
    averageRating: number
    distribution: Record<'1' | '2' | '3' | '4' | '5', number>
    reviews: AutoCareApiReview[]
}

export type OwnerAutoCareReviewsProvider = { id: string; name: string; address: string; rating: number; reviewCount: number }
export type OwnerAutoCareReviews = { selectedProviderId: string | null; providers: OwnerAutoCareReviewsProvider[]; totalReviews: number; averageRating: number; distribution: Record<'1' | '2' | '3' | '4' | '5', number>; reviews: AutoCareApiReview[] }

export type AutoCareVehicleEngine = {
    id: string
    fuelType: 'petrol' | 'diesel' | 'hybrid' | 'electric' | 'lpg' | 'hydrogen' | 'other'
    displacementL: number | null
    horsepower: number | null
}

export type AutoCareVehicleModel = {
    id: string
    label: string
    yearsFrom: number
    yearsTo: number
    engines: AutoCareVehicleEngine[]
}

export type AutoCareVehicleBrand = {
    id: string
    labels: Record<string, string>
    models: AutoCareVehicleModel[]
}

const featuredReviewSchema = z.object({
    id: z.string(),
    providerId: z.string(),
    authorName: z.string(),
    vehicleLabel: z.string(),
    rating: z.number().int().min(1).max(5),
    text: z.string(),
    avatarUrl: z.string().nullable(),
    photoUrls: z.array(z.string().min(1)),
    createdAt: z.string().datetime({ offset: true }),
    serviceRequestId: z.string().nullable().optional(),
    serviceSlug: z.string().nullable().optional(),
    revisionAllowedUntil: z.string().datetime({ offset: true }).nullable().optional(),
    revisionUsedAt: z.string().datetime({ offset: true }).nullable().optional(),
    canContact: z.boolean().optional(),
    canEdit: z.boolean().optional(),
}) satisfies z.ZodType<AutoCareApiReview>

const reviewPromoSchema = z.object({
    id: z.string(),
    reviewId: z.string(),
    providerId: z.string(),
    serviceRequestId: z.string().nullable(),
    serviceSlug: z.string().nullable(),
    code: z.string(),
    discountPercent: z.number().int().min(1).max(100),
    status: z.enum(['active', 'redeemed', 'revoked', 'expired']),
    expiresAt: z.string().datetime({ offset: true }),
    redeemedAt: z.string().datetime({ offset: true }).nullable(),
}) satisfies z.ZodType<AutoCareReviewPromo>

const autoCareBonusProgramSchema = z.object({
    id: z.string(), providerId: z.string(), name: z.string(), earnPercent: z.number().finite().min(0).max(100),
    maxEarnPointsPerVisit: z.number().int().positive().nullable(), expiresAfterDays: z.number().int().positive().nullable(), active: z.boolean(),
    createdAt: z.string().datetime({ offset: true }), updatedAt: z.string().datetime({ offset: true }),
}).passthrough() satisfies z.ZodType<AutoCareBonusProgram>

const autoCareBonusAccountSchema = z.object({
    id: z.string(), providerId: z.string(), balancePoints: z.number().int().nonnegative(), earnedPoints: z.number().int().nonnegative(), redeemedPoints: z.number().int().nonnegative(),
    entries: z.array(z.object({ id: z.string(), type: z.enum(['earn', 'redeem', 'expire', 'adjustment']), points: z.number().int(), reason: z.string(), requestId: z.string().nullable(), expiresAt: z.string().datetime({ offset: true }).nullable(), createdAt: z.string().datetime({ offset: true }) }).passthrough()),
}).passthrough() satisfies z.ZodType<AutoCareBonusAccount>
const autoCareBonusAccountsSchema = z.array(autoCareBonusAccountSchema)

const autoCareProviderAnalyticsSchema = z.object({
    providerId: z.string(), generatedAt: z.string().datetime({ offset: true }),
    inquiries: z.number().int().nonnegative(), openRequests: z.number().int().nonnegative(),
    confirmedBookings: z.number().int().nonnegative(), completedVisits: z.number().int().nonnegative(),
    cancelledRequests: z.number().int().nonnegative(), noShowRequests: z.number().int().nonnegative(),
    completionRate: z.number().min(0).max(100), quoteConversionRate: z.number().min(0).max(100),
    averageResponseMinutes: z.number().nonnegative().nullable(), repeatCustomers: z.number().int().nonnegative(),
    reviewCount: z.number().int().nonnegative(), averageRating: z.number().min(0).max(5),
    bonusLiabilityPoints: z.number().int().nonnegative(),
    tracking: z.object({ impressions: z.number().int().nonnegative(), profileOpens: z.number().int().nonnegative(), available: z.boolean() }),
}).passthrough() satisfies z.ZodType<AutoCareProviderAnalytics>

const autoCareProviderInvitationSchema = z.object({
    id: z.string(), providerId: z.string(), email: z.string().email(), locationId: z.string().nullable(),
    role: z.enum(['manager', 'staff']), status: z.enum(['pending', 'accepted', 'revoked', 'expired']),
    expiresAt: z.string().datetime({ offset: true }), acceptedAt: z.string().datetime({ offset: true }).nullable(),
    revokedAt: z.string().datetime({ offset: true }).nullable(), createdAt: z.string().datetime({ offset: true }),
    inviteToken: z.string().nullable(),
}).passthrough() satisfies z.ZodType<AutoCareProviderInvitation>
const autoCareProviderMembersSchema = z.object({
    memberships: z.array(z.object({ id: z.string(), providerId: z.string(), userId: z.string(), locationId: z.string().nullable(), role: z.enum(['owner', 'manager', 'staff']), status: z.enum(['active', 'revoked']), createdAt: z.string().datetime({ offset: true }) }).passthrough()),
    invitations: z.array(autoCareProviderInvitationSchema),
}).passthrough() satisfies z.ZodType<AutoCareProviderMembersResponse>

const autoCareProviderChangeRequestSchema = z.object({
    id: z.string(),
    providerId: z.string(),
    requestedById: z.string(),
    kind: z.enum(['verification', 'profile_update']),
    status: z.enum(['pending', 'approved', 'rejected', 'cancelled']),
    payload: z.record(z.string(), z.unknown()),
    reviewedById: z.string().nullable(),
    reviewReason: z.string().nullable(),
    reviewedAt: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
}).passthrough() satisfies z.ZodType<AutoCareProviderChangeRequest>

const autoCareCatalogGapRequestSchema = z.object({
    id: z.string(), requestedById: z.string(), providerId: z.string().nullable(), proposedSlug: z.string(), categorySlug: z.string(),
    labels: z.record(z.string(), z.string()), priceType: z.enum(['fixed', 'from', 'range', 'quote_required']), comparisonAttributes: z.array(z.string()), rationale: z.string(),
    status: z.enum(['pending', 'approved', 'rejected']), reviewedById: z.string().nullable(), reviewReason: z.string().nullable(), reviewedAt: z.string().nullable(), createdAt: z.string(), updatedAt: z.string(),
}).passthrough() satisfies z.ZodType<AutoCareCatalogGapRequest>

const ownerProviderReviewsSchema = z.object({
    providerId: z.string(),
    totalReviews: z.number().int().nonnegative(),
    averageRating: z.number().min(0).max(5),
    distribution: z.object({
        '1': z.number().int().nonnegative(),
        '2': z.number().int().nonnegative(),
        '3': z.number().int().nonnegative(),
        '4': z.number().int().nonnegative(),
        '5': z.number().int().nonnegative(),
    }),
    reviews: z.array(featuredReviewSchema),
}) satisfies z.ZodType<AutoCareApiProviderReviews>

const ownerAutoCareReviewsSchema = z.object({
    selectedProviderId: z.string().nullable(),
    providers: z.array(z.object({ id: z.string(), name: z.string(), address: z.string(), rating: z.number().min(0).max(5), reviewCount: z.number().int().nonnegative() })),
    totalReviews: z.number().int().nonnegative(),
    averageRating: z.number().min(0).max(5),
    distribution: ownerProviderReviewsSchema.shape.distribution,
    reviews: z.array(featuredReviewSchema.extend({ providerName: z.string(), providerAddress: z.string() })),
}) satisfies z.ZodType<OwnerAutoCareReviews>

const autoCareOfferSchema = z.object({
    id: z.string(),
    serviceDefinitionId: z.string(),
    serviceSlug: z.string().optional(),
    serviceLabels: z.record(z.string(), z.string()).optional(),
    description: z.string().nullable().optional(),
    priceFromMinor: z.number().finite(),
    priceToMinor: z.number().finite().nullable(),
    currencyCode: z.string().min(3),
    durationMinutes: z.number().int().nonnegative(),
    inclusions: z.array(z.string()),
    warrantyText: z.string().nullable(),
    active: z.boolean(),
    priceType: z.enum(['fixed', 'from', 'range', 'quote_required']).optional(),
    bookingMode: z.enum(['request', 'instant']).optional(),
}).passthrough() satisfies z.ZodType<AutoCareApiOffer>

const autoCareProviderSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    status: z.enum(['draft', 'active', 'suspended']),
    verified: z.boolean(),
    yearsActive: z.number().finite(),
    staffCount: z.number().finite(),
    rating: z.number().min(0).max(5),
    reviewCount: z.number().int().nonnegative(),
    bonusSummary: z.string().nullable(),
    phone: z.string().nullable().optional(),
    phones: z.array(z.string().trim().min(5).max(32)).max(5).default([]),
    email: z.string().nullable().optional(),
    websiteUrl: z.string().nullable().optional(),
    metroStation: z.string().nullable().optional(),
    workstationCount: z.number().int().nonnegative().optional(),
    warrantyText: z.string().nullable().optional(),
    logoUrl: z.string().nullable(),
    coverImageUrl: z.string().nullable(),
    galleryImageUrls: z.array(z.string()),
    amenityIds: z.array(z.string()),
    brandSpecializations: z.array(z.string()),
    isMultibrand: z.boolean(),
    location: z.object({
        id: z.string(),
        marketId: z.string(),
        zoneId: z.string().nullable().optional(),
        address: z.string(),
        hours: z.string(),
        timezone: z.string().optional(),
        weeklySchedule: z.record(z.string(), z.object({ open: z.string(), close: z.string(), closed: z.boolean() })).optional(),
        blackoutDates: z.array(z.string()).optional(),
        latitude: z.number().finite().nullable(),
        longitude: z.number().finite().nullable(),
        supportsMobile: z.boolean().optional(),
        supportsPickup: z.boolean().optional(),
        coverageRadiusKm: z.number().finite().nullable().optional(),
        dispatchBasePriceMinor: z.number().finite().optional(),
        etaMinutes: z.number().finite().nullable().optional(),
    }),
    trustScore: z.number().finite().optional(),
    trustBadge: z.string().nullable().optional(),
    trustReassessedAt: z.string().nullable().optional(),
    offers: z.array(autoCareOfferSchema).optional(),
}).passthrough() satisfies z.ZodType<AutoCareApiProvider>

const autoCareProviderProfileSchema = autoCareProviderSchema.extend({
    offers: z.array(autoCareOfferSchema),
    locations: z.array(z.object({ location: autoCareProviderSchema.shape.location, offers: z.array(autoCareOfferSchema) })).optional(),
}).passthrough() satisfies z.ZodType<AutoCareApiProviderProfile>
const autoCareFavoriteSchema = z.object({
    id: z.string(),
    providerId: z.string(),
    locationId: z.string(),
    createdAt: z.string().datetime({ offset: true }),
    provider: autoCareProviderSchema,
    offer: autoCareOfferSchema.nullable(),
}).passthrough() satisfies z.ZodType<AutoCareFavorite>
const autoCareFavoritesSchema = z.array(autoCareFavoriteSchema)
const autoCareDiscoverySchema = z.object({
    items: z.array(z.object({
        provider: autoCareProviderSchema,
        offer: autoCareOfferSchema,
        distanceKm: z.number().finite().nonnegative(),
        nextSlot: z.string().nullable(),
    }).passthrough()),
    nextCursor: z.string().nullable(),
}).passthrough() satisfies z.ZodType<AutoCareApiDiscoveryResponse>
const autoCareMarketsSchema = z.array(z.object({
    id: z.string(), countryCode: z.string(), countryName: z.string(), cityCode: z.string(), cityName: z.string(),
    regionCode: z.string().nullable(), regionName: z.string().nullable(), centerLatitude: z.number().finite().nullable(), centerLongitude: z.number().finite().nullable(),
    currencyCode: z.string().min(3), defaultLocale: z.string(), supportedLocales: z.array(z.string()), timezone: z.string(), launchReady: z.boolean(),
}).passthrough()) satisfies z.ZodType<AutoCareApiMarket[]>
const autoCareLocationZonesSchema = z.array(z.object({
    id: z.string(), marketId: z.string(), parentId: z.string().nullable(), slug: z.string(), zoneType: z.enum(['district', 'neighborhood', 'service_area']), names: z.record(z.string(), z.string()),
    centerLatitude: z.number().finite().nullable(), centerLongitude: z.number().finite().nullable(), radiusKm: z.number().finite().nullable(), imageUrl: z.string().nullable(), serviceCount: z.number().int().nonnegative(),
}).passthrough()) satisfies z.ZodType<AutoCareApiLocationZone[]>
const autoCareAvailabilitySchema = z.object({ date: z.string(), timezone: z.string().optional(), durationMinutes: z.number().int().nonnegative(), slots: z.array(z.object({ startTime: z.string(), endTime: z.string() }).passthrough()) }).passthrough() satisfies z.ZodType<AutoCareAvailability>

const autoCareQuoteLineItemSchema = z.object({ kind: z.enum(['part', 'labour', 'consumable', 'tax', 'fee', 'discount']), title: z.string(), quantity: z.number().finite(), unitPriceMinor: z.number().finite(), totalMinor: z.number().finite() }).passthrough()
const autoCareQuoteSchema = z.object({ amountMinor: z.number().finite(), currencyCode: z.string(), note: z.string().nullable(), createdAt: z.string(), lineItems: z.array(autoCareQuoteLineItemSchema).optional(), subtotalMinor: z.number().finite().optional(), taxMinor: z.number().finite().optional(), feesMinor: z.number().finite().optional(), validUntil: z.string().nullable().optional(), priceLocked: z.boolean().optional() }).passthrough()
const autoCareQuoteHistorySchema = autoCareQuoteSchema.extend({ id: z.string().min(1), version: z.number().int().positive() }).passthrough()
const autoCareBookingSnapshotSchema = z.object({
    requestId: z.string(), quoteVersion: z.number().int().nonnegative(), amountMinor: z.number().finite(), currencyCode: z.string(),
    lineItems: z.array(autoCareQuoteLineItemSchema), scheduledAt: z.string(), timezone: z.string(), serviceSlug: z.string(),
    providerId: z.string(), locationId: z.string(), status: z.literal('confirmed'), createdAt: z.string(),
}).passthrough()
const autoCareRescheduleSchema = z.object({
    id: z.string().min(1), proposedAt: z.string(), requestedById: z.string(),
    status: z.enum(['pending', 'accepted', 'rejected']), reason: z.string().nullable(),
    resolvedById: z.string().nullable(), resolutionReason: z.string().nullable(),
    createdAt: z.string(), resolvedAt: z.string().nullable(),
}).passthrough()
const autoCareScalarRecordSchema = z.record(z.string(), z.union([z.string(), z.number(), z.null()]))
const autoCareServiceRequestSchema = z.object({
    id: z.string().min(1), providerId: z.string().min(1), providerName: z.string(), locationId: z.string().min(1), address: z.string(), definitionId: z.string().min(1), serviceSlug: z.string(),
    serviceLabels: z.record(z.string(), z.string()), serviceDescription: z.string().nullable().default(null), offeringId: z.string().nullable(), priceFromMinor: z.number().finite().nullable(), currencyCode: z.string().nullable(), preferredAt: z.string().nullable(),
    vehicleSnapshot: autoCareScalarRecordSchema.nullable(), contactSnapshot: autoCareScalarRecordSchema.nullable(), note: z.string().nullable(), status: z.enum(['draft', 'open', 'awaiting_reply', 'estimate_shared', 'accepted', 'declined', 'cancelled', 'no_show', 'closed']), clientConfirmedAt: z.string().nullable(), providerConfirmedAt: z.string().nullable(), cancelledAt: z.string().nullable().optional(), cancelledById: z.string().nullable().optional(), cancellationReason: z.string().nullable().optional(), noShowAt: z.string().nullable().optional(), noShowById: z.string().nullable().optional(), noShowReason: z.string().nullable().optional(), completedAt: z.string().nullable().optional(), completedById: z.string().nullable().optional(), completionNote: z.string().nullable().optional(), acceptedQuoteVersion: z.number().int().positive().nullable().optional(), acceptedQuoteSnapshot: z.record(z.string(), z.unknown()).nullable().optional(), acceptedQuoteAt: z.string().nullable().optional(), booking: autoCareBookingSnapshotSchema.nullable().optional(), reschedule: autoCareRescheduleSchema.nullable().default(null), createdAt: z.string(), updatedAt: z.string(), quote: autoCareQuoteSchema.nullable(), quoteHistory: z.array(autoCareQuoteHistorySchema).default([]),
}).passthrough()
const autoCareServiceRequestsSchema = z.array(autoCareServiceRequestSchema)
const autoCareChatThreadSchema = z.object({ id: z.string().min(1), type: z.enum(['service_request', 'provider_inquiry', 'support', 'admin_escalation']), status: z.enum(['open', 'closed']), subject: z.string(), requestId: z.string().nullable(), providerId: z.string().nullable(), providerName: z.string().nullable(), clientId: z.string().nullable(), lastMessageAt: z.string().nullable(), unreadCount: z.number().int().nonnegative(), createdAt: z.string(), updatedAt: z.string() }).passthrough()
const autoCareChatThreadsSchema = z.array(autoCareChatThreadSchema)
const autoCareServiceMessageOfferSchema = z.object({ type: z.enum(['discount', 'alternative']), title: z.string(), description: z.string().nullable(), discountPercent: z.number().int().nullable(), couponCode: z.string().nullable(), amountMinor: z.number().finite().nullable(), currencyCode: z.string().nullable(), expiresAt: z.string().nullable(), status: z.enum(['pending', 'accepted', 'declined']) }).passthrough()
const autoCareServiceMessageSchema = z.object({ id: z.string().min(1), senderId: z.string().min(1), kind: z.enum(['text', 'system', 'offer']), body: z.string().nullable(), offer: autoCareServiceMessageOfferSchema.nullable(), deliveredAt: z.string().nullable(), readAt: z.string().nullable(), createdAt: z.string() }).passthrough()
const autoCareServiceAttachmentSchema = z.object({ id: z.string().min(1), uploadedById: z.string().min(1), contentType: z.string(), bytes: z.number().int().positive(), status: z.enum(['pending', 'ready', 'rejected']), url: z.string(), createdAt: z.string() }).passthrough()
const autoCareServiceConversationSchema = z.object({ request: autoCareServiceRequestSchema, messages: z.array(autoCareServiceMessageSchema), attachments: z.array(autoCareServiceAttachmentSchema), nextCursor: z.string().nullable().default(null) }).passthrough()
const autoCareChatConversationSchema = z.object({ thread: autoCareChatThreadSchema, messages: z.array(autoCareServiceMessageSchema), attachments: z.array(autoCareServiceAttachmentSchema), nextCursor: z.string().nullable().default(null) }).passthrough()
const autoCareChatReportSchema = z.object({ id: z.string(), threadId: z.string(), reporterId: z.string(), reportedUserId: z.string().nullable(), category: z.enum(['spam', 'harassment', 'fraud', 'unsafe', 'other']), description: z.string().nullable(), status: z.enum(['pending', 'resolved', 'dismissed']), reviewedById: z.string().nullable(), resolutionReason: z.string().nullable(), createdAt: z.string(), reviewedAt: z.string().nullable() }).passthrough()
const autoCareChatReportsSchema = z.array(autoCareChatReportSchema)
const autoCareChatBlockSchema = z.object({ id: z.string(), threadId: z.string(), blockerId: z.string(), blockedUserId: z.string(), status: z.enum(['active', 'revoked']), reason: z.string().nullable(), createdAt: z.string(), revokedAt: z.string().nullable() }).passthrough()
const autoCarePriceBenchmarkSchema = z.object({ serviceDefinitionId: z.string(), serviceSlug: z.string(), marketId: z.string().nullable(), makeId: z.string().nullable(), modelId: z.string().nullable(), minPriceMinor: z.number().finite(), medianPriceMinor: z.number().finite(), maxPriceMinor: z.number().finite(), currencyCode: z.string(), methodology: z.record(z.string(), z.unknown()), source: z.string(), generatedAt: z.string() }).passthrough()
const autoCareTrustEvidenceSchema = z.object({ id: z.string(), providerId: z.string(), kind: z.string(), label: z.string(), status: z.string(), expiresAt: z.string().nullable(), verifiedAt: z.string().nullable() }).passthrough()
const autoCareTrustSnapshotSchema = z.object({
    id: z.string(), providerId: z.string(), locationId: z.string(), policyVersion: z.string(),
    score: z.number().finite(), badge: z.string().nullable(), computedAt: z.string(), validUntil: z.string(),
    inputCounters: z.record(z.string(), z.number().finite()), reasonCodes: z.array(z.string()),
}).passthrough()
const autoCareTrustSchema = z.object({
    providerId: z.string(),
    score: z.number().finite(),
    badge: z.string().nullable(),
    reassessedAt: z.string().nullable(),
    evidence: z.array(autoCareTrustEvidenceSchema),
    snapshots: z.array(autoCareTrustSnapshotSchema).default([]),
    factors: z.object({
        profile: z.number().finite(),
        reviews: z.number().finite(),
        evidence: z.number().finite(),
        reliability: z.number().finite(),
        claimsPenalty: z.number().finite(),
    }).optional(),
}).passthrough()
const adminProviderSchema = autoCareProviderSchema.extend({ ownerName: z.string().nullable(), trustScore: z.number().finite() }).passthrough()
const platformOverviewSchema = z.object({ markets: z.array(z.object({ id: z.string(), countryCode: z.string(), countryName: z.string(), cityCode: z.string(), cityName: z.string(), currencyCode: z.string(), launchReady: z.boolean(), supportedLocales: z.array(z.string()) }).passthrough()), providers: z.object({ total: z.number().int().nonnegative(), active: z.number().int().nonnegative(), draft: z.number().int().nonnegative(), suspended: z.number().int().nonnegative(), verified: z.number().int().nonnegative() }).passthrough(), users: z.object({ clients: z.number().int().nonnegative(), owners: z.number().int().nonnegative(), admins: z.number().int().nonnegative(), superAdmins: z.number().int().nonnegative() }).passthrough(), billing: z.object({ phase: z.literal('launch'), subscriptionsEnabled: z.boolean(), promoCodesEnabled: z.boolean() }).passthrough() }).passthrough()
const autoCareQualityMonitoringSchema = z.object({ generatedAt: z.string(), providers: z.object({ total: z.number().int().nonnegative(), active: z.number().int().nonnegative(), verified: z.number().int().nonnegative(), trusted: z.number().int().nonnegative(), suspended: z.number().int().nonnegative() }), reviews: z.object({ approved: z.number().int().nonnegative(), pending: z.number().int().nonnegative(), rejected: z.number().int().nonnegative(), anomalyCandidates: z.number().int().nonnegative() }), requests: z.object({ total: z.number().int().nonnegative(), completed: z.number().int().nonnegative(), cancelled: z.number().int().nonnegative(), noShows: z.number().int().nonnegative() }), ranking: z.object({ trustSnapshots: z.number().int().nonnegative(), reassessedProviders: z.number().int().nonnegative(), evidenceCoveragePercent: z.number().nonnegative() }), catalog: z.object({ activeDefinitions: z.number().int().nonnegative(), activeOffers: z.number().int().nonnegative(), providersWithOffers: z.number().int().nonnegative(), offerCoveragePercent: z.number().nonnegative(), offersWithDescription: z.number().int().nonnegative(), offersWithPrice: z.number().int().nonnegative(), priceCoveragePercent: z.number().nonnegative() }), supply: z.object({ activeMarkets: z.number().int().nonnegative(), averageLocationsPerProvider: z.number().nonnegative(), markets: z.array(z.object({ marketId: z.string(), providers: z.number().int().nonnegative(), locations: z.number().int().nonnegative(), activeOffers: z.number().int().nonnegative() })) }), reliability: z.object({ responseSamples: z.number().int().nonnegative(), averageResponseMinutes: z.number().nullable(), p95ResponseMinutes: z.number().nullable(), confirmedBookings: z.number().int().nonnegative(), confirmationSamples: z.number().int().nonnegative(), confirmationReliabilityPercent: z.number().nonnegative(), bookingConflicts: z.number().int().nonnegative() }), appeals: z.object({ available: z.literal(true), pending: z.number().int().nonnegative() }) })
const autoCareAppealSchema = z.object({ id: z.string(), subject: z.enum(['provider', 'review', 'suspension', 'catalog']), subjectId: z.string(), submittedById: z.string(), providerId: z.string().nullable(), reason: z.string(), evidenceIds: z.array(z.string()), status: z.enum(['pending', 'accepted', 'rejected', 'withdrawn']), decidedById: z.string().nullable(), decisionReason: z.string().nullable(), createdAt: z.string(), decidedAt: z.string().nullable() }).passthrough()
const autoCareAppealsSchema = z.array(autoCareAppealSchema)
const uploadResponseSchema = z.object({ url: z.string().min(1) }).passthrough()
const autoCareRepairEventsSchema = z.array(z.object({ id: z.string(), requestId: z.string(), eventType: z.string(), actorId: z.string().nullable(), title: z.string(), notes: z.string().nullable(), metadata: z.record(z.string(), z.unknown()), createdAt: z.string() }).passthrough())
const autoCareBroadcastOfferSchema = z.object({ id: z.string(), broadcastRequestId: z.string(), providerId: z.string(), providerName: z.string(), locationId: z.string(), address: z.string(), offerSnapshot: z.record(z.string(), z.unknown()), status: z.string(), createdAt: z.string() }).passthrough()
const autoCareBroadcastSchema = z.object({ id: z.string(), serviceDefinitionId: z.string(), serviceSlug: z.string(), marketId: z.string().nullable(), issueDescription: z.string(), vehicleSnapshot: autoCareScalarRecordSchema.nullable(), preferredAt: z.string().nullable(), status: z.string(), maxProviders: z.number().int().positive(), expiresAt: z.string(), createdAt: z.string(), offers: z.array(autoCareBroadcastOfferSchema) }).passthrough()
const autoCareBroadcastsSchema = z.array(autoCareBroadcastSchema)
const autoCareGuaranteeClaimSchema = z.object({ id: z.string(), requestId: z.string(), claimType: z.string(), status: z.string(), summary: z.string(), evidenceUrls: z.array(z.string()), resolution: z.string().nullable(), createdAt: z.string(), updatedAt: z.string() }).passthrough()
const autoCareGuaranteeClaimsSchema = z.array(autoCareGuaranteeClaimSchema)
const autoCareExpertQuestionSchema = z.object({ id: z.string(), symptoms: z.string(), categorySlug: z.string().nullable(), vehicleSnapshot: z.record(z.string(), z.unknown()).nullable(), status: z.string(), answer: z.string().nullable(), createdAt: z.string(), answeredAt: z.string().nullable() }).passthrough()
const autoCareExpertQuestionsSchema = z.array(autoCareExpertQuestionSchema)
const autoCareFleetVehicleSchema = z.object({ id: z.string(), fleetId: z.string(), label: z.string(), vehicleSnapshot: z.record(z.string(), z.unknown()), approvalPolicy: z.string().nullable(), createdAt: z.string() }).passthrough()
const autoCareFleetSchema = z.object({ id: z.string(), name: z.string(), notes: z.string().nullable(), vehicles: z.array(autoCareFleetVehicleSchema), createdAt: z.string(), updatedAt: z.string() }).passthrough()
const autoCareFleetsSchema = z.array(autoCareFleetSchema)
const updatedCountSchema = z.object({ updated: z.number().int().nonnegative() }).passthrough()

export type AutoCareAvailability = { date: string; timezone?: string; durationMinutes: number; slots: Array<{ startTime: string; endTime: string }> }

export type AutoCareServiceRequest = {
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
    vehicleSnapshot: Record<string, string | number | null> | null
    contactSnapshot: Record<string, string | number | null> | null
    note: string | null
    status: 'draft' | 'open' | 'awaiting_reply' | 'estimate_shared' | 'accepted' | 'declined' | 'cancelled' | 'no_show' | 'closed'
    clientConfirmedAt: string | null
    providerConfirmedAt: string | null
    cancelledAt?: string | null
    cancelledById?: string | null
    cancellationReason?: string | null
    noShowAt?: string | null
    noShowById?: string | null
    noShowReason?: string | null
    completedAt?: string | null
    completedById?: string | null
    completionNote?: string | null
    acceptedQuoteVersion?: number | null
    acceptedQuoteSnapshot?: Record<string, unknown> | null
    acceptedQuoteAt?: string | null
    booking?: AutoCareBookingSnapshot | null
    reschedule: AutoCareReschedule | null
    createdAt: string
    updatedAt: string
    quote: AutoCareServiceQuote | null
    quoteHistory: Array<AutoCareServiceQuote & { id: string; version: number }>
}

export type AutoCareBookingSnapshot = {
    requestId: string
    quoteVersion: number
    amountMinor: number
    currencyCode: string
    lineItems: AutoCareQuoteLineItem[]
    scheduledAt: string
    timezone: string
    serviceSlug: string
    providerId: string
    locationId: string
    status: 'confirmed'
    createdAt: string
}

export type AutoCareReschedule = { id: string; proposedAt: string; requestedById: string; status: 'pending' | 'accepted' | 'rejected'; reason: string | null; resolvedById: string | null; resolutionReason: string | null; createdAt: string; resolvedAt: string | null }

export type AutoCareQuoteLineItem = { kind: 'part' | 'labour' | 'consumable' | 'tax' | 'fee' | 'discount'; title: string; quantity: number; unitPriceMinor: number; totalMinor: number }
export type AutoCareServiceQuote = { amountMinor: number; currencyCode: string; note: string | null; createdAt: string; lineItems?: AutoCareQuoteLineItem[]; subtotalMinor?: number; taxMinor?: number; feesMinor?: number; validUntil?: string | null; priceLocked?: boolean }
export type AutoCareServiceMessageOffer = { type: 'discount' | 'alternative'; title: string; description: string | null; discountPercent: number | null; couponCode: string | null; amountMinor: number | null; currencyCode: string | null; expiresAt: string | null; status: 'pending' | 'accepted' | 'declined' }
export type AutoCareServiceMessage = { id: string; senderId: string; kind: 'text' | 'system' | 'offer'; body: string | null; offer: AutoCareServiceMessageOffer | null; deliveredAt: string | null; readAt: string | null; createdAt: string }
export type AutoCareServiceAttachment = { id: string; uploadedById: string; contentType: string; bytes: number; status: 'pending' | 'ready' | 'rejected'; url: string; createdAt: string }
export type AutoCareServiceConversation = { request: AutoCareServiceRequest; messages: AutoCareServiceMessage[]; attachments: AutoCareServiceAttachment[]; nextCursor: string | null }
export type AutoCareChatThreadType = 'service_request' | 'provider_inquiry' | 'support' | 'admin_escalation'
export type AutoCareChatThread = { id: string; type: AutoCareChatThreadType; status: 'open' | 'closed'; subject: string; requestId: string | null; providerId: string | null; providerName: string | null; clientId: string | null; lastMessageAt: string | null; unreadCount: number; createdAt: string; updatedAt: string }
export type AutoCareChatConversation = { thread: AutoCareChatThread; messages: AutoCareServiceMessage[]; attachments: AutoCareServiceAttachment[]; nextCursor: string | null }
export type AutoCareChatReport = { id: string; threadId: string; reporterId: string; reportedUserId: string | null; category: 'spam' | 'harassment' | 'fraud' | 'unsafe' | 'other'; description: string | null; status: 'pending' | 'resolved' | 'dismissed'; reviewedById: string | null; resolutionReason: string | null; createdAt: string; reviewedAt: string | null }
export type AutoCareChatBlock = { id: string; threadId: string; blockerId: string; blockedUserId: string; status: 'active' | 'revoked'; reason: string | null; createdAt: string; revokedAt: string | null }
export type CreateAutoCareChatReportInput = { chatId: string; category: AutoCareChatReport['category']; description?: string | null }
export type CreateAutoCareChatBlockInput = { chatId: string; blockedUserId?: string; reason?: string | null }
export type RevokeAutoCareChatBlockInput = { chatId: string; blockId: string }
export type DecideAutoCareChatReportInput = { id: string; status: 'resolved' | 'dismissed'; reason?: string | null; blockUser?: boolean }
export type CreateAutoCareChatInput = { type: Exclude<AutoCareChatThreadType, 'service_request'>; providerId?: string; requestId?: string; subject: string }
export type CreateAutoCareChatMessageInput = { chatId: string; body: string }
export type CreateAutoCareChatAttachmentInput = { chatId: string; fileName: string; contentType: 'image/jpeg' | 'image/png' | 'image/webp'; size: number; contentBase64: string }
export type CreateAutoCareServiceMessageInput = { requestId: string; body: string; idempotencyKey?: string }
export type GetAutoCareServiceConversationInput = { requestId: string; cursor?: string; limit?: number }
export type CreateAutoCareServiceOfferInput = { requestId: string; type: 'discount' | 'alternative'; title: string; description?: string | null; discountPercent?: number | null; couponCode?: string | null; amountMinor?: number | null; currencyCode?: string | null; expiresAt?: string | null }
export type DecideAutoCareServiceOfferInput = { requestId: string; messageId: string; decision: 'accept' | 'decline' }
export type CreateAutoCareServiceAttachmentInput = { requestId: string; fileName: string; contentType: 'image/jpeg' | 'image/png' | 'image/webp'; size: number; contentBase64: string }
export type CreateAutoCareServiceQuoteInput = { requestId: string; amountMinor: number; currencyCode: string; note?: string | null; lineItems?: Array<Omit<AutoCareQuoteLineItem, 'totalMinor'>>; taxMinor?: number; feesMinor?: number; validUntil?: string | null; priceLocked?: boolean }
export type CompleteAutoCareServiceRequestInput = { requestId: string; note?: string | null }

export type AutoCarePriceBenchmark = { serviceDefinitionId: string; serviceSlug: string; marketId: string | null; makeId: string | null; modelId: string | null; minPriceMinor: number; medianPriceMinor: number; maxPriceMinor: number; currencyCode: string; methodology: Record<string, unknown>; source: string; generatedAt: string }
export type AutoCareRepairEvent = { id: string; requestId: string; eventType: string; actorId: string | null; title: string; notes: string | null; metadata: Record<string, unknown>; createdAt: string }
export type AutoCareBroadcastOffer = { id: string; broadcastRequestId: string; providerId: string; providerName: string; locationId: string; address: string; offerSnapshot: Record<string, unknown>; status: string; createdAt: string }
export type AutoCareBroadcastRequest = { id: string; serviceDefinitionId: string; serviceSlug: string; marketId: string | null; issueDescription: string; vehicleSnapshot: Record<string, string | number | null> | null; preferredAt: string | null; status: string; maxProviders: number; expiresAt: string; createdAt: string; offers: AutoCareBroadcastOffer[] }
export type CreateAutoCareBroadcastRequestInput = { serviceDefinitionId: string; marketId?: string | null; issueDescription: string; vehicleSnapshot?: Record<string, string | number | null> | null; photoUrls?: string[]; preferredAt?: string | null; maxProviders?: number }
export type CreateAutoCareBroadcastOfferInput = { broadcastId: string; locationId: string; amountMinor: number; currencyCode: string; note?: string | null; durationMinutes?: number; validUntil?: string | null }
export type AutoCareTrustEvidence = { id: string; providerId: string; kind: string; label: string; status: string; expiresAt: string | null; verifiedAt: string | null }
export type AutoCareTrustSnapshot = { id: string; providerId: string; locationId: string; policyVersion: string; score: number; badge: string | null; computedAt: string; validUntil: string; inputCounters: Record<string, number>; reasonCodes: string[] }
export type AutoCareTrustResponse = {
    providerId: string
    score: number
    badge: string | null
    reassessedAt: string | null
    evidence: AutoCareTrustEvidence[]
    snapshots: AutoCareTrustSnapshot[]
    explanation?: string
    factors?: { profile: number; reviews: number; evidence: number; reliability: number; claimsPenalty: number }
}
export type AutoCareGuaranteeClaim = { id: string; requestId: string; claimType: string; status: string; summary: string; evidenceUrls: string[]; resolution: string | null; createdAt: string; updatedAt: string }
export type CreateAutoCareGuaranteeClaimInput = { requestId: string; claimType: string; summary: string; evidenceUrls?: string[] }
export type AutoCareExpertQuestion = { id: string; symptoms: string; categorySlug: string | null; vehicleSnapshot: Record<string, unknown> | null; status: string; answer: string | null; createdAt: string; answeredAt: string | null }
export type CreateAutoCareExpertQuestionInput = { symptoms: string; categorySlug?: string | null; vehicleSnapshot?: Record<string, string | number | null> | null }
export type AutoCareFleetVehicle = { id: string; fleetId: string; label: string; vehicleSnapshot: Record<string, unknown>; approvalPolicy: string | null; createdAt: string }
export type AutoCareFleet = { id: string; name: string; notes: string | null; vehicles: AutoCareFleetVehicle[]; createdAt: string; updatedAt: string }
export type CreateAutoCareFleetInput = { name: string; notes?: string | null }
export type CreateAutoCareFleetVehicleInput = { fleetId: string; label: string; vehicleSnapshot: Record<string, unknown>; approvalPolicy?: string | null }

export type CreateAutoCareServiceRequestInput = {
    providerId: string
    locationId: string
    offeringId: string
    preferredAt: string
    vehicleSnapshot?: {
        make: string
        model: string
        year: number
        mileage?: number
    } | null
    contactSnapshot: {
        name: string
        email: string
        phone: string
    }
    note?: string | null
    idempotencyKey?: string
}

export type CreateOwnerAutoCareProviderInput = {
    name: string
    description?: string
    marketId: string
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

export const autoCareApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        getAutoCareMarkets: build.query<AutoCareApiMarket[], void>({
            query: () => '/v1/markets',
            transformResponse: (value: unknown) => autoCareMarketsSchema.parse(value),
            providesTags: [{ type: 'AutoCareMarket', id: 'LIST' }],
        }),
        updateSuperAdminAutoCareMarket: build.mutation<AutoCareApiMarket, UpdateSuperAdminAutoCareMarketInput>({
            query: ({ id, ...body }) => ({ url: `/super-admin/markets/${encodeURIComponent(id)}`, method: 'PATCH', body }),
            transformResponse: (value: unknown) => autoCareMarketsSchema.element.parse(value),
            invalidatesTags: [{ type: 'AutoCareMarket', id: 'LIST' }],
        }),
        getAutoCareLocationZones: build.query<AutoCareApiLocationZone[], { marketId: string; parentId?: string; limit?: number }>({
            query: ({ marketId, ...params }) => ({ url: `/v1/markets/${encodeURIComponent(marketId)}/zones`, params }),
            transformResponse: (value: unknown) => autoCareLocationZonesSchema.parse(value),
            providesTags: (_result, _error, { marketId }) => [{ type: 'AutoCareMarket', id: `ZONES_${marketId}` }],
        }),
        getAutoCareServiceDefinitions: build.query<AutoCareApiServiceDefinition[], void>({
            query: () => '/v1/service-definitions',
            transformResponse: (value: unknown) => z.array(z.object({ id: z.string(), slug: z.string(), categorySlug: z.string(), labels: z.record(z.string(), z.string()), priceType: z.enum(['fixed', 'from', 'range', 'quote_required']), comparisonAttributes: z.array(z.string()), active: z.boolean() }).passthrough()).parse(value),
            providesTags: [{ type: 'AutoCareServiceDefinition', id: 'LIST' }],
        }),
        createAutoCareCatalogGapRequest: build.mutation<AutoCareCatalogGapRequest, CreateAutoCareCatalogGapRequestInput>({
            query: (body) => ({ url: '/v1/catalog-gap-requests', method: 'POST', body }),
            transformResponse: (value: unknown) => autoCareCatalogGapRequestSchema.parse(value),
            invalidatesTags: [{ type: 'AutoCareServiceDefinition', id: 'LIST' }],
        }),
        getAdminCatalogGapRequests: build.query<AutoCareCatalogGapRequest[], { status?: AutoCareCatalogGapRequest['status'] } | void>({
            query: (params) => ({ url: '/admin/catalog-gap-requests', params: params ?? undefined }),
            transformResponse: (value: unknown) => z.array(autoCareCatalogGapRequestSchema).parse(value),
            providesTags: [{ type: 'AutoCareServiceDefinition', id: 'GAP_QUEUE' }],
        }),
        decideAdminCatalogGapRequest: build.mutation<AutoCareCatalogGapRequest, DecideAutoCareCatalogGapRequestInput>({
            query: ({ id, ...body }) => ({ url: `/admin/catalog-gap-requests/${encodeURIComponent(id)}/decision`, method: 'PATCH', body }),
            transformResponse: (value: unknown) => autoCareCatalogGapRequestSchema.parse(value),
            invalidatesTags: [{ type: 'AutoCareServiceDefinition', id: 'GAP_QUEUE' }, { type: 'AutoCareServiceDefinition', id: 'LIST' }],
        }),
        getAdminAutoCareChatReports: build.query<AutoCareChatReport[], { status?: AutoCareChatReport['status'] } | void>({
            query: (params) => ({ url: '/admin/chat-reports', params: params ?? undefined }),
            transformResponse: (value: unknown) => autoCareChatReportsSchema.parse(value),
            providesTags: [{ type: 'AutoCareServiceRequest', id: 'CHAT_REPORTS' }],
        }),
        decideAdminAutoCareChatReport: build.mutation<AutoCareChatReport, DecideAutoCareChatReportInput>({
            query: ({ id, ...body }) => ({ url: `/admin/chat-reports/${encodeURIComponent(id)}/decision`, method: 'PATCH', body }),
            transformResponse: (value: unknown) => autoCareChatReportSchema.parse(value),
            invalidatesTags: [{ type: 'AutoCareServiceRequest', id: 'CHAT_REPORTS' }],
        }),
        getVehicleCatalog: build.query<AutoCareVehicleBrand[], string | void>({
            query: (brandId) => ({ url: '/v1/vehicle-catalog', params: brandId ? { brandId } : undefined }),
            transformResponse: (value: unknown) => z.array(z.object({ id: z.string(), labels: z.record(z.string(), z.string()), models: z.array(z.object({ id: z.string(), label: z.string(), yearsFrom: z.number().int(), yearsTo: z.number().int(), engines: z.array(z.object({ id: z.string(), fuelType: z.enum(['petrol', 'diesel', 'hybrid', 'electric', 'lpg', 'hydrogen', 'other']), displacementL: z.number().finite().nullable(), horsepower: z.number().finite().nullable() }).passthrough()) }).passthrough()) }).passthrough()).parse(value),
            providesTags: [{ type: 'AutoCareVehicleCatalog', id: 'LIST' }],
        }),
        getFeaturedAutoCareReviews: build.query<AutoCareApiReview[], number | void>({
            query: (limit = 6) => ({ url: '/v1/reviews/featured', params: { limit } }),
            transformResponse: (value: unknown) => z.array(featuredReviewSchema).parse(value),
            providesTags: [{ type: 'AutoCareReview', id: 'FEATURED' }],
        }),
        getAutoCareDiscovery: build.query<AutoCareApiDiscoveryResponse, AutoCareDiscoveryQuery | void>({
            query: (params) => ({ url: '/v1/discovery/providers', params: params ?? undefined }),
            transformResponse: (value: unknown) => autoCareDiscoverySchema.parse(value),
            providesTags: (result) => result
                ? [
                    ...result.items.map((item) => ({ type: 'AutoCareProvider' as const, id: item.provider.id })),
                    { type: 'AutoCareProvider' as const, id: 'LIST' },
                ]
                : [{ type: 'AutoCareProvider' as const, id: 'LIST' }],
        }),
        getAutoCareProviderProfile: build.query<AutoCareApiProviderProfile, string>({
            query: (providerId) => `/v1/providers/${encodeURIComponent(providerId)}`,
            transformResponse: (value: unknown) => autoCareProviderProfileSchema.parse(value),
            providesTags: (_result, _error, providerId) => [{ type: 'AutoCareProvider', id: providerId }],
        }),
        getAutoCareProviderReviews: build.query<AutoCareApiProviderReviews, { providerId: string; limit?: number }>({
            query: ({ providerId, limit = 20 }) => ({ url: `/v1/providers/${encodeURIComponent(providerId)}/reviews`, params: { limit } }),
            transformResponse: (value: unknown) => ownerProviderReviewsSchema.parse(value),
            providesTags: (_result, _error, { providerId }) => [{ type: 'AutoCareReview', id: `PUBLIC_${providerId}` }],
        }),
        getAutoCareFavorites: build.query<AutoCareFavorite[], void>({
            query: () => '/v1/favorites/providers',
            transformResponse: (value: unknown) => autoCareFavoritesSchema.parse(value),
            providesTags: [{ type: 'AutoCareMarketplace', id: 'FAVORITES' }],
        }),
        addAutoCareFavorite: build.mutation<AutoCareFavorite, { providerId: string; locationId?: string }>({
            query: ({ providerId, ...body }) => ({ url: `/v1/favorites/providers/${encodeURIComponent(providerId)}`, method: 'POST', body }),
            transformResponse: (value: unknown) => autoCareFavoriteSchema.parse(value),
            invalidatesTags: [{ type: 'AutoCareMarketplace', id: 'FAVORITES' }],
        }),
        removeAutoCareFavorite: build.mutation<{ success: true }, string>({
            query: (providerId) => ({ url: `/v1/favorites/providers/${encodeURIComponent(providerId)}`, method: 'DELETE' }),
            transformResponse: (value: unknown) => z.object({ success: z.literal(true) }).parse(value),
            invalidatesTags: [{ type: 'AutoCareMarketplace', id: 'FAVORITES' }],
        }),
        syncAutoCareFavorites: build.mutation<AutoCareFavorite[], { providerIds: string[] }>({
            query: (body) => ({ url: '/v1/favorites/providers/sync', method: 'POST', body }),
            transformResponse: (value: unknown) => autoCareFavoritesSchema.parse(value),
            invalidatesTags: [{ type: 'AutoCareMarketplace', id: 'FAVORITES' }],
        }),
        getAutoCareAvailability: build.query<AutoCareAvailability, { providerId: string; locationId: string; offeringId: string; date: string }>({
            query: ({ providerId, ...params }) => ({ url: `/v1/providers/${encodeURIComponent(providerId)}/availability`, params }),
            transformResponse: (value: unknown) => autoCareAvailabilitySchema.parse(value),
        }),
        getAutoCareFairPrice: build.query<AutoCarePriceBenchmark | null, { serviceId: string; marketId?: string; makeId?: string; modelId?: string; fuelType?: string; engineLiters?: number }>({
            query: (params) => ({ url: '/v1/fair-price', params }),
            transformResponse: (value: unknown) => value === null ? null : autoCarePriceBenchmarkSchema.parse(value),
            providesTags: [{ type: 'AutoCareMarketplace', id: 'PRICE' }],
        }),
        getAutoCareProviderTrust: build.query<AutoCareTrustResponse, string>({
            query: (providerId) => `/v1/providers/${encodeURIComponent(providerId)}/trust`,
            transformResponse: (value: unknown) => autoCareTrustSchema.parse(value),
            providesTags: (_result, _error, providerId) => [{ type: 'AutoCareMarketplace', id: `TRUST_${providerId}` }],
        }),
        getOwnerAutoCareProviders: build.query<AutoCareApiProvider[], void>({
            query: () => '/owner/autocare-providers',
            transformResponse: (value: unknown) => z.array(autoCareProviderSchema).parse(value),
            providesTags: [{ type: 'AutoCareProvider', id: 'OWNER_LIST' }],
        }),
        getOwnerAutoCareProviderAnalytics: build.query<AutoCareProviderAnalytics, string>({
            query: (providerId) => `/owner/autocare-providers/${encodeURIComponent(providerId)}/analytics`,
            transformResponse: (value: unknown) => autoCareProviderAnalyticsSchema.parse(value),
            providesTags: (_result, _error, providerId) => [{ type: 'AutoCareProvider', id: `ANALYTICS_${providerId}` }],
        }),
        getOwnerAutoCareProviderMembers: build.query<AutoCareProviderMembersResponse, string>({
            query: (providerId) => `/owner/autocare-providers/${encodeURIComponent(providerId)}/members`,
            transformResponse: (value: unknown) => autoCareProviderMembersSchema.parse(value),
            providesTags: (_result, _error, providerId) => [{ type: 'AutoCareProvider', id: `MEMBERS_${providerId}` }],
        }),
        inviteAutoCareProviderMember: build.mutation<AutoCareProviderInvitation, CreateAutoCareProviderInvitationInput>({
            query: ({ providerId, ...body }) => ({ url: `/owner/autocare-providers/${encodeURIComponent(providerId)}/members/invitations`, method: 'POST', body }),
            transformResponse: (value: unknown) => autoCareProviderInvitationSchema.parse(value),
            invalidatesTags: (_result, _error, { providerId }) => [{ type: 'AutoCareProvider', id: `MEMBERS_${providerId}` }],
        }),
        revokeAutoCareProviderInvitation: build.mutation<AutoCareProviderInvitation, { providerId: string; invitationId: string }>({
            query: ({ providerId, invitationId }) => ({ url: `/owner/autocare-providers/${encodeURIComponent(providerId)}/members/invitations/${encodeURIComponent(invitationId)}`, method: 'DELETE' }),
            transformResponse: (value: unknown) => autoCareProviderInvitationSchema.parse(value),
            invalidatesTags: (_result, _error, { providerId }) => [{ type: 'AutoCareProvider', id: `MEMBERS_${providerId}` }],
        }),
        revokeAutoCareProviderMembership: build.mutation<AutoCareProviderMember, { providerId: string; membershipId: string }>({
            query: ({ providerId, membershipId }) => ({ url: `/owner/autocare-providers/${encodeURIComponent(providerId)}/members/${encodeURIComponent(membershipId)}`, method: 'DELETE' }),
            transformResponse: (value: unknown) => autoCareProviderMembersSchema.shape.memberships.element.parse(value),
            invalidatesTags: (_result, _error, { providerId }) => [{ type: 'AutoCareProvider', id: `MEMBERS_${providerId}` }],
        }),
        acceptAutoCareProviderInvitation: build.mutation<unknown, AcceptAutoCareProviderInvitationInput>({
            query: (body) => ({ url: '/owner/autocare-provider-invitations/accept', method: 'POST', body }),
            transformResponse: (value: unknown) => z.object({
                membership: z.object({ id: z.string(), providerId: z.string(), userId: z.string(), locationId: z.string().nullable(), role: z.enum(['owner', 'manager', 'staff']), status: z.enum(['active', 'revoked']) }).passthrough(),
                invitation: autoCareProviderInvitationSchema,
            }).parse(value),
            invalidatesTags: [{ type: 'AutoCareProvider', id: 'OWNER_LIST' }],
        }),
        getOwnerAutoCareProviderChangeRequests: build.query<AutoCareProviderChangeRequest[], string>({
            query: (providerId) => `/owner/autocare-providers/${encodeURIComponent(providerId)}/change-requests`,
            transformResponse: (value: unknown) => z.array(autoCareProviderChangeRequestSchema).parse(value),
            providesTags: (_result, _error, providerId) => [{ type: 'AutoCareProvider', id: `CHANGES_${providerId}` }],
        }),
        createOwnerAutoCareProviderChangeRequest: build.mutation<AutoCareProviderChangeRequest, CreateAutoCareProviderChangeRequestInput>({
            query: ({ providerId, ...body }) => ({ url: `/owner/autocare-providers/${encodeURIComponent(providerId)}/change-requests`, method: 'POST', body }),
            transformResponse: (value: unknown) => autoCareProviderChangeRequestSchema.parse(value),
            invalidatesTags: (_result, _error, { providerId }) => [{ type: 'AutoCareProvider', id: `CHANGES_${providerId}` }],
        }),
        cancelOwnerAutoCareProviderChangeRequest: build.mutation<AutoCareProviderChangeRequest, { providerId: string; requestId: string }>({
            query: ({ providerId, requestId }) => ({ url: `/owner/autocare-providers/${encodeURIComponent(providerId)}/change-requests/${encodeURIComponent(requestId)}`, method: 'DELETE' }),
            transformResponse: (value: unknown) => autoCareProviderChangeRequestSchema.parse(value),
            invalidatesTags: (_result, _error, { providerId }) => [{ type: 'AutoCareProvider', id: `CHANGES_${providerId}` }],
        }),
        getAdminAutoCareProviderChangeRequests: build.query<AutoCareProviderChangeRequest[], { status?: AutoCareProviderChangeRequest['status']; kind?: AutoCareProviderChangeRequest['kind'] } | void>({
            query: (params) => ({ url: '/admin/autocare-provider-change-requests', params: params ?? undefined }),
            transformResponse: (value: unknown) => z.array(autoCareProviderChangeRequestSchema).parse(value),
            providesTags: [{ type: 'AutoCareProvider', id: 'CHANGE_QUEUE' }],
        }),
        decideAdminAutoCareProviderChangeRequest: build.mutation<AutoCareProviderChangeRequest, DecideAutoCareProviderChangeRequestInput>({
            query: ({ id, ...body }) => ({ url: `/admin/autocare-provider-change-requests/${encodeURIComponent(id)}/decision`, method: 'PATCH', body }),
            transformResponse: (value: unknown) => autoCareProviderChangeRequestSchema.parse(value),
            invalidatesTags: [{ type: 'AutoCareProvider', id: 'CHANGE_QUEUE' }],
        }),
        getMyAutoCareBonusAccounts: build.query<AutoCareBonusAccount[], void>({
            query: () => '/v1/bonuses/my',
            transformResponse: (value: unknown) => autoCareBonusAccountsSchema.parse(value),
            providesTags: [{ type: 'AutoCareMarketplace', id: 'BONUSES_MY' }],
        }),
        redeemAutoCareBonus: build.mutation<AutoCareBonusAccount, RedeemAutoCareBonusInput>({
            query: (body) => ({ url: '/v1/bonuses/redeem', method: 'POST', body }),
            transformResponse: (value: unknown) => autoCareBonusAccountSchema.parse(value),
            invalidatesTags: [{ type: 'AutoCareMarketplace', id: 'BONUSES_MY' }],
        }),
        grantAutoCareBonus: build.mutation<AutoCareBonusAccount, GrantAutoCareBonusInput>({
            query: ({ providerId, clientId, ...body }) => ({ url: `/owner/autocare-providers/${encodeURIComponent(providerId)}/bonus-accounts/${encodeURIComponent(clientId)}/grants`, method: 'POST', body }),
            transformResponse: (value: unknown) => autoCareBonusAccountSchema.parse(value),
            invalidatesTags: (_result, _error, { providerId }) => [{ type: 'AutoCareProvider', id: `BONUS_${providerId}` }],
        }),
        getOwnerAutoCareBonusProgram: build.query<AutoCareBonusProgram | null, string>({
            query: (providerId) => `/owner/autocare-providers/${encodeURIComponent(providerId)}/bonus-program`,
            transformResponse: (value: unknown) => value === null ? null : autoCareBonusProgramSchema.parse(value),
            providesTags: (_result, _error, providerId) => [{ type: 'AutoCareProvider', id: `BONUS_${providerId}` }],
        }),
        upsertOwnerAutoCareBonusProgram: build.mutation<AutoCareBonusProgram, OwnerAutoCareBonusProgramInput>({
            query: ({ providerId, ...body }) => ({ url: `/owner/autocare-providers/${encodeURIComponent(providerId)}/bonus-program`, method: 'PUT', body }),
            transformResponse: (value: unknown) => autoCareBonusProgramSchema.parse(value),
            invalidatesTags: (_result, _error, { providerId }) => [{ type: 'AutoCareProvider', id: `BONUS_${providerId}` }, { type: 'AutoCareProvider', id: providerId }],
        }),
        updateOwnerAutoCareOffer: build.mutation<AutoCareApiOffer, UpdateAutoCareOfferInput>({
            query: ({ providerId, offerId, ...body }) => ({ url: `/owner/autocare-providers/${providerId}/offers/${offerId}`, method: 'PATCH', body }),
            transformResponse: (value: unknown) => autoCareOfferSchema.parse(value),
            invalidatesTags: (_result, _error, { providerId }) => [
                { type: 'AutoCareProvider', id: providerId },
                { type: 'AutoCareProvider', id: 'OWNER_LIST' },
                { type: 'AutoCareProvider', id: 'LIST' },
            ],
        }),
        getOwnerAutoCareProviderReviews: build.query<AutoCareApiProviderReviews, string>({
            query: (providerId) => `/owner/autocare-providers/${providerId}/reviews`,
            transformResponse: (value: unknown) => ownerProviderReviewsSchema.parse(value),
            providesTags: (_result, _error, providerId) => [{ type: 'AutoCareReview', id: `OWNER_${providerId}` }],
        }),
        getOwnerAutoCareReviews: build.query<OwnerAutoCareReviews, string | void>({
            query: (providerId) => ({ url: '/owner/autocare-reviews', params: providerId ? { providerId } : undefined }),
            transformResponse: (value: unknown) => ownerAutoCareReviewsSchema.parse(value),
            providesTags: [{ type: 'AutoCareReview', id: 'OWNER_ALL' }],
        }),
        issueOwnerAutoCareReviewPromo: build.mutation<AutoCareReviewPromo, IssueAutoCareReviewPromoInput>({
            query: ({ providerId, reviewId, ...body }) => ({ url: `/owner/autocare-providers/${providerId}/reviews/${reviewId}/promos`, method: 'POST', body }),
            transformResponse: (value: unknown) => reviewPromoSchema.parse(value),
            invalidatesTags: (_result, _error, { providerId }) => [{ type: 'AutoCareReview', id: `OWNER_${providerId}` }],
        }),
        getMyAutoCareReviews: build.query<AutoCareApiReview[], void>({
            query: () => '/v1/autocare-reviews/my',
            transformResponse: (value: unknown) => z.array(featuredReviewSchema).parse(value),
            providesTags: [{ type: 'AutoCareReview', id: 'CLIENT_LIST' }],
        }),
        getMyAutoCareAppeals: build.query<AutoCareAppeal[], void>({
            query: () => '/v1/autocare-appeals/my',
            transformResponse: (value: unknown) => autoCareAppealsSchema.parse(value),
            providesTags: [{ type: 'AutoCareReview', id: 'APPEALS' }],
        }),
        createAutoCareAppeal: build.mutation<AutoCareAppeal, CreateAutoCareAppealInput>({
            query: (body) => ({ url: '/v1/autocare-appeals', method: 'POST', body }),
            transformResponse: (value: unknown) => autoCareAppealSchema.parse(value),
            invalidatesTags: [{ type: 'AutoCareReview', id: 'APPEALS' }],
        }),
        createAutoCareReview: build.mutation<AutoCareApiReview, CreateAutoCareReviewInput>({
            query: (body) => ({ url: '/v1/autocare-reviews', method: 'POST', body }),
            transformResponse: (value: unknown) => featuredReviewSchema.parse(value),
            invalidatesTags: [{ type: 'AutoCareReview', id: 'CLIENT_LIST' }, { type: 'AutoCareReview', id: 'FEATURED' }],
        }),
        redeemAutoCareReviewPromo: build.mutation<AutoCareReviewPromo, RedeemAutoCareReviewPromoInput>({
            query: (body) => ({ url: '/v1/autocare-review-promos/redeem', method: 'POST', body }),
            transformResponse: (value: unknown) => reviewPromoSchema.parse(value),
            invalidatesTags: [{ type: 'AutoCareReview', id: 'CLIENT_LIST' }],
        }),
        updateAutoCareReview: build.mutation<AutoCareApiReview, UpdateAutoCareReviewInput>({
            query: ({ reviewId, ...body }) => ({ url: `/v1/autocare-reviews/${reviewId}`, method: 'PATCH', body }),
            transformResponse: (value: unknown) => featuredReviewSchema.parse(value),
            invalidatesTags: [{ type: 'AutoCareReview', id: 'CLIENT_LIST' }, { type: 'AutoCareReview', id: 'FEATURED' }],
        }),
        getAdminAutoCareProviders: build.query<AdminAutoCareProvider[], void>({
            query: () => '/admin/autocare-providers',
            transformResponse: (value: unknown) => z.array(adminProviderSchema).parse(value),
            providesTags: [{ type: 'AutoCareProvider', id: 'ADMIN_LIST' }],
        }),
        updateAdminAutoCareProviderStatus: build.mutation<AdminAutoCareProvider, { id: string; status: AutoCareApiProvider['status'] }>({
            query: ({ id, status }) => ({ url: `/admin/autocare-providers/${id}/status`, method: 'PATCH', body: { status } }),
            transformResponse: (value: unknown) => adminProviderSchema.parse(value),
            invalidatesTags: (_result, _error, { id }) => [{ type: 'AutoCareProvider', id }, { type: 'AutoCareProvider', id: 'ADMIN_LIST' }],
        }),
        getAdminAutoCareQualityMonitoring: build.query<AutoCareQualityMonitoring, void>({
            query: () => '/admin/autocare-quality-monitoring',
            transformResponse: (value: unknown) => autoCareQualityMonitoringSchema.parse(value),
            providesTags: [{ type: 'AutoCareProvider', id: 'QUALITY_MONITORING' }],
        }),
        getAdminAutoCareAppeals: build.query<AutoCareAppeal[], { status?: AutoCareAppeal['status']; subject?: AutoCareAppeal['subject'] } | void>({
            query: (params) => ({ url: '/admin/autocare-appeals', params: params ?? undefined }),
            transformResponse: (value: unknown) => autoCareAppealsSchema.parse(value),
            providesTags: [{ type: 'AutoCareReview', id: 'ADMIN_APPEALS' }],
        }),
        decideAdminAutoCareAppeal: build.mutation<AutoCareAppeal, { id: string; status: 'accepted' | 'rejected'; reason: string }>({
            query: ({ id, ...body }) => ({ url: `/admin/autocare-appeals/${encodeURIComponent(id)}/decision`, method: 'PATCH', body }),
            transformResponse: (value: unknown) => autoCareAppealSchema.parse(value),
            invalidatesTags: [{ type: 'AutoCareReview', id: 'ADMIN_APPEALS' }, { type: 'AutoCareProvider', id: 'QUALITY_MONITORING' }],
        }),
        getSuperAdminPlatformOverview: build.query<SuperAdminPlatformOverview, void>({
            query: () => '/super-admin/platform-overview',
            transformResponse: (value: unknown) => platformOverviewSchema.parse(value),
            providesTags: [{ type: 'AutoCareProvider', id: 'PLATFORM_OVERVIEW' }],
        }),
        uploadOwnerAutoCareProviderLogo: build.mutation<{ url: string }, { fileName: string; mimeType: string; size: number; contentBase64: string }>({
            query: (body) => ({ url: '/owner/autocare-providers/logo', method: 'POST', body }),
            transformResponse: (value: unknown) => uploadResponseSchema.parse(value),
        }),
        uploadOwnerAutoCareProviderMedia: build.mutation<{ url: string }, UploadOwnerAutoCareProviderMediaInput>({
            query: (body) => ({ url: '/owner/autocare-providers/media', method: 'POST', body }),
            transformResponse: (value: unknown) => uploadResponseSchema.parse(value),
        }),
        createOwnerAutoCareProvider: build.mutation<AutoCareApiProvider, CreateOwnerAutoCareProviderInput>({
            query: (body) => ({
                url: '/owner/autocare-providers',
                method: 'POST',
                body,
            }),
            transformResponse: (value: unknown) => autoCareProviderSchema.parse(value),
            invalidatesTags: [
                { type: 'AutoCareProvider', id: 'OWNER_LIST' },
                { type: 'AutoCareProvider', id: 'LIST' },
            ],
        }),
        createAutoCareServiceRequest: build.mutation<AutoCareServiceRequest, CreateAutoCareServiceRequestInput>({
            query: ({ idempotencyKey, ...body }) => ({
                url: '/v1/service-requests',
                method: 'POST',
                headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
                body,
            }),
            transformResponse: (value: unknown) => autoCareServiceRequestSchema.parse(value),
            invalidatesTags: [{ type: 'AutoCareServiceRequest', id: 'LIST' }],
        }),
        getMyAutoCareServiceRequests: build.query<AutoCareServiceRequest[], void>({
            query: () => '/v1/service-requests/my',
            transformResponse: (value: unknown) => autoCareServiceRequestsSchema.parse(value),
            providesTags: (result) => result
                ? [...result.map((item) => ({ type: 'AutoCareServiceRequest' as const, id: item.id })), { type: 'AutoCareServiceRequest' as const, id: 'LIST' }]
                : [{ type: 'AutoCareServiceRequest', id: 'LIST' }],
        }),
        getAutoCareChats: build.query<AutoCareChatThread[], void>({
            query: () => '/v1/chats',
            transformResponse: (value: unknown) => autoCareChatThreadsSchema.parse(value),
            providesTags: [{ type: 'AutoCareServiceRequest', id: 'CHAT_LIST' }],
        }),
        createAutoCareChat: build.mutation<AutoCareChatThread, CreateAutoCareChatInput>({
            query: (body) => ({ url: '/v1/chats', method: 'POST', body }),
            transformResponse: (value: unknown) => autoCareChatThreadSchema.parse(value),
            invalidatesTags: [{ type: 'AutoCareServiceRequest', id: 'CHAT_LIST' }],
        }),
        getAutoCareChat: build.query<AutoCareChatConversation, string | { chatId: string; cursor?: string; limit?: number }>({
            query: (input) => {
                const chatId = typeof input === 'string' ? input : input.chatId
                const query = typeof input === 'string' ? '' : new URLSearchParams({ ...(input.cursor ? { cursor: input.cursor } : {}), ...(input.limit ? { limit: String(input.limit) } : {}) }).toString()
                return `/v1/chats/${chatId}${query ? `?${query}` : ''}`
            },
            transformResponse: (value: unknown) => autoCareChatConversationSchema.parse(value),
            providesTags: (_result, _error, input) => [{ type: 'AutoCareServiceRequest', id: `CHAT_${typeof input === 'string' ? input : input.chatId}` }],
        }),
        createAutoCareChatMessage: build.mutation<AutoCareServiceMessage, CreateAutoCareChatMessageInput>({
            query: ({ chatId, body }) => ({ url: `/v1/chats/${chatId}/messages`, method: 'POST', body: { body } }),
            transformResponse: (value: unknown) => autoCareServiceMessageSchema.parse(value),
            invalidatesTags: (_result, _error, { chatId }) => [{ type: 'AutoCareServiceRequest', id: `CHAT_${chatId}` }, { type: 'AutoCareServiceRequest', id: 'CHAT_LIST' }],
        }),
        createAutoCareChatReport: build.mutation<AutoCareChatReport, CreateAutoCareChatReportInput>({
            query: ({ chatId, ...body }) => ({ url: `/v1/chats/${chatId}/reports`, method: 'POST', body }),
            transformResponse: (value: unknown) => autoCareChatReportSchema.parse(value),
        }),
        createAutoCareChatBlock: build.mutation<AutoCareChatBlock, CreateAutoCareChatBlockInput>({
            query: ({ chatId, ...body }) => ({ url: `/v1/chats/${chatId}/blocks`, method: 'POST', body }),
            transformResponse: (value: unknown) => autoCareChatBlockSchema.parse(value),
            invalidatesTags: (_result, _error, { chatId }) => [{ type: 'AutoCareServiceRequest', id: `CHAT_${chatId}` }],
        }),
        revokeAutoCareChatBlock: build.mutation<AutoCareChatBlock, RevokeAutoCareChatBlockInput>({
            query: ({ chatId, blockId }) => ({ url: `/v1/chats/${chatId}/blocks/${blockId}`, method: 'DELETE' }),
            transformResponse: (value: unknown) => autoCareChatBlockSchema.parse(value),
            invalidatesTags: (_result, _error, { chatId }) => [{ type: 'AutoCareServiceRequest', id: `CHAT_${chatId}` }],
        }),
        markAutoCareChatRead: build.mutation<{ updated: number }, string>({
            query: (chatId) => ({ url: `/v1/chats/${chatId}/read`, method: 'POST' }),
            transformResponse: (value: unknown) => updatedCountSchema.parse(value),
            invalidatesTags: (_result, _error, chatId) => [{ type: 'AutoCareServiceRequest', id: `CHAT_${chatId}` }, { type: 'AutoCareServiceRequest', id: 'CHAT_LIST' }],
        }),
        createAutoCareChatAttachment: build.mutation<AutoCareServiceAttachment, CreateAutoCareChatAttachmentInput>({
            query: ({ chatId, ...body }) => ({ url: `/v1/chats/${chatId}/attachments`, method: 'POST', body }),
            transformResponse: (value: unknown) => autoCareServiceAttachmentSchema.parse(value),
            invalidatesTags: (_result, _error, { chatId }) => [{ type: 'AutoCareServiceRequest', id: `CHAT_${chatId}` }],
        }),
        getAutoCareServiceRequest: build.query<AutoCareServiceRequest, string>({
            query: (requestId) => `/v1/service-requests/${requestId}`,
            transformResponse: (value: unknown) => autoCareServiceRequestSchema.parse(value),
            providesTags: (_result, _error, requestId) => [{ type: 'AutoCareServiceRequest', id: requestId }],
        }),
        getAutoCareRepairTimeline: build.query<AutoCareRepairEvent[], string>({
            query: (requestId) => `/v1/service-requests/${requestId}/timeline`,
            transformResponse: (value: unknown) => autoCareRepairEventsSchema.parse(value),
            providesTags: (_result, _error, requestId) => [{ type: 'AutoCareMarketplace', id: `TIMELINE_${requestId}` }],
        }),
        createAutoCareBroadcastRequest: build.mutation<AutoCareBroadcastRequest, CreateAutoCareBroadcastRequestInput>({
            query: (body) => ({ url: '/v1/broadcast-requests', method: 'POST', body }),
            transformResponse: (value: unknown) => autoCareBroadcastSchema.parse(value),
            invalidatesTags: [{ type: 'AutoCareMarketplace', id: 'BROADCAST_LIST' }],
        }),
        getMyAutoCareBroadcastRequests: build.query<AutoCareBroadcastRequest[], void>({
            query: () => '/v1/broadcast-requests/my',
            transformResponse: (value: unknown) => autoCareBroadcastsSchema.parse(value),
            providesTags: [{ type: 'AutoCareMarketplace', id: 'BROADCAST_LIST' }],
        }),
        getAutoCareBroadcastRequest: build.query<AutoCareBroadcastRequest, string>({
            query: (broadcastId) => `/v1/broadcast-requests/${broadcastId}`,
            transformResponse: (value: unknown) => autoCareBroadcastSchema.parse(value),
            providesTags: (_result, _error, broadcastId) => [{ type: 'AutoCareMarketplace', id: `BROADCAST_${broadcastId}` }],
        }),
        getOwnerAutoCareBroadcastRequests: build.query<AutoCareBroadcastRequest[], void>({
            query: () => '/owner/broadcast-requests',
            transformResponse: (value: unknown) => autoCareBroadcastsSchema.parse(value),
            providesTags: [{ type: 'AutoCareMarketplace', id: 'OWNER_BROADCAST_LIST' }],
        }),
        createAutoCareBroadcastOffer: build.mutation<AutoCareBroadcastOffer, CreateAutoCareBroadcastOfferInput>({
            query: ({ broadcastId, ...body }) => ({ url: `/owner/broadcast-requests/${broadcastId}/offers`, method: 'POST', body }),
            transformResponse: (value: unknown) => autoCareBroadcastOfferSchema.parse(value),
            invalidatesTags: (_result, _error, { broadcastId }) => [{ type: 'AutoCareMarketplace', id: `BROADCAST_${broadcastId}` }],
        }),
        createAutoCareGuaranteeClaim: build.mutation<AutoCareGuaranteeClaim, CreateAutoCareGuaranteeClaimInput>({
            query: (body) => ({ url: '/v1/guarantee-claims', method: 'POST', body }),
            transformResponse: (value: unknown) => autoCareGuaranteeClaimSchema.parse(value),
            invalidatesTags: [{ type: 'AutoCareMarketplace', id: 'GUARANTEE_LIST' }],
        }),
        getMyAutoCareGuaranteeClaims: build.query<AutoCareGuaranteeClaim[], void>({
            query: () => '/v1/guarantee-claims/my',
            transformResponse: (value: unknown) => autoCareGuaranteeClaimsSchema.parse(value),
            providesTags: [{ type: 'AutoCareMarketplace', id: 'GUARANTEE_LIST' }],
        }),
        createAutoCareExpertQuestion: build.mutation<AutoCareExpertQuestion, CreateAutoCareExpertQuestionInput>({
            query: (body) => ({ url: '/v1/expert-questions', method: 'POST', body }),
            transformResponse: (value: unknown) => autoCareExpertQuestionSchema.parse(value),
            invalidatesTags: [{ type: 'AutoCareMarketplace', id: 'EXPERT_LIST' }],
        }),
        getMyAutoCareExpertQuestions: build.query<AutoCareExpertQuestion[], void>({
            query: () => '/v1/expert-questions/my',
            transformResponse: (value: unknown) => autoCareExpertQuestionsSchema.parse(value),
            providesTags: [{ type: 'AutoCareMarketplace', id: 'EXPERT_LIST' }],
        }),
        getMyAutoCareFleets: build.query<AutoCareFleet[], void>({
            query: () => '/owner/fleets',
            transformResponse: (value: unknown) => autoCareFleetsSchema.parse(value),
            providesTags: [{ type: 'AutoCareMarketplace', id: 'FLEET_LIST' }],
        }),
        createAutoCareFleet: build.mutation<AutoCareFleet, CreateAutoCareFleetInput>({
            query: (body) => ({ url: '/owner/fleets', method: 'POST', body }),
            transformResponse: (value: unknown) => autoCareFleetSchema.parse(value),
            invalidatesTags: [{ type: 'AutoCareMarketplace', id: 'FLEET_LIST' }],
        }),
        createAutoCareFleetVehicle: build.mutation<AutoCareFleetVehicle, CreateAutoCareFleetVehicleInput>({
            query: ({ fleetId, ...body }) => ({ url: `/owner/fleets/${fleetId}/vehicles`, method: 'POST', body }),
            transformResponse: (value: unknown) => autoCareFleetVehicleSchema.parse(value),
            invalidatesTags: [{ type: 'AutoCareMarketplace', id: 'FLEET_LIST' }],
        }),
        getAutoCareServiceConversation: build.query<AutoCareServiceConversation, string | GetAutoCareServiceConversationInput>({
            query: (input) => {
                const { requestId, cursor, limit } = typeof input === 'string' ? { requestId: input, cursor: undefined, limit: undefined } : input
                return { url: `/v1/service-requests/${requestId}/conversation`, params: { cursor, limit } }
            },
            transformResponse: (value: unknown) => autoCareServiceConversationSchema.parse(value),
            providesTags: (_result, _error, input) => [{ type: 'AutoCareServiceRequest', id: typeof input === 'string' ? input : input.requestId }],
        }),
        createAutoCareServiceMessage: build.mutation<AutoCareServiceMessage, CreateAutoCareServiceMessageInput>({
            query: ({ requestId, body, idempotencyKey }) => ({ url: `/v1/service-requests/${requestId}/messages`, method: 'POST', headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined, body: { body } }),
            transformResponse: (value: unknown) => autoCareServiceMessageSchema.parse(value),
            invalidatesTags: (_result, _error, { requestId }) => [{ type: 'AutoCareServiceRequest', id: requestId }],
        }),
        createAutoCareServiceOffer: build.mutation<AutoCareServiceMessage, CreateAutoCareServiceOfferInput>({
            query: ({ requestId, ...body }) => ({ url: `/owner/service-requests/${requestId}/offers`, method: 'POST', body }),
            transformResponse: (value: unknown) => autoCareServiceMessageSchema.parse(value),
            invalidatesTags: (_result, _error, { requestId }) => [{ type: 'AutoCareServiceRequest', id: requestId }],
        }),
        decideAutoCareServiceOffer: build.mutation<AutoCareServiceMessage, DecideAutoCareServiceOfferInput>({
            query: ({ requestId, messageId, decision }) => ({ url: `/v1/service-requests/${requestId}/offers/${messageId}/decision`, method: 'POST', body: { decision } }),
            transformResponse: (value: unknown) => autoCareServiceMessageSchema.parse(value),
            invalidatesTags: (_result, _error, { requestId }) => [{ type: 'AutoCareServiceRequest', id: requestId }],
        }),
        markAutoCareServiceConversationRead: build.mutation<{ updated: number }, string>({
            query: (requestId) => ({ url: `/v1/service-requests/${requestId}/read`, method: 'POST' }),
            transformResponse: (value: unknown) => updatedCountSchema.parse(value),
            invalidatesTags: (_result, _error, requestId) => [{ type: 'AutoCareServiceRequest', id: requestId }],
        }),
        createAutoCareServiceAttachment: build.mutation<AutoCareServiceAttachment, CreateAutoCareServiceAttachmentInput>({
            query: ({ requestId, ...body }) => ({ url: `/v1/service-requests/${requestId}/attachments`, method: 'POST', body }),
            transformResponse: (value: unknown) => autoCareServiceAttachmentSchema.parse(value),
            invalidatesTags: (_result, _error, { requestId }) => [{ type: 'AutoCareServiceRequest', id: requestId }],
        }),
        confirmAutoCareServiceRequest: build.mutation<AutoCareServiceRequest, string>({
            query: (requestId) => ({ url: `/v1/service-requests/${requestId}/confirm`, method: 'POST' }),
            transformResponse: (value: unknown) => autoCareServiceRequestSchema.parse(value),
            invalidatesTags: (_result, _error, requestId) => [{ type: 'AutoCareServiceRequest', id: requestId }, { type: 'AutoCareServiceRequest', id: 'LIST' }],
        }),
        cancelAutoCareServiceRequest: build.mutation<AutoCareServiceRequest, { requestId: string; reason?: string | null }>({
            query: ({ requestId, reason }) => ({ url: `/v1/service-requests/${requestId}/cancel`, method: 'POST', body: { reason: reason ?? null } }),
            transformResponse: (value: unknown) => autoCareServiceRequestSchema.parse(value),
            invalidatesTags: (_result, _error, { requestId }) => [{ type: 'AutoCareServiceRequest', id: requestId }, { type: 'AutoCareServiceRequest', id: 'LIST' }],
        }),
        decideAutoCareServiceReschedule: build.mutation<AutoCareServiceRequest, { requestId: string; decision: 'accept' | 'reject'; reason?: string | null }>({
            query: ({ requestId, decision, reason }) => ({ url: `/v1/service-requests/${requestId}/reschedule/decision`, method: 'POST', body: { decision, reason: reason ?? null } }),
            transformResponse: (value: unknown) => autoCareServiceRequestSchema.parse(value),
            invalidatesTags: (_result, _error, { requestId }) => [{ type: 'AutoCareServiceRequest', id: requestId }, { type: 'AutoCareServiceRequest', id: 'LIST' }],
        }),
        acceptAutoCareServiceQuote: build.mutation<AutoCareServiceRequest, string>({
            query: (requestId) => ({ url: `/v1/service-requests/${requestId}/quote/accept`, method: 'POST' }),
            transformResponse: (value: unknown) => autoCareServiceRequestSchema.parse(value),
            invalidatesTags: (_result, _error, requestId) => [{ type: 'AutoCareServiceRequest', id: requestId }, { type: 'AutoCareServiceRequest', id: 'LIST' }],
        }),
        declineAutoCareServiceQuote: build.mutation<AutoCareServiceRequest, string>({
            query: (requestId) => ({ url: `/v1/service-requests/${requestId}/quote/decline`, method: 'POST' }),
            transformResponse: (value: unknown) => autoCareServiceRequestSchema.parse(value),
            invalidatesTags: (_result, _error, requestId) => [{ type: 'AutoCareServiceRequest', id: requestId }, { type: 'AutoCareServiceRequest', id: 'LIST' }],
        }),
        getOwnerAutoCareServiceRequests: build.query<AutoCareServiceRequest[], void>({
            query: () => '/owner/service-requests',
            transformResponse: (value: unknown) => autoCareServiceRequestsSchema.parse(value),
            providesTags: (result) => result
                ? [...result.map((item) => ({ type: 'AutoCareServiceRequest' as const, id: item.id })), { type: 'AutoCareServiceRequest' as const, id: 'OWNER_LIST' }]
                : [{ type: 'AutoCareServiceRequest', id: 'OWNER_LIST' }],
        }),
        confirmOwnerAutoCareServiceRequest: build.mutation<AutoCareServiceRequest, string>({
            query: (requestId) => ({ url: `/owner/service-requests/${requestId}/confirm`, method: 'POST' }),
            transformResponse: (value: unknown) => autoCareServiceRequestSchema.parse(value),
            invalidatesTags: (_result, _error, requestId) => [{ type: 'AutoCareServiceRequest', id: requestId }, { type: 'AutoCareServiceRequest', id: 'OWNER_LIST' }],
        }),
        createAutoCareServiceQuote: build.mutation<AutoCareServiceRequest, CreateAutoCareServiceQuoteInput>({
            query: ({ requestId, ...body }) => ({ url: `/owner/service-requests/${requestId}/quote`, method: 'POST', body }),
            transformResponse: (value: unknown) => autoCareServiceRequestSchema.parse(value),
            invalidatesTags: (_result, _error, { requestId }) => [{ type: 'AutoCareServiceRequest', id: requestId }, { type: 'AutoCareServiceRequest', id: 'OWNER_LIST' }],
        }),
        requestAutoCareServiceReschedule: build.mutation<AutoCareReschedule, { requestId: string; proposedAt: string; reason?: string | null }>({
            query: ({ requestId, ...body }) => ({ url: `/owner/service-requests/${requestId}/reschedule`, method: 'POST', body }),
            transformResponse: (value: unknown) => autoCareRescheduleSchema.parse(value),
            invalidatesTags: (_result, _error, { requestId }) => [{ type: 'AutoCareServiceRequest', id: requestId }, { type: 'AutoCareServiceRequest', id: 'OWNER_LIST' }],
        }),
        markAutoCareServiceRequestNoShow: build.mutation<AutoCareServiceRequest, { requestId: string; reason?: string | null }>({
            query: ({ requestId, reason }) => ({ url: `/owner/service-requests/${requestId}/no-show`, method: 'POST', body: { reason: reason ?? null } }),
            transformResponse: (value: unknown) => autoCareServiceRequestSchema.parse(value),
            invalidatesTags: (_result, _error, { requestId }) => [{ type: 'AutoCareServiceRequest', id: requestId }, { type: 'AutoCareServiceRequest', id: 'OWNER_LIST' }],
        }),
        completeAutoCareServiceRequest: build.mutation<AutoCareServiceRequest, CompleteAutoCareServiceRequestInput>({
            query: ({ requestId, note }) => ({ url: `/owner/service-requests/${requestId}/complete`, method: 'POST', body: { note: note ?? null } }),
            transformResponse: (value: unknown) => autoCareServiceRequestSchema.parse(value),
            invalidatesTags: (_result, _error, { requestId }) => [{ type: 'AutoCareServiceRequest', id: requestId }, { type: 'AutoCareServiceRequest', id: 'OWNER_LIST' }],
        }),
    }),
})

export const {
    useGetAutoCareDiscoveryQuery,
    useGetAutoCareMarketsQuery,
    useUpdateSuperAdminAutoCareMarketMutation,
    useGetAutoCareLocationZonesQuery,
    useGetOwnerAutoCareProvidersQuery,
    useGetOwnerAutoCareProviderAnalyticsQuery,
    useGetOwnerAutoCareProviderMembersQuery,
    useInviteAutoCareProviderMemberMutation,
    useRevokeAutoCareProviderInvitationMutation,
    useAcceptAutoCareProviderInvitationMutation,
    useGetOwnerAutoCareProviderChangeRequestsQuery,
    useCreateOwnerAutoCareProviderChangeRequestMutation,
    useCancelOwnerAutoCareProviderChangeRequestMutation,
    useGetAdminAutoCareProviderChangeRequestsQuery,
    useDecideAdminAutoCareProviderChangeRequestMutation,
    useCreateAutoCareCatalogGapRequestMutation,
    useGetAdminCatalogGapRequestsQuery,
    useDecideAdminCatalogGapRequestMutation,
    useGetAdminAutoCareChatReportsQuery,
    useDecideAdminAutoCareChatReportMutation,
    useGetMyAutoCareBonusAccountsQuery,
    useGetOwnerAutoCareBonusProgramQuery,
    useUpsertOwnerAutoCareBonusProgramMutation,
    useUpdateOwnerAutoCareOfferMutation,
    useGetOwnerAutoCareProviderReviewsQuery,
    useGetOwnerAutoCareReviewsQuery,
    useIssueOwnerAutoCareReviewPromoMutation,
    useGetMyAutoCareReviewsQuery,
    useGetMyAutoCareAppealsQuery,
    useCreateAutoCareAppealMutation,
    useCreateAutoCareReviewMutation,
    useRedeemAutoCareReviewPromoMutation,
    useUpdateAutoCareReviewMutation,
    useGetAdminAutoCareProvidersQuery,
    useUpdateAdminAutoCareProviderStatusMutation,
    useGetAdminAutoCareAppealsQuery,
    useDecideAdminAutoCareAppealMutation,
    useGetSuperAdminPlatformOverviewQuery,
    useUploadOwnerAutoCareProviderLogoMutation,
    useUploadOwnerAutoCareProviderMediaMutation,
    useGetAutoCareProviderProfileQuery,
    useGetAutoCareProviderReviewsQuery,
    useGetAutoCareFavoritesQuery,
    useAddAutoCareFavoriteMutation,
    useRemoveAutoCareFavoriteMutation,
    useSyncAutoCareFavoritesMutation,
    useGetAutoCareAvailabilityQuery,
    useGetAutoCareFairPriceQuery,
    useGetAutoCareProviderTrustQuery,
    useGetAutoCareServiceDefinitionsQuery,
    useGetVehicleCatalogQuery,
    useGetFeaturedAutoCareReviewsQuery,
    useCreateOwnerAutoCareProviderMutation,
    useCreateAutoCareServiceRequestMutation,
    useGetMyAutoCareServiceRequestsQuery,
    useGetAutoCareChatsQuery,
    useCreateAutoCareChatMutation,
    useGetAutoCareChatQuery,
    useCreateAutoCareChatMessageMutation,
    useCreateAutoCareChatReportMutation,
    useCreateAutoCareChatBlockMutation,
    useRevokeAutoCareChatBlockMutation,
    useMarkAutoCareChatReadMutation,
    useCreateAutoCareChatAttachmentMutation,
    useGetAutoCareServiceRequestQuery,
    useGetAutoCareRepairTimelineQuery,
    useCreateAutoCareBroadcastRequestMutation,
    useGetMyAutoCareBroadcastRequestsQuery,
    useGetAutoCareBroadcastRequestQuery,
    useGetOwnerAutoCareBroadcastRequestsQuery,
    useCreateAutoCareBroadcastOfferMutation,
    useCreateAutoCareGuaranteeClaimMutation,
    useGetMyAutoCareGuaranteeClaimsQuery,
    useCreateAutoCareExpertQuestionMutation,
    useGetMyAutoCareExpertQuestionsQuery,
    useGetMyAutoCareFleetsQuery,
    useCreateAutoCareFleetMutation,
    useCreateAutoCareFleetVehicleMutation,
    useGetAutoCareServiceConversationQuery,
    useCreateAutoCareServiceMessageMutation,
    useCreateAutoCareServiceOfferMutation,
    useDecideAutoCareServiceOfferMutation,
    useMarkAutoCareServiceConversationReadMutation,
    useCreateAutoCareServiceAttachmentMutation,
    useConfirmAutoCareServiceRequestMutation,
    useCancelAutoCareServiceRequestMutation,
    useDecideAutoCareServiceRescheduleMutation,
    useAcceptAutoCareServiceQuoteMutation,
    useDeclineAutoCareServiceQuoteMutation,
    useGetOwnerAutoCareServiceRequestsQuery,
    useRevokeAutoCareProviderMembershipMutation,
    useRedeemAutoCareBonusMutation,
    useGrantAutoCareBonusMutation,
    useConfirmOwnerAutoCareServiceRequestMutation,
    useCreateAutoCareServiceQuoteMutation,
    useRequestAutoCareServiceRescheduleMutation,
    useMarkAutoCareServiceRequestNoShowMutation,
    useCompleteAutoCareServiceRequestMutation,
} = autoCareApi
