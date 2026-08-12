import { z } from 'zod'

import { ReviewStatus } from '../../entities/review/review.entity.js'

export const reviewModerationNotificationPayloadSchema = z.object({
    userId: z.string().uuid(),
    reviewId: z.string().uuid(),
    cabinetId: z.string().uuid(),
    cabinetTitle: z.string().trim().min(1).max(200),
    previousStatus: z.enum(ReviewStatus),
    status: z.enum(ReviewStatus),
})

export type ReviewModerationNotificationPayload = z.infer<
    typeof reviewModerationNotificationPayloadSchema
>

export function createReviewModerationNotificationPayload(
    input: ReviewModerationNotificationPayload,
) {
    return reviewModerationNotificationPayloadSchema.parse(input)
}
