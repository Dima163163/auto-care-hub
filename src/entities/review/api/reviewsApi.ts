import { baseApi } from '@/shared/api/baseApi'
import type { EntityId } from '@/shared/types/common'
import { getCabinetReviewInvalidationTags } from '@/shared/api/cache-tags'

import type {
    AdminReview,
    ClientReview,
    Review,
    ReviewStatus,
} from '../model/types'
import {
    normalizeAdminReviewListResponse,
    normalizeAdminReviewResponse,
    normalizeClientReviewListResponse,
    normalizeDeleteReviewResponse,
    normalizeReviewListResponse,
    normalizeReviewResponse,
} from '../lib/review-response-schema'

type CreateCabinetReviewRequest = {
    cabinetId: EntityId
    rating: number
    text: string
}

type UpdateClientReviewRequest = CreateCabinetReviewRequest & {
    id: EntityId
}

type UpdateAdminReviewStatusRequest = {
    id: EntityId
    status: ReviewStatus
}

type DeleteAdminReviewRequest = {
    id: EntityId
    cabinetId: EntityId
}

export const reviewsApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        getCabinetReviews: build.query<Review[], EntityId>({
            query: (cabinetId) => `/cabinets/${cabinetId}/reviews`,
            transformResponse: normalizeReviewListResponse,
            providesTags: (result, _error, cabinetId) =>
                result
                    ? [
                        ...result.map((review) => ({
                            type: 'Review' as const,
                            id: review.id,
                        })),
                        {
                            type: 'Review' as const,
                            id: `CABINET-${cabinetId}`,
                        },
                    ]
                    : [
                        {
                            type: 'Review' as const,
                            id: `CABINET-${cabinetId}`,
                        },
                    ],
        }),
        getMyReviews: build.query<ClientReview[], void>({
            query: () => '/reviews/my',
            transformResponse: normalizeClientReviewListResponse,
            providesTags: (result) =>
                result
                    ? [
                        ...result.map((review) => ({
                            type: 'Review' as const,
                            id: review.id,
                        })),
                        {
                            type: 'Review' as const,
                            id: 'MY_LIST',
                        },
                    ]
                    : [
                        {
                            type: 'Review' as const,
                            id: 'MY_LIST',
                        },
                    ],
        }),
        createCabinetReview: build.mutation<Review, CreateCabinetReviewRequest>({
            query: ({ cabinetId, ...body }) => ({
                url: `/cabinets/${cabinetId}/reviews`,
                method: 'POST',
                body,
            }),
            transformResponse: normalizeReviewResponse,
            invalidatesTags: (_result, _error, { cabinetId }) => [
                {
                    type: 'Review',
                    id: `CABINET-${cabinetId}`,
                },
                {
                    type: 'Review',
                    id: 'ADMIN_LIST',
                },
                {
                    type: 'Review',
                    id: `MY-CABINET-${cabinetId}`,
                },
                {
                    type: 'Booking',
                    id: 'MY_LIST',
                },
                {
                    type: 'Review',
                    id: 'MY_LIST',
                },
                ...getCabinetReviewInvalidationTags(cabinetId),
            ],
        }),
        updateClientReview: build.mutation<Review, UpdateClientReviewRequest>({
            query: ({ id, cabinetId: _cabinetId, ...body }) => ({
                url: `/reviews/${id}`,
                method: 'PATCH',
                body,
            }),
            transformResponse: normalizeReviewResponse,
            invalidatesTags: (_result, _error, { cabinetId, id }) => [
                {
                    type: 'Review',
                    id,
                },
                {
                    type: 'Review',
                    id: `CABINET-${cabinetId}`,
                },
                {
                    type: 'Review',
                    id: `MY-CABINET-${cabinetId}`,
                },
                {
                    type: 'Review',
                    id: 'ADMIN_LIST',
                },
                {
                    type: 'Review',
                    id: 'MY_LIST',
                },
                ...getCabinetReviewInvalidationTags(cabinetId),
            ],
        }),
        getAdminReviews: build.query<AdminReview[], void>({
            query: () => '/admin/reviews',
            transformResponse: normalizeAdminReviewListResponse,
            providesTags: (result) =>
                result
                    ? [
                        ...result.map((review) => ({
                            type: 'Review' as const,
                            id: review.id,
                        })),
                        {
                            type: 'Review' as const,
                            id: 'ADMIN_LIST',
                        },
                    ]
                    : [
                        {
                            type: 'Review' as const,
                            id: 'ADMIN_LIST',
                        },
                    ],
        }),
        updateAdminReviewStatus: build.mutation<
            AdminReview,
            UpdateAdminReviewStatusRequest
        >({
            query: ({ id, status }) => ({
                url: `/admin/reviews/${id}/status`,
                method: 'PATCH',
                body: {
                    status,
                },
            }),
            transformResponse: normalizeAdminReviewResponse,
            invalidatesTags: (result, _error, { id }) => [
                {
                    type: 'Review' as const,
                    id,
                },
                {
                    type: 'Review' as const,
                    id: 'ADMIN_LIST',
                },
                ...(result
                    ? [
                        {
                            type: 'Review' as const,
                            id: `CABINET-${result.cabinetId}`,
                        },
                        ...getCabinetReviewInvalidationTags(result.cabinetId),
                    ]
                    : []),
                'AuditLogs',
            ],
        }),
        deleteAdminReview: build.mutation<
            { success: true },
            DeleteAdminReviewRequest
        >({
            query: ({ id }) => ({
                url: `/admin/reviews/${id}`,
                method: 'DELETE',
            }),
            transformResponse: normalizeDeleteReviewResponse,
            invalidatesTags: (_result, _error, { cabinetId, id }) => [
                {
                    type: 'Review',
                    id,
                },
                {
                    type: 'Review',
                    id: 'ADMIN_LIST',
                },
                {
                    type: 'Review',
                    id: `CABINET-${cabinetId}`,
                },
                {
                    type: 'Review',
                    id: `MY-CABINET-${cabinetId}`,
                },
                ...getCabinetReviewInvalidationTags(cabinetId),
                'AuditLogs',
            ],
        }),
    }),
})

export const {
    useCreateCabinetReviewMutation,
    useDeleteAdminReviewMutation,
    useGetAdminReviewsQuery,
    useGetCabinetReviewsQuery,
    useGetMyReviewsQuery,
    useUpdateClientReviewMutation,
    useUpdateAdminReviewStatusMutation,
} = reviewsApi
