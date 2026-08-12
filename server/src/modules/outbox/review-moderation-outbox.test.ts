import { describe, expect, it } from 'vitest'

import { ReviewStatus } from '../../entities/review/review.entity.js'
import {
    createReviewModerationNotificationPayload,
} from './review-moderation-outbox.js'

const validPayload = {
    userId: '123e4567-e89b-42d3-a456-426614174000',
    reviewId: '223e4567-e89b-42d3-a456-426614174000',
    cabinetId: '323e4567-e89b-42d3-a456-426614174000',
    cabinetTitle: 'Studio One',
    previousStatus: ReviewStatus.Pending,
    status: ReviewStatus.Approved,
}

describe('review moderation outbox payload', () => {
    it('normalizes a valid moderation payload', () => {
        expect(createReviewModerationNotificationPayload(validPayload)).toEqual(validPayload)
    })

    it('rejects oversized titles and malformed identifiers', () => {
        expect(() => createReviewModerationNotificationPayload({
            ...validPayload,
            cabinetTitle: 'x'.repeat(201),
        })).toThrow()
        expect(() => createReviewModerationNotificationPayload({
            ...validPayload,
            reviewId: 'not-a-uuid',
        })).toThrow()
    })
})
