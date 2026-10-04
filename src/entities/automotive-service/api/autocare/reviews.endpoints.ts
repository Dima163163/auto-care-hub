import { z } from 'zod'
import { adminAutoCareReviewSchema, autoCareCommunityProfileSchema, featuredReviewSchema, ownerAutoCareReviewsSchema, ownerProviderReviewsSchema, publicAutoCareCommunityProfileSchema, reviewPromoSchema } from './reviews.schemas'
import type { AdminAutoCareReview, AutoCareApiProviderReviews, AutoCareApiReview, AutoCareCommunityProfile, AutoCareReviewPromo, CreateAutoCareReviewInput, IssueAutoCareReviewPromoInput, OwnerAutoCareReviews, PublicAutoCareCommunityProfile, RedeemAutoCareReviewPromoInput, UpdateAdminAutoCareReviewStatusInput, UpdateAutoCareReviewInput } from './reviews.types'
import type { AutoCareEndpointBuilder } from './endpoint-builder'

export function createReviewsEndpoints(build: AutoCareEndpointBuilder) {
    return {
getFeaturedAutoCareReviews: build.query<AutoCareApiReview[], number | void>({
            query: (limit = 6) => ({ url: '/v1/reviews/featured', params: { limit } }),
            transformResponse: (value: unknown) => z.array(featuredReviewSchema).parse(value),
            providesTags: [{ type: 'AutoCareReview', id: 'FEATURED' }],
        }),
getAdminAutoCareReviews: build.query<AdminAutoCareReview[], void>({
            query: () => '/admin/autocare-reviews',
            transformResponse: (value: unknown) => z.array(adminAutoCareReviewSchema).parse(value),
            providesTags: (result) => result
                ? [
                    ...result.map((review) => ({ type: 'AutoCareReview' as const, id: review.id })),
                    { type: 'AutoCareReview' as const, id: 'ADMIN_LIST' },
                ]
                : [{ type: 'AutoCareReview' as const, id: 'ADMIN_LIST' }],
        }),
updateAdminAutoCareReviewStatus: build.mutation<AdminAutoCareReview, UpdateAdminAutoCareReviewStatusInput>({
            query: ({ reviewId, ...body }) => ({ url: `/admin/autocare-reviews/${encodeURIComponent(reviewId)}/status`, method: 'PATCH', body }),
            transformResponse: (value: unknown) => adminAutoCareReviewSchema.parse(value),
            invalidatesTags: (result, _error, { reviewId }) => [
                { type: 'AutoCareReview' as const, id: reviewId },
                { type: 'AutoCareReview' as const, id: 'ADMIN_LIST' },
                { type: 'AutoCareReview' as const, id: 'FEATURED' },
                ...(result ? [{ type: 'AutoCareReview' as const, id: `PUBLIC_${result.providerId}` }] : []),
                'AuditLogs',
            ],
        }),
getAutoCareProviderReviews: build.query<AutoCareApiProviderReviews, { providerId: string; limit?: number }>({
            query: ({ providerId, limit = 20 }) => ({ url: `/v1/providers/${encodeURIComponent(providerId)}/reviews`, params: { limit } }),
            transformResponse: (value: unknown) => ownerProviderReviewsSchema.parse(value),
            providesTags: (_result, _error, { providerId }) => [{ type: 'AutoCareReview', id: `PUBLIC_${providerId}` }],
        }),
getMyAutoCareCommunityProfile: build.query<AutoCareCommunityProfile, void>({
            query: () => '/users/me/community-profile',
            transformResponse: (value: unknown) => autoCareCommunityProfileSchema.parse(value),
            providesTags: [{ type: 'AutoCareCommunity', id: 'MY_PROFILE' }],
        }),
updateMyAutoCareCommunityProfile: build.mutation<AutoCareCommunityProfile, { enabled?: boolean; displayName?: string | null }>({
            query: (body) => ({ url: '/users/me/community-profile', method: 'PATCH', body }),
            transformResponse: (value: unknown) => autoCareCommunityProfileSchema.parse(value),
            invalidatesTags: (_result) => [{ type: 'AutoCareCommunity', id: 'MY_PROFILE' }, { type: 'AutoCareCommunity', id: 'PUBLIC_PROFILE' }],
        }),
getPublicAutoCareCommunityProfile: build.query<PublicAutoCareCommunityProfile, string>({
            query: (profileId) => `/v1/community/clients/${encodeURIComponent(profileId)}`,
            transformResponse: (value: unknown) => publicAutoCareCommunityProfileSchema.parse(value),
            providesTags: (_result, _error, profileId) => [
                { type: 'AutoCareCommunity', id: 'PUBLIC_PROFILE' },
                { type: 'AutoCareCommunity', id: `PUBLIC_${profileId}` },
            ],
        }),
getMyAutoCareHelpfulReviewIds: build.query<{ reviewIds: string[]; ownReviewIds: string[] }, string>({
            query: (providerId) => ({ url: '/v1/autocare-reviews/helpful/my', params: { providerId } }),
            transformResponse: (value: unknown) => z.object({ reviewIds: z.array(z.string().min(1)), ownReviewIds: z.array(z.string().min(1)) }).parse(value),
            providesTags: (_result, _error, providerId) => [{ type: 'AutoCareCommunity', id: `VOTES_${providerId}` }],
        }),
voteAutoCareReviewHelpful: build.mutation<{ reviewId: string; providerId: string; helpfulCount: number; voted: boolean }, { reviewId: string; providerId: string; voted: boolean }>({
            query: ({ reviewId, voted }) => ({ url: `/v1/autocare-reviews/${encodeURIComponent(reviewId)}/helpful`, method: voted ? 'PUT' : 'DELETE' }),
            transformResponse: (value: unknown) => z.object({ reviewId: z.string().min(1), providerId: z.string().min(1), helpfulCount: z.number().int().nonnegative(), voted: z.boolean() }).parse(value),
            invalidatesTags: (result) => result ? [{ type: 'AutoCareReview', id: `PUBLIC_${result.providerId}` }, { type: 'AutoCareCommunity', id: `VOTES_${result.providerId}` }] : [],
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
        })
    }
}
