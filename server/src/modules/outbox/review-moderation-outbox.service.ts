import type { EntityManager } from 'typeorm'

import { NotificationCategory } from '../../entities/notification/notification.entity.js'
import { logError } from '../../shared/observability/logger.js'
import { enqueueNotification } from './notification-outbox.service.js'
import {
    createReviewModerationNotificationPayload,
    type ReviewModerationNotificationPayload,
} from './review-moderation-outbox.js'

export async function enqueueReviewModerationNotification(
    input: ReviewModerationNotificationPayload,
    manager?: EntityManager,
) {
    const payload = createReviewModerationNotificationPayload(input)

    await enqueueNotification({
        userId: payload.userId,
        category: NotificationCategory.Moderation,
        template: {
            key: 'moderation.review_updated',
            params: {
                cabinetTitle: payload.cabinetTitle,
                status: payload.status,
            },
        },
        metadata: {
            reviewId: payload.reviewId,
            cabinetId: payload.cabinetId,
            previousStatus: payload.previousStatus,
            status: payload.status,
        },
    }, `notification:review-moderation:${payload.reviewId}:${payload.status}`, manager)
}

export async function enqueueReviewModerationNotificationSafely(
    input: ReviewModerationNotificationPayload,
) {
    try {
        await enqueueReviewModerationNotification(input)
    } catch (error) {
        logError('Failed to enqueue review moderation notification', error, {
            reviewId: input.reviewId,
            status: input.status,
        })
    }
}
