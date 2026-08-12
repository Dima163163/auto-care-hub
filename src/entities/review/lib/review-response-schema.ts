import { z } from 'zod'

import type { AdminReview, ClientReview, Review } from '../model/types'

const reviewSchema = z.object({
    id: z.string(),
    cabinetId: z.string(),
    clientId: z.string(),
    rating: z.number().int().min(1).max(5),
    text: z.string(),
    status: z.enum(['pending', 'approved', 'rejected']),
    createdAt: z.string().datetime({ offset: true }),
    client: z.object({
        id: z.string(),
        name: z.string(),
    }),
}) satisfies z.ZodType<Review>

const clientReviewSchema = reviewSchema.extend({
    cabinet: z.object({
        id: z.string(),
        title: z.string(),
    }),
}) satisfies z.ZodType<ClientReview>

const adminReviewSchema = clientReviewSchema.extend({
    bookingId: z.string(),
    updatedAt: z.string().datetime({ offset: true }),
}) satisfies z.ZodType<AdminReview>

const deleteReviewResponseSchema = z.object({
    success: z.literal(true),
})

export function normalizeReviewResponse(value: unknown): Review {
    return reviewSchema.parse(value)
}

export function normalizeReviewListResponse(value: unknown): Review[] {
    return z.array(reviewSchema).parse(value)
}

export function normalizeClientReviewListResponse(value: unknown): ClientReview[] {
    return z.array(clientReviewSchema).parse(value)
}

export function normalizeAdminReviewListResponse(value: unknown): AdminReview[] {
    return z.array(adminReviewSchema).parse(value)
}

export function normalizeAdminReviewResponse(value: unknown): AdminReview {
    return adminReviewSchema.parse(value)
}

export function normalizeDeleteReviewResponse(value: unknown) {
    return deleteReviewResponseSchema.parse(value)
}
