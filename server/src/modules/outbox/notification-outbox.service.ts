import type { EntityManager } from 'typeorm'

import type { SupportedLocale } from '../../config/i18n.js'
import { AppDataSource } from '../../database/data-source.js'
import { UserEntity } from '../../entities/user/user.entity.js'
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
    locale?: SupportedLocale
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
    const locale = input.locale ?? await resolveNotificationLocale(input.userId, manager)
    const renderedTemplate = input.template
        ? renderNotificationTemplate(
            input.template.key,
            input.template.params,
            locale,
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
                        templateLocale: locale,
                    }
                    : {}),
            },
        },
    }, manager)
}

async function resolveNotificationLocale(
    userId: string,
    manager?: EntityManager,
): Promise<SupportedLocale | undefined> {
    const repository = (manager ?? AppDataSource.manager).getRepository(UserEntity)
    const user = await repository.findOne({
        where: { id: userId },
        select: { locale: true },
    })

    return user?.locale ?? undefined
}
