import { z } from 'zod'
import { AutomotiveProviderChangeRequestKind } from '../../entities/automotive/provider-change-request.entity.js'
import { AutomotivePriceType } from '../../entities/automotive/automotive.entity.js'
import { AutoCareAppealSubject } from '../../entities/automotive/appeal.entity.js'

const autoCareVehicleSnapshotSchema = z.object({
    make: z.string().trim().min(1).max(80),
    model: z.string().trim().min(1).max(80),
    year: z.coerce.number().int().min(1886).max(new Date().getFullYear() + 1),
    mileage: z.coerce.number().int().nonnegative().max(2_000_000).optional(),
}).strict()

export const autoCareDiscoveryQuerySchema = z.object({
    serviceId: z.string().trim().min(1).max(120).optional(),
    providerName: z.string().trim().min(1).max(160).optional(),
    marketId: z.string().trim().min(1).max(120).optional(),
    zoneId: z.string().uuid().optional(),
    radiusKm: z.coerce.number().finite().positive().max(500).default(25),
    sort: z.enum(['recommended', 'price_asc', 'rating_desc', 'distance_asc']).default('recommended'),
    cursor: z.string().trim().max(2_048).optional(),
    limit: z.coerce.number().int().positive().max(50).default(20),
    minPrice: z.coerce.number().finite().nonnegative().max(1_000_000).optional(),
    maxPrice: z.coerce.number().finite().nonnegative().max(1_000_000).optional(),
    minRating: z.coerce.number().finite().min(0).max(5).optional(),
    priceType: z.enum(['fixed', 'from', 'range', 'quote_required']).optional(),
    availableToday: z.coerce.boolean().optional(),
    verifiedOnly: z.coerce.boolean().optional(),
    warrantyOnly: z.coerce.boolean().optional(),
    hasBonus: z.coerce.boolean().optional(),
    inclusion: z.string().trim().min(1).max(80).optional(),
    brandId: z.string().trim().min(1).max(80).optional(),
}).superRefine((value, context) => {
    if (value.minPrice !== undefined && value.maxPrice !== undefined && value.minPrice > value.maxPrice) {
        context.addIssue({ code: 'custom', path: ['minPrice'], message: 'minPrice must not exceed maxPrice' })
    }
})

export const autoCareMarketParamsSchema = z.object({
    marketId: z.string().trim().min(1).max(120),
})

export const autoCareLocationZonesQuerySchema = z.object({
    parentId: z.string().uuid().optional(),
    latitude: z.coerce.number().finite().min(-90).max(90).optional(),
    longitude: z.coerce.number().finite().min(-180).max(180).optional(),
    limit: z.coerce.number().int().positive().max(100).default(24),
}).superRefine((value, context) => {
    if ((value.latitude === undefined) !== (value.longitude === undefined)) context.addIssue({ code: 'custom', path: ['latitude'], message: 'latitude and longitude must be provided together' })
})

export const autoCareProviderParamsSchema = z.object({
    providerId: z.string().uuid(),
})

export const autoCareProviderInvitationParamsSchema = z.object({
    providerId: z.string().uuid(),
    invitationId: z.string().uuid(),
})

export const autoCareProviderMembershipParamsSchema = z.object({
    providerId: z.string().uuid(),
    membershipId: z.string().uuid(),
})

export const createAutoCareProviderInvitationSchema = z.object({
    email: z.string().trim().email().max(320),
    role: z.enum(['manager', 'staff']),
    locationId: z.string().uuid().nullable().optional(),
})

export const acceptAutoCareProviderInvitationSchema = z.object({
    token: z.string().trim().min(32).max(512).regex(/^[A-Za-z0-9_-]+$/),
})

export const createAutoCareProviderChangeRequestSchema = z.object({
    kind: z.nativeEnum(AutomotiveProviderChangeRequestKind),
    payload: z.record(z.string(), z.unknown()).default({}),
}).superRefine((value, context) => {
    if (value.kind === AutomotiveProviderChangeRequestKind.Verification && Object.keys(value.payload).length > 0) {
        context.addIssue({ code: 'custom', path: ['payload'], message: 'Verification requests do not accept profile changes.' })
    }
})

