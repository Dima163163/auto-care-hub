import { z } from 'zod'

export const platformReviewsQuerySchema = z.object({
    limit: z.coerce.number().int().positive().max(50).default(30),
})

export const platformReviewParamsSchema = z.object({
    reviewId: z.string().uuid(),
})

export const createPlatformReviewSchema = z.object({
    rating: z.number().int().min(1).max(5),
    text: z.string().trim().min(10).max(1_000),
})

export const respondPlatformReviewSchema = z.object({
    response: z.string().trim().min(5).max(2_000),
})
