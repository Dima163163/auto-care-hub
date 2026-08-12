import type { EntityManager } from 'typeorm'

import type { SupportedLocale } from '../../config/i18n.js'
import { NotificationCategory } from '../../entities/notification/notification.entity.js'
import { logError } from '../../shared/observability/logger.js'
import type { NotificationTemplateKey } from '../notifications/notification-templates.js'
import { enqueueNotification } from './notification-outbox.service.js'

export type SecurityNotificationInput =
    | {
        type: 'account_locked'
        userId: string
        lockedUntil: string | null
        locale?: SupportedLocale
    }
    | {
        type: 'refresh_token_reuse'
        userId: string
        sessionId: string
        locale?: SupportedLocale
    }
    | {
        type: 'account_deletion_requested'
        userId: string
        requestId: string
        locale?: SupportedLocale
    }

export function getSecurityNotificationIdempotencyKey(input: SecurityNotificationInput) {
    const discriminator = 'sessionId' in input
        ? input.sessionId
        : 'requestId' in input
            ? input.requestId
            : input.lockedUntil ?? 'unknown'

    return `notification:security:${input.type}:${input.userId}:${discriminator}`
}

function getSecurityNotificationTemplateKey(type: SecurityNotificationInput['type']): NotificationTemplateKey {
    return {
        account_locked: 'security.account_locked',
        refresh_token_reuse: 'security.refresh_token_reuse',
        account_deletion_requested: 'security.account_deletion_requested',
    }[type] as NotificationTemplateKey
}

export async function enqueueSecurityNotification(
    input: SecurityNotificationInput,
    manager?: EntityManager,
) {
    await enqueueNotification({
        userId: input.userId,
        category: NotificationCategory.Security,
        template: {
            key: getSecurityNotificationTemplateKey(input.type),
        },
        metadata: input,
    }, getSecurityNotificationIdempotencyKey(input), manager)
}

export async function enqueueSecurityNotificationSafely(input: SecurityNotificationInput) {
    try {
        await enqueueSecurityNotification(input)
    } catch (error) {
        logError('Failed to enqueue security notification', error, {
            type: input.type,
            userId: input.userId,
        })
    }
}
