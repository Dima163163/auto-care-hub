import { z } from 'zod'

export const autoCareDiscoveryQuerySchema = z.object({
    serviceId: z.string().trim().min(1).max(120).optional(),
    marketId: z.string().trim().min(1).max(120).optional(),
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

export const autoCareProviderParamsSchema = z.object({
    providerId: z.string().uuid(),
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

export const updateAutoCareOfferSchema = z.object({
    description: z.string().trim().max(2_000).nullable(),
    priceFromMinor: z.number().int().nonnegative().max(100_000_000_00),
})

export const autoCareProviderOffersQuerySchema = z.object({
    serviceId: z.string().trim().min(1).max(120).optional(),
})

export const autoCareFeaturedReviewsQuerySchema = z.object({
    limit: z.coerce.number().int().positive().max(12).default(6),
})

export const uploadAutoCareProviderLogoSchema = z.object({
    fileName: z.string().trim().min(1).max(255),
    mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
    size: z.number().int().positive().max(1_048_576),
    contentBase64: z.string().min(1).max(1_398_104),
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

const requestVehicleSnapshotSchema = z.object({
    make: z.string().trim().min(1).max(80),
    model: z.string().trim().min(1).max(80),
    year: z.coerce.number().int().min(1886).max(new Date().getFullYear() + 1),
    mileage: z.coerce.number().int().nonnegative().max(2_000_000).optional(),
}).strict()

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
    vehicleSnapshot: requestVehicleSnapshotSchema.nullable().optional(),
    contactSnapshot: requestContactSnapshotSchema,
    note: z.string().trim().max(4_000).nullable().optional(),
})

export const createAutoCareServiceMessageSchema = z.object({
    body: z.string().trim().min(1).max(4_000),
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
})

const automotiveAmenityIds = ['waiting_room', 'customer_parking', 'wifi', 'online_booking', 'coffee', 'card_payment', 'electric_charging', 'pickup_delivery'] as const

export const ownerAutoCareProviderSchema = z.object({
    name: z.string().trim().min(2).max(160),
    description: z.string().trim().max(5_000).nullable().optional(),
    marketId: z.string().uuid(),
    address: z.string().trim().min(2).max(240),
    hours: z.string().trim().min(2).max(120),
    yearsActive: z.coerce.number().int().min(0).max(150),
    staffCount: z.coerce.number().int().min(0).max(10_000),
    isMultibrand: z.boolean(),
    brandSpecializations: z.array(z.string().trim().min(1).max(80)).max(30),
    amenityIds: z.array(z.enum(automotiveAmenityIds)).max(automotiveAmenityIds.length),
    logoUrl: z.string().trim().regex(/^\/uploads\/autocare\/logos\/[a-f0-9-]+\.webp$/i).nullable().optional(),
}).superRefine((value, context) => {
    if (!value.isMultibrand && value.brandSpecializations.length === 0) {
        context.addIssue({ code: 'custom', path: ['brandSpecializations'], message: 'Choose at least one brand or enable multibrand service.' })
    }
})
