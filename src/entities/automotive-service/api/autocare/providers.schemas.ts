import { z } from 'zod'
import type { AutoCareApiDiscoveryResponse, AutoCareApiOffer, AutoCareApiProvider, AutoCareApiProviderProfile, AutoCareFavorite, AutoCareProviderAnalytics, OwnerAutoCareEvidence } from './providers.types'

export const autoCareProviderAnalyticsSchema = z.object({
    providerId: z.string(), generatedAt: z.string().datetime({ offset: true }),
    inquiries: z.number().int().nonnegative(), openRequests: z.number().int().nonnegative(),
    confirmedBookings: z.number().int().nonnegative(), completedVisits: z.number().int().nonnegative(),
    cancelledRequests: z.number().int().nonnegative(), noShowRequests: z.number().int().nonnegative(),
    completionRate: z.number().min(0).max(100), quoteConversionRate: z.number().min(0).max(100),
    averageResponseMinutes: z.number().nonnegative().nullable(), repeatCustomers: z.number().int().nonnegative(),
    reviewCount: z.number().int().nonnegative(), averageRating: z.number().min(0).max(5),
    bonusLiabilityPoints: z.number().int().nonnegative(),
    tracking: z.object({ impressions: z.number().int().nonnegative(), profileOpens: z.number().int().nonnegative(), available: z.boolean() }),
    privacy: z.object({ consentRequired: z.boolean(), retentionDays: z.number().int().positive() }),
}).passthrough() satisfies z.ZodType<AutoCareProviderAnalytics>

const ownerAutoCareEvidenceSchema = z.object({
    id: z.string(), providerId: z.string(), kind: z.string(), label: z.string(), status: z.string(),
    reference: z.string().nullable(), notes: z.string().nullable(), expiresAt: z.string().datetime({ offset: true }).nullable(),
    createdAt: z.string().datetime({ offset: true }), verifiedAt: z.string().datetime({ offset: true }).nullable(),
}).passthrough() satisfies z.ZodType<OwnerAutoCareEvidence>

export const ownerAutoCareEvidenceListSchema = z.array(ownerAutoCareEvidenceSchema)

export const autoCareOfferSchema = z.object({
    id: z.string(),
    serviceDefinitionId: z.string(),
    serviceSlug: z.string().optional(),
    serviceLabels: z.record(z.string(), z.string()).optional(),
    description: z.string().nullable().optional(),
    priceFromMinor: z.number().int().nonnegative().max(10_000_000_000),
    priceToMinor: z.number().int().nonnegative().max(10_000_000_000).nullable(),
    currencyCode: z.string().regex(/^[A-Z]{3}$/),
    durationMinutes: z.number().int().nonnegative(),
    inclusions: z.array(z.string()),
    warrantyText: z.string().nullable(),
    active: z.boolean(),
    priceType: z.enum(['fixed', 'from', 'range', 'quote_required']).optional(),
    bookingMode: z.enum(['request', 'instant']).optional(),
    requiredResourceTypes: z.array(z.enum(['specialist', 'bay', 'lift', 'equipment'])).optional(),
    requiredResourceIds: z.array(z.string()).optional(),
}).passthrough().refine((offer) => offer.priceToMinor === null || offer.priceToMinor >= offer.priceFromMinor, {
    message: 'priceToMinor must be greater than or equal to priceFromMinor',
    path: ['priceToMinor'],
}) satisfies z.ZodType<AutoCareApiOffer>

const autoCareLocationSchema = z.object({
    id: z.string(),
    marketId: z.string(),
    zoneId: z.string().nullable().optional(),
    address: z.string(),
    hours: z.string(),
    appointmentCapacity: z.number().int().positive().optional(),
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
})

export const autoCareProviderSchema = z.object({
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
    teamSize: z.enum(['solo', 'small_team', 'team', 'enterprise']).optional(),
    businessType: z.enum(['sole_proprietor', 'self_employed', 'company', 'private_master', 'other']).optional(),
    chatEnabled: z.boolean().optional(),
    communicationMode: z.enum(['online', 'request_then_confirm', 'phone_only']).optional(),
    responseWindowMinutes: z.number().int().nonnegative().nullable().optional(),
    responseHours: z.enum(['working_hours', 'always_on']).optional(),
    phoneBookingEnabled: z.boolean().optional(),
    callbackEnabled: z.boolean().optional(),
    requestPhotosEnabled: z.boolean().optional(),
    publicContactNote: z.string().nullable().optional(),
    warrantyText: z.string().nullable().optional(),
    logoUrl: z.string().nullable(),
    coverImageUrl: z.string().nullable(),
    galleryImageUrls: z.array(z.string()),
    amenityIds: z.array(z.string()),
    brandSpecializations: z.array(z.string()),
    isMultibrand: z.boolean(),
    location: autoCareLocationSchema,
    trustScore: z.number().finite().optional(),
    trustBadge: z.string().nullable().optional(),
    trustReassessedAt: z.string().nullable().optional(),
    offers: z.array(autoCareOfferSchema).optional(),
    locations: z.array(z.object({ location: autoCareLocationSchema, offers: z.array(autoCareOfferSchema) })).optional(),
}).passthrough() satisfies z.ZodType<AutoCareApiProvider>

export const autoCareProviderProfileSchema = autoCareProviderSchema.extend({
    offers: z.array(autoCareOfferSchema),
}).passthrough() satisfies z.ZodType<AutoCareApiProviderProfile>

export const autoCareFavoriteSchema = z.object({
    id: z.string(),
    providerId: z.string(),
    locationId: z.string(),
    createdAt: z.string().datetime({ offset: true }),
    provider: autoCareProviderSchema,
    offer: autoCareOfferSchema.nullable(),
}).passthrough() satisfies z.ZodType<AutoCareFavorite>

export const autoCareFavoritesSchema = z.array(autoCareFavoriteSchema)

export const autoCareDiscoverySchema = z.object({
    items: z.array(z.object({
        provider: autoCareProviderSchema,
        offer: autoCareOfferSchema,
        distanceKm: z.number().finite().nonnegative(),
        nextSlot: z.string().nullable(),
    }).passthrough()),
    nextCursor: z.string().nullable(),
    totalCount: z.number().int().nonnegative(),
    totalCountIsLowerBound: z.boolean(),
}).passthrough() satisfies z.ZodType<AutoCareApiDiscoveryResponse>

export const uploadResponseSchema = z.object({ url: z.string().min(1) }).passthrough()