export const ownerAutoCareProviderChangeRequestParamsSchema = z.object({
    providerId: z.string().uuid(),
})

export const createAutoCareCatalogGapRequestSchema = z.object({
    providerId: z.string().uuid().nullable().optional(),
    proposedSlug: z.string().trim().regex(/^[a-z0-9][a-z0-9_-]{1,119}$/),
    categorySlug: z.string().trim().min(2).max(80),
    labels: z.record(z.string(), z.string().trim().min(1).max(160)).refine((value) => Object.keys(value).length > 0, 'At least one localized label is required.'),
    priceType: z.nativeEnum(AutomotivePriceType),
    comparisonAttributes: z.array(z.string().trim().min(1).max(80)).max(30),
    rationale: z.string().trim().min(10).max(2_000),
})

export const autoCareFavoriteParamsSchema = z.object({
    providerId: z.string().uuid(),
})

export const createAutoCareFavoriteSchema = z.object({
    locationId: z.string().uuid().optional(),
})

export const syncAutoCareFavoritesSchema = z.object({
    providerIds: z.array(z.string().uuid()).max(100),
})

export const autoCareOfferParamsSchema = z.object({
    providerId: z.string().uuid(),
    offerId: z.string().uuid(),
})

export const autoCareReviewParamsSchema = z.object({
    providerId: z.string().uuid(),
    reviewId: z.string().uuid(),
})

export const autoCareReviewOnlyParamsSchema = z.object({
    reviewId: z.string().uuid(),
})

export const createAutoCareReviewPromoSchema = z.object({
    discountPercent: z.number().int().min(1).max(100),
    serviceSlug: z.string().trim().min(1).max(120).nullable().optional(),
    expiresInDays: z.number().int().min(1).max(90).default(30),
})

export const redeemAutoCareReviewPromoSchema = z.object({
    code: z.string().trim().toUpperCase().regex(/^CARE-[A-Z0-9]{8}$/),
})

export const updateAutoCareReviewSchema = z.object({
    rating: z.number().int().min(1).max(5),
    text: z.string().trim().min(10).max(1_000),
})

export const createAutoCareReviewSchema = z.object({
    requestId: z.string().uuid(),
    rating: z.number().int().min(1).max(5),
    text: z.string().trim().min(10).max(1_000),
})

export const updateAutoCareOfferSchema = z.object({
    description: z.string().trim().max(2_000).nullable(),
    priceFromMinor: z.number().int().nonnegative().max(100_000_000_00),
    bookingMode: z.enum(['request', 'instant']).optional(),
})

export const updateAdminAutoCareServiceDefinitionSchema = z.object({
    categorySlug: z.string().trim().min(2).max(80),
    labels: z.record(z.string().trim().min(2).max(16), z.string().trim().min(1).max(160)).refine((value) => Object.keys(value).length > 0, 'At least one localized label is required.'),
    priceType: z.nativeEnum(AutomotivePriceType),
    comparisonAttributes: z.array(z.string().trim().min(1).max(80)).max(30),
    active: z.boolean(),
})

export const ownerAutoCareBonusProgramSchema = z.object({
    name: z.string().trim().min(2).max(120),
    earnPercent: z.number().finite().min(0).max(100),
    maxEarnPointsPerVisit: z.number().int().positive().max(1_000_000).nullable().optional(),
    expiresAfterDays: z.number().int().positive().max(3_650).nullable().optional(),
    active: z.boolean().default(true),
})

export const redeemAutoCareBonusSchema = z.object({
    providerId: z.string().uuid(),
    requestId: z.string().uuid(),
    points: z.number().int().positive().max(1_000_000),
})

export const grantAutoCareBonusSchema = z.object({
    points: z.number().int().positive().max(100_000),
    reason: z.string().trim().min(10).max(500),
})

export const autoCareProviderOffersQuerySchema = z.object({
    serviceId: z.string().trim().min(1).max(120).optional(),
})

export const autoCareFeaturedReviewsQuerySchema = z.object({
    limit: z.coerce.number().int().positive().max(12).default(6),
})

