import { z } from 'zod'

import { baseApi } from '@/shared/api/baseApi'

export type PlatformReview = {
    id: string
    authorName: string
    avatarUrl: string | null
    authorRole: string
    rating: number
    text: string
    status: 'pending' | 'approved' | 'rejected' | 'removed'
    organizationResponse: string | null
    organizationRespondedAt: string | null
    createdAt: string
}

export type CreatePlatformReviewInput = { rating: number; text: string }
export type RespondPlatformReviewInput = { reviewId: string; response: string }

const platformReviewSchema = z.object({
    id: z.string(),
    authorName: z.string(),
    avatarUrl: z.string().nullable(),
    authorRole: z.string(),
    rating: z.number().int().min(1).max(5),
    text: z.string(),
    status: z.enum(['pending', 'approved', 'rejected', 'removed']),
    organizationResponse: z.string().nullable(),
    organizationRespondedAt: z.string().datetime({ offset: true }).nullable(),
    createdAt: z.string().datetime({ offset: true }),
}) satisfies z.ZodType<PlatformReview>

const platformReviewsSchema = z.array(platformReviewSchema)

export const platformReviewsApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        getPlatformReviews: build.query<PlatformReview[], number | void>({
            query: (limit = 30) => ({ url: '/v1/platform-reviews', params: { limit } }),
            transformResponse: (value: unknown) => platformReviewsSchema.parse(value),
            providesTags: [{ type: 'PlatformReview', id: 'PUBLIC_LIST' }],
        }),
        createPlatformReview: build.mutation<PlatformReview, CreatePlatformReviewInput>({
            query: (body) => ({ url: '/v1/platform-reviews', method: 'POST', body }),
            transformResponse: (value: unknown) => platformReviewSchema.parse(value),
            invalidatesTags: [{ type: 'PlatformReview', id: 'MY_LIST' }],
        }),
        getMyPlatformReviews: build.query<PlatformReview[], void>({
            query: () => '/v1/platform-reviews/my',
            transformResponse: (value: unknown) => platformReviewsSchema.parse(value),
            providesTags: [{ type: 'PlatformReview', id: 'MY_LIST' }],
        }),
        getAdminPlatformReviews: build.query<PlatformReview[], void>({
            query: () => '/admin/platform-reviews',
            transformResponse: (value: unknown) => platformReviewsSchema.parse(value),
            providesTags: [{ type: 'PlatformReview', id: 'ADMIN_LIST' }],
        }),
        respondToPlatformReview: build.mutation<PlatformReview, RespondPlatformReviewInput>({
            query: ({ reviewId, response }) => ({ url: `/admin/platform-reviews/${reviewId}/response`, method: 'POST', body: { response } }),
            transformResponse: (value: unknown) => platformReviewSchema.parse(value),
            invalidatesTags: [{ type: 'PlatformReview', id: 'ADMIN_LIST' }, { type: 'PlatformReview', id: 'PUBLIC_LIST' }],
        }),
        removePlatformReview: build.mutation<{ success: true }, string>({
            query: (reviewId) => ({ url: `/super-admin/platform-reviews/${reviewId}`, method: 'DELETE' }),
            invalidatesTags: [{ type: 'PlatformReview', id: 'ADMIN_LIST' }, { type: 'PlatformReview', id: 'PUBLIC_LIST' }],
        }),
    }),
})

export const {
    useGetPlatformReviewsQuery,
    useCreatePlatformReviewMutation,
    useGetMyPlatformReviewsQuery,
    useGetAdminPlatformReviewsQuery,
    useRespondToPlatformReviewMutation,
    useRemovePlatformReviewMutation,
} = platformReviewsApi
