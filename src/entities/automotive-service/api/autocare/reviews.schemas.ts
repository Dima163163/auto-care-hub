import { z } from 'zod'
import type { AdminAutoCareReview, AutoCareApiProviderReviews, AutoCareApiReview, AutoCareCommunityProfile, AutoCareReviewPromo, OwnerAutoCareReviews, PublicAutoCareCommunityProfile } from './reviews.types'

export const featuredReviewSchema = z.object({
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
    providerName: z.string().optional(),
    communityProfile: z.object({
        profileId: z.string().uuid(),
        badgeCodes: z.array(z.enum(['verified_client', 'regular_client', 'helpful_reviewer', 'autocare_expert'])),
    }).nullable().optional(),
    helpfulCount: z.number().int().nonnegative().optional(),
}) satisfies z.ZodType<AutoCareApiReview>

const autoCareCommunityMetricsSchema = z.object({
    confirmedVisits: z.number().int().nonnegative(),
    publishedReviews: z.number().int().nonnegative(),
    helpfulVoters: z.number().int().nonnegative(),
})

const autoCareCommunityBadgesSchema = z.array(z.enum(['verified_client', 'regular_client', 'helpful_reviewer', 'autocare_expert']))

export const autoCareCommunityProfileSchema = z.object({
    enabled: z.boolean(), displayName: z.string().nullable(), publicProfileId: z.string().uuid().nullable(),
    profileUrl: z.string().nullable(), badgeCodes: autoCareCommunityBadgesSchema, metrics: autoCareCommunityMetricsSchema,
}) satisfies z.ZodType<AutoCareCommunityProfile>

export const publicAutoCareCommunityProfileSchema = z.object({
    profileId: z.string().uuid(), displayName: z.string(), avatarUrl: z.string().nullable(),
    badgeCodes: autoCareCommunityBadgesSchema, metrics: autoCareCommunityMetricsSchema,
}) satisfies z.ZodType<PublicAutoCareCommunityProfile>

export const adminAutoCareReviewSchema = featuredReviewSchema.extend({
    providerName: z.string(),
    status: z.enum(['pending', 'approved', 'rejected']),
}) satisfies z.ZodType<AdminAutoCareReview>

export const reviewPromoSchema = z.object({
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

export const ownerProviderReviewsSchema = z.object({
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

export const ownerAutoCareReviewsSchema = z.object({
    selectedProviderId: z.string().nullable(),
    providers: z.array(z.object({ id: z.string(), name: z.string(), address: z.string(), rating: z.number().min(0).max(5), reviewCount: z.number().int().nonnegative() })),
    totalReviews: z.number().int().nonnegative(),
    averageRating: z.number().min(0).max(5),
    distribution: ownerProviderReviewsSchema.shape.distribution,
    reviews: z.array(featuredReviewSchema.extend({ providerName: z.string(), providerAddress: z.string() })),
}) satisfies z.ZodType<OwnerAutoCareReviews>