export const createAutoCareAppealSchema = z.object({
    subject: z.nativeEnum(AutoCareAppealSubject),
    subjectId: z.string().uuid(),
    providerId: z.string().uuid().nullable().optional(),
    reason: z.string().trim().min(20).max(4_000),
    evidenceIds: z.array(z.string().uuid()).max(20).optional(),
})

export const autoCareProviderReviewsQuerySchema = z.object({
    limit: z.coerce.number().int().positive().max(50).default(20),
})

export const autoCareFairPriceQuerySchema = z.object({
    serviceId: z.string().trim().min(1).max(120),
    marketId: z.string().trim().min(1).max(120).optional(),
    makeId: z.string().trim().min(1).max(80).optional(),
    modelId: z.string().trim().min(1).max(80).optional(),
    fuelType: z.string().trim().min(1).max(40).optional(),
    engineLiters: z.coerce.number().finite().positive().max(20).optional(),
})

export const uploadAutoCareProviderLogoSchema = z.object({
    fileName: z.string().trim().min(1).max(255),
    mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
    size: z.number().int().positive().max(1_048_576),
    contentBase64: z.string().min(1).max(1_398_104),
})

export const uploadAutoCareProviderMediaSchema = uploadAutoCareProviderLogoSchema.extend({
    kind: z.enum(['cover', 'gallery']),
    size: z.number().int().positive().max(6 * 1024 * 1024),
    contentBase64: z.string().min(1).max(8_388_608),
})

