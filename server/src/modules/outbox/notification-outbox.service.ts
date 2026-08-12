import type { EntityManager } from 'typeorm'

import type { NotificationCategory } from '../../entities/notification/notification.entity.js'
import { logError } from '../../shared/observability/logger.js'
import {
    renderNotificationTemplate,
    type NotificationTemplateParams,
} from '../notifications/notification-renderer.js'
import type { NotificationTemplateKey } from '../notifications/notification-templates.js'
import { enqueueOutboxEvent } from './outbox.service.js'

type EnqueueNotificationInput = {
    userId: string
    category: NotificationCategory
    title?: string
    message?: string
    template?: {
        key: NotificationTemplateKey
        params?: NotificationTemplateParams
    }
    link?: string | null
    metadata?: Record<string, unknown>
}

export async function enqueueNotificationSafely(
    input: EnqueueNotificationInput,
    idempotencyKey: string,
    manager?: EntityManager,
) {
    try {
        await enqueueNotification(input, idempotencyKey, manager)
    } catch (error) {
        logError('Failed to enqueue notification', error, {
            category: input.category,
            userId: input.userId,
        })
    }
}

export async function enqueueNotification(
    input: EnqueueNotificationInput,
    idempotencyKey: string,
    manager?: EntityManager,
) {
    const renderedTemplate = input.template
        ? renderNotificationTemplate(
            input.template.key,
            input.template.params,
        )
        : undefined
    const title = input.title ?? renderedTemplate?.title
    const message = input.message ?? renderedTemplate?.message

    if (!title || !message) {
        throw new Error('Notification content or template is required.')
    }

    await enqueueOutboxEvent({
        type: 'notification.create',
        idempotencyKey,
        payload: {
            userId: input.userId,
            category: input.category,
            title,
            message,
            link: input.link ?? renderedTemplate?.link ?? null,
            metadata: {
                ...(input.metadata ?? {}),
                ...(input.template
                    ? {
                        templateKey: input.template.key,
                        templateParams: input.template.params ?? {},
                    }
                    : {}),
            },
        },
    }, manager)
}
