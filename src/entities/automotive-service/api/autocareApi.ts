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
}

export type UpdateAutoCareOfferInput = {
    providerId: string
    offerId: string
    description: string | null
    priceFromMinor: number
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

const autoCareProviderProfileSchema = autoCareProviderSchema.extend({ offers: z.array(autoCareOfferSchema) }).passthrough() satisfies z.ZodType<AutoCareApiProviderProfile>
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
const autoCareRescheduleSchema = z.object({
    id: z.string().min(1), proposedAt: z.string(), requestedById: z.string(),
    status: z.enum(['pending', 'accepted', 'rejected']), reason: z.string().nullable(),
    resolvedById: z.string().nullable(), resolutionReason: z.string().nullable(),
    createdAt: z.string(), resolvedAt: z.string().nullable(),
}).passthrough()
const autoCareScalarRecordSchema = z.record(z.string(), z.union([z.string(), z.number(), z.null()]))
const autoCareServiceRequestSchema = z.object({
    id: z.string().min(1), providerId: z.string().min(1), providerName: z.string(), locationId: z.string().min(1), address: z.string(), definitionId: z.string().min(1), serviceSlug: z.string(),
    serviceLabels: z.record(z.string(), z.string()), serviceDescription: z.string().nullable(), offeringId: z.string().nullable(), priceFromMinor: z.number().finite().nullable(), currencyCode: z.string().nullable(), preferredAt: z.string().nullable(),
    vehicleSnapshot: autoCareScalarRecordSchema.nullable(), contactSnapshot: autoCareScalarRecordSchema.nullable(), note: z.string().nullable(), status: z.enum(['draft', 'open', 'awaiting_reply', 'estimate_shared', 'accepted', 'declined', 'cancelled', 'no_show', 'closed']), clientConfirmedAt: z.string().nullable(), providerConfirmedAt: z.string().nullable(), cancelledAt: z.string().nullable().optional(), cancelledById: z.string().nullable().optional(), cancellationReason: z.string().nullable().optional(), noShowAt: z.string().nullable().optional(), noShowById: z.string().nullable().optional(), noShowReason: z.string().nullable().optional(), completedAt: z.string().nullable().optional(), completedById: z.string().nullable().optional(), completionNote: z.string().nullable().optional(), acceptedQuoteVersion: z.number().int().positive().nullable().optional(), acceptedQuoteSnapshot: z.record(z.string(), z.unknown()).nullable().optional(), acceptedQuoteAt: z.string().nullable().optional(), reschedule: autoCareRescheduleSchema.nullable().default(null), createdAt: z.string(), updatedAt: z.string(), quote: autoCareQuoteSchema.nullable(), quoteHistory: z.array(autoCareQuoteHistorySchema).default([]),
}).passthrough()
const autoCareServiceRequestsSchema = z.array(autoCareServiceRequestSchema)
const autoCareChatThreadSchema = z.object({ id: z.string().min(1), type: z.enum(['service_request', 'provider_inquiry', 'support', 'admin_escalation']), status: z.enum(['open', 'closed']), subject: z.string(), requestId: z.string().nullable(), providerId: z.string().nullable(), providerName: z.string().nullable(), clientId: z.string().nullable(), lastMessageAt: z.string().nullable(), unreadCount: z.number().int().nonnegative(), createdAt: z.string(), updatedAt: z.string() }).passthrough()
const autoCareChatThreadsSchema = z.array(autoCareChatThreadSchema)
const autoCareServiceMessageOfferSchema = z.object({ type: z.enum(['discount', 'alternative']), title: z.string(), description: z.string().nullable(), discountPercent: z.number().int().nullable(), couponCode: z.string().nullable(), amountMinor: z.number().finite().nullable(), currencyCode: z.string().nullable(), expiresAt: z.string().nullable(), status: z.enum(['pending', 'accepted', 'declined']) }).passthrough()
const autoCareServiceMessageSchema = z.object({ id: z.string().min(1), senderId: z.string().min(1), kind: z.enum(['text', 'system', 'offer']), body: z.string().nullable(), offer: autoCareServiceMessageOfferSchema.nullable(), deliveredAt: z.string().nullable(), readAt: z.string().nullable(), createdAt: z.string() }).passthrough()
const autoCareServiceAttachmentSchema = z.object({ id: z.string().min(1), uploadedById: z.string().min(1), contentType: z.string(), bytes: z.number().int().positive(), status: z.enum(['pending', 'ready', 'rejected']), url: z.string(), createdAt: z.string() }).passthrough()
const autoCareServiceConversationSchema = z.object({ request: autoCareServiceRequestSchema, messages: z.array(autoCareServiceMessageSchema), attachments: z.array(autoCareServiceAttachmentSchema) }).passthrough()
const autoCareChatConversationSchema = z.object({ thread: autoCareChatThreadSchema, messages: z.array(autoCareServiceMessageSchema), attachments: z.array(autoCareServiceAttachmentSchema) }).passthrough()
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
    reschedule: AutoCareReschedule | null
    createdAt: string
    updatedAt: string
    quote: AutoCareServiceQuote | null
    quoteHistory: Array<AutoCareServiceQuote & { id: string; version: number }>
}