export const autoCareAvailabilityQuerySchema = z.object({
    locationId: z.string().uuid(),
    offeringId: z.string().uuid(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export const autoCareServiceRequestParamsSchema = z.object({
    requestId: z.string().uuid(),
})

export const autoCareServiceAttachmentParamsSchema = z.object({
    requestId: z.string().uuid(),
    attachmentId: z.string().uuid(),
})

export const autoCareChatParamsSchema = z.object({
    chatId: z.string().uuid(),
})

export const createAutoCareChatReportSchema = z.object({
    category: z.enum(['spam', 'harassment', 'fraud', 'unsafe', 'other']),
    description: z.string().trim().max(2_000).nullable().optional(),
})

export const createAutoCareChatBlockSchema = z.object({
    blockedUserId: z.string().uuid().optional(),
    reason: z.string().trim().max(1_000).nullable().optional(),
})

export const autoCareChatBlockParamsSchema = z.object({
    chatId: z.string().uuid(),
    blockId: z.string().uuid(),
})

export const ownerAutoCareReviewsQuerySchema = z.object({
    providerId: z.string().uuid().optional(),
})

export const createAutoCareChatSchema = z.object({
    type: z.enum(['provider_inquiry', 'support', 'admin_escalation']),
    providerId: z.string().uuid().optional(),
    requestId: z.string().uuid().optional(),
    subject: z.string().trim().min(2).max(160),
})

const requestContactSnapshotSchema = z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(320),
    phone: z.string().trim().min(5).max(32),
}).strict()

export const createAutoCareServiceRequestSchema = z.object({
    providerId: z.string().uuid(),
    locationId: z.string().uuid(),
    offeringId: z.string().uuid(),
    preferredAt: z.string().datetime({ offset: true }),
    vehicleSnapshot: autoCareVehicleSnapshotSchema.nullable().optional(),
    contactSnapshot: requestContactSnapshotSchema,
    note: z.string().trim().max(4_000).nullable().optional(),
})

export const cancelAutoCareServiceRequestSchema = z.object({
    reason: z.string().trim().max(1_000).nullable().optional(),
})

export const createAutoCareRescheduleSchema = z.object({
    proposedAt: z.string().datetime({ offset: true }),
    reason: z.string().trim().max(1_000).nullable().optional(),
})

export const decideAutoCareRescheduleSchema = z.object({
    decision: z.enum(['accept', 'reject']),
    reason: z.string().trim().max(1_000).nullable().optional(),
})

export const markAutoCareNoShowSchema = z.object({
    reason: z.string().trim().max(1_000).nullable().optional(),
})

export const completeAutoCareServiceRequestSchema = z.object({
    note: z.string().trim().max(1_000).nullable().optional(),
})

export const createAutoCareServiceMessageSchema = z.object({
    body: z.string().trim().min(1).max(4_000),
})

export const createAutoCareServiceOfferSchema = z.object({
    type: z.enum(['discount', 'alternative']),
    title: z.string().trim().min(2).max(160),
    description: z.string().trim().max(4_000).nullable().optional(),
    discountPercent: z.number().int().min(1).max(100).nullable().optional(),
    couponCode: z.string().trim().regex(/^[A-Z0-9_-]{4,32}$/).nullable().optional(),
    amountMinor: z.number().int().positive().max(10_000_000_00).nullable().optional(),
    currencyCode: z.string().trim().regex(/^[A-Z]{3}$/).nullable().optional(),
    expiresAt: z.string().datetime({ offset: true }).nullable().optional(),
}).superRefine((value, context) => {
    if (value.type === 'discount' && value.discountPercent === undefined) {
        context.addIssue({ code: 'custom', path: ['discountPercent'], message: 'A discount offer requires discountPercent.' })
    }
})

export const autoCareServiceMessageParamsSchema = z.object({
    requestId: z.string().uuid(),
    messageId: z.string().uuid(),
})

export const autoCareServiceConversationQuerySchema = z.object({
    cursor: z.string().trim().max(2_048).optional(),
    limit: z.coerce.number().int().positive().max(100).default(50),
})

// Generic support/provider-inquiry chats use the same keyset contract as
// service-request conversations. Keeping one query shape means the browser
// can progressively load older messages without knowing the thread type.
export const autoCareChatConversationQuerySchema = autoCareServiceConversationQuerySchema

export const serviceMessageOfferDecisionSchema = z.object({
    decision: z.enum(['accept', 'decline']),
})

export const createAutoCareServiceAttachmentSchema = z.object({
    fileName: z.string().trim().min(1).max(255),
    contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
    size: z.number().int().positive().max(10 * 1024 * 1024),
    contentBase64: z.string().min(1).max(14 * 1024 * 1024),
})

export const createAutoCareServiceQuoteSchema = z.object({
    amountMinor: z.number().int().positive().max(10_000_000_00),
    currencyCode: z.string().trim().regex(/^[A-Z]{3}$/),
    note: z.string().trim().max(4_000).nullable().optional(),
    lineItems: z.array(z.object({
        kind: z.enum(['part', 'labour', 'consumable', 'tax', 'fee', 'discount']),
        title: z.string().trim().min(1).max(160),
        quantity: z.number().positive().max(10_000),
        unitPriceMinor: z.number().int().max(10_000_000_00),
    })).max(100).optional(),
    taxMinor: z.number().int().nonnegative().max(10_000_000_00).default(0),
    feesMinor: z.number().int().nonnegative().max(10_000_000_00).default(0),
    validUntil: z.string().datetime({ offset: true }).nullable().optional(),
    priceLocked: z.boolean().default(false),
})

export const createAutoCareBroadcastRequestSchema = z.object({
    serviceDefinitionId: z.string().trim().min(1).max(120),
    marketId: z.string().trim().min(1).max(120).nullable().optional(),
    issueDescription: z.string().trim().min(10).max(4_000),
    vehicleSnapshot: autoCareVehicleSnapshotSchema.nullable().optional(),
    photoUrls: z.array(z.string().url().max(500)).max(12).optional(),
    preferredAt: z.string().datetime({ offset: true }).nullable().optional(),
    maxProviders: z.number().int().min(1).max(10).default(5),
})

export const autoCareBroadcastParamsSchema = z.object({ broadcastId: z.string().uuid() })

export const createAutoCareBroadcastOfferSchema = z.object({
    locationId: z.string().uuid(),
    amountMinor: z.number().int().positive().max(10_000_000_00),
    currencyCode: z.string().trim().regex(/^[A-Z]{3}$/),
    note: z.string().trim().max(4_000).nullable().optional(),
    durationMinutes: z.number().int().positive().max(2_880).optional(),
    validUntil: z.string().datetime({ offset: true }).nullable().optional(),
})

export const createAutoCareGuaranteeClaimSchema = z.object({
    requestId: z.string().uuid(),
    claimType: z.enum(['price', 'quality', 'warranty', 'no_show', 'safety']),
    summary: z.string().trim().min(10).max(4_000),
    evidenceUrls: z.array(z.string().url().max(500)).max(20).optional(),
})

export const createAutoCareExpertQuestionSchema = z.object({
    symptoms: z.string().trim().min(10).max(4_000),
    categorySlug: z.string().trim().min(1).max(120).nullable().optional(),
    vehicleSnapshot: autoCareVehicleSnapshotSchema.nullable().optional(),
})

export const createAutoCareFleetSchema = z.object({
    name: z.string().trim().min(2).max(160),
    notes: z.string().trim().max(4_000).nullable().optional(),
})

export const autoCareFleetParamsSchema = z.object({ fleetId: z.string().uuid() })

export const createAutoCareFleetVehicleSchema = z.object({
    label: z.string().trim().min(1).max(120),
    vehicleSnapshot: z.record(z.string(), z.unknown()),
    approvalPolicy: z.string().trim().max(160).nullable().optional(),
})

const automotiveAmenityIds = ['waiting_room', 'customer_parking', 'wifi', 'online_booking', 'coffee', 'card_payment', 'electric_charging', 'pickup_delivery'] as const
const scheduleDaySchema = z.object({
    open: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    close: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    closed: z.boolean(),
}).strict()
const weeklyScheduleSchema = z.record(z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']), scheduleDaySchema).superRefine((value, context) => {
    for (const [day, schedule] of Object.entries(value)) {
        if (!schedule.closed && schedule.open >= schedule.close) context.addIssue({ code: 'custom', path: [day], message: 'Opening time must be earlier than closing time.' })
    }
})

