import { z } from 'zod'

import { ReviewStatus } from '../../entities/review/review.entity.js'

export const reviewParamsSchema = z.object({
    id: z.string().uuid('Review id must be a valid UUID.'),
})

export const cabinetReviewParamsSchema = z.object({
    id: z.string().uuid('Cabinet id must be a valid UUID.'),
})

export const createReviewSchema = z.object({
    rating: z
        .number()
        .int('Rating must be an integer.')
        .min(1, 'Rating must be at least 1.')
        .max(5, 'Rating must be at most 5.'),
    text: z
        .string()
        .trim()
        .min(10, 'Review text must contain at least 10 characters.')
        .max(1000, 'Review text must contain at most 1000 characters.'),
})

export const updateReviewStatusSchema = z.object({
    status: z.enum(ReviewStatus),
})