export type AutoCareReschedule = { id: string; proposedAt: string; requestedById: string; status: 'pending' | 'accepted' | 'rejected'; reason: string | null; resolvedById: string | null; resolutionReason: string | null; createdAt: string; resolvedAt: string | null }

export type AutoCareQuoteLineItem = { kind: 'part' | 'labour' | 'consumable' | 'tax' | 'fee' | 'discount'; title: string; quantity: number; unitPriceMinor: number; totalMinor: number }
export type AutoCareServiceQuote = { amountMinor: number; currencyCode: string; note: string | null; createdAt: string; lineItems?: AutoCareQuoteLineItem[]; subtotalMinor?: number; taxMinor?: number; feesMinor?: number; validUntil?: string | null; priceLocked?: boolean }
export type AutoCareServiceMessageOffer = { type: 'discount' | 'alternative'; title: string; description: string | null; discountPercent: number | null; couponCode: string | null; amountMinor: number | null; currencyCode: string | null; expiresAt: string | null; status: 'pending' | 'accepted' | 'declined' }
export type AutoCareServiceMessage = { id: string; senderId: string; kind: 'text' | 'system' | 'offer'; body: string | null; offer: AutoCareServiceMessageOffer | null; deliveredAt: string | null; readAt: string | null; createdAt: string }
export type AutoCareServiceAttachment = { id: string; uploadedById: string; contentType: string; bytes: number; status: 'pending' | 'ready' | 'rejected'; url: string; createdAt: string }
export type AutoCareServiceConversation = { request: AutoCareServiceRequest; messages: AutoCareServiceMessage[]; attachments: AutoCareServiceAttachment[] }
export type AutoCareChatThreadType = 'service_request' | 'provider_inquiry' | 'support' | 'admin_escalation'
export type AutoCareChatThread = { id: string; type: AutoCareChatThreadType; status: 'open' | 'closed'; subject: string; requestId: string | null; providerId: string | null; providerName: string | null; clientId: string | null; lastMessageAt: string | null; unreadCount: number; createdAt: string; updatedAt: string }
export type AutoCareChatConversation = { thread: AutoCareChatThread; messages: AutoCareServiceMessage[]; attachments: AutoCareServiceAttachment[] }
export type CreateAutoCareChatInput = { type: Exclude<AutoCareChatThreadType, 'service_request'>; providerId?: string; requestId?: string; subject: string }
export type CreateAutoCareChatMessageInput = { chatId: string; body: string }
export type CreateAutoCareChatAttachmentInput = { chatId: string; fileName: string; contentType: 'image/jpeg' | 'image/png' | 'image/webp'; size: number; contentBase64: string }
export type CreateAutoCareServiceMessageInput = { requestId: string; body: string; idempotencyKey?: string }
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
        getAutoCareChat: build.query<AutoCareChatConversation, string>({
            query: (chatId) => `/v1/chats/${chatId}`,
            transformResponse: (value: unknown) => autoCareChatConversationSchema.parse(value),
            providesTags: (_result, _error, chatId) => [{ type: 'AutoCareServiceRequest', id: `CHAT_${chatId}` }],
        }),
        createAutoCareChatMessage: build.mutation<AutoCareServiceMessage, CreateAutoCareChatMessageInput>({
            query: ({ chatId, body }) => ({ url: `/v1/chats/${chatId}/messages`, method: 'POST', body: { body } }),
            transformResponse: (value: unknown) => autoCareServiceMessageSchema.parse(value),
            invalidatesTags: (_result, _error, { chatId }) => [{ type: 'AutoCareServiceRequest', id: `CHAT_${chatId}` }, { type: 'AutoCareServiceRequest', id: 'CHAT_LIST' }],
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
        getAutoCareServiceConversation: build.query<AutoCareServiceConversation, string>({
            query: (requestId) => `/v1/service-requests/${requestId}/conversation`,
            transformResponse: (value: unknown) => autoCareServiceConversationSchema.parse(value),
            providesTags: (_result, _error, requestId) => [{ type: 'AutoCareServiceRequest', id: requestId }],
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
    useGetAutoCareLocationZonesQuery,
    useGetOwnerAutoCareProvidersQuery,
    useUpdateOwnerAutoCareOfferMutation,
    useGetOwnerAutoCareProviderReviewsQuery,
    useGetOwnerAutoCareReviewsQuery,
    useIssueOwnerAutoCareReviewPromoMutation,
    useGetMyAutoCareReviewsQuery,
    useCreateAutoCareReviewMutation,
    useRedeemAutoCareReviewPromoMutation,
    useUpdateAutoCareReviewMutation,
    useGetAdminAutoCareProvidersQuery,
    useUpdateAdminAutoCareProviderStatusMutation,
    useGetSuperAdminPlatformOverviewQuery,
    useUploadOwnerAutoCareProviderLogoMutation,
    useUploadOwnerAutoCareProviderMediaMutation,
    useGetAutoCareProviderProfileQuery,
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
    useConfirmOwnerAutoCareServiceRequestMutation,
    useCreateAutoCareServiceQuoteMutation,
    useRequestAutoCareServiceRescheduleMutation,
    useMarkAutoCareServiceRequestNoShowMutation,
    useCompleteAutoCareServiceRequestMutation,
} = autoCareApi