export const ownerAutoCareProviderSchema = z.object({
    name: z.string().trim().min(2).max(160),
    description: z.string().trim().max(5_000).nullable().optional(),
    marketId: z.string().uuid(),
    zoneId: z.string().uuid().nullable().optional(),
    address: z.string().trim().min(2).max(240),
    hours: z.string().trim().min(2).max(120),
    timezone: z.string().trim().min(3).max(80).optional(),
    weeklySchedule: weeklyScheduleSchema.optional(),
    blackoutDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(366).optional(),
    yearsActive: z.coerce.number().int().min(0).max(150),
    staffCount: z.coerce.number().int().min(0).max(10_000),
    workstationCount: z.coerce.number().int().nonnegative().max(100_000).optional(),
    phone: z.string().trim().min(5).max(32).nullable().optional(),
    phones: z.array(z.string().trim().min(5).max(32)).max(5).optional(),
    email: z.string().trim().email().max(320).nullable().optional(),
    websiteUrl: z.string().trim().url().max(500).nullable().optional(),
    metroStation: z.string().trim().max(120).nullable().optional(),
    warrantyText: z.string().trim().max(500).nullable().optional(),
    bonusSummary: z.string().trim().max(500).nullable().optional(),
    isMultibrand: z.boolean(),
    brandSpecializations: z.array(z.string().trim().min(1).max(80)).max(30),
    amenityIds: z.array(z.enum(automotiveAmenityIds)).max(automotiveAmenityIds.length),
    logoUrl: z.string().trim().regex(/^\/uploads\/autocare\/logos\/[a-f0-9-]+\.webp$/i).nullable().optional(),
    coverImageUrl: z.string().trim().regex(/^\/uploads\/autocare\/media\/cover\/[a-f0-9-]+\.webp$/i).nullable().optional(),
    galleryImageUrls: z.array(z.string().trim().regex(/^\/uploads\/autocare\/media\/gallery\/[a-f0-9-]+\.webp$/i)).max(12).optional(),
}).superRefine((value, context) => {
    if (!value.isMultibrand && value.brandSpecializations.length === 0) {
        context.addIssue({ code: 'custom', path: ['brandSpecializations'], message: 'Choose at least one brand or enable multibrand service.' })
    }
})
