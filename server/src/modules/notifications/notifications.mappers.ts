import type { NotificationEntity } from '../../entities/notification/notification.entity.js'
import type { SupportedLocale } from '../../config/i18n.js'
import type { Notification } from './notifications.types.js'
import {
    readNotificationTemplateMetadata,
    renderNotificationTemplate,
} from './notification-renderer.js'

export function toNotification(
    entity: NotificationEntity,
    locale: SupportedLocale = 'en',
): Notification {
    const template = readNotificationTemplateMetadata(entity.metadata)
    const rendered = template
        ? renderNotificationTemplate(template.key, template.params, locale)
        : null

    return {
        id: entity.id,
        category: entity.category,
        title: rendered?.title ?? entity.title,
        message: rendered?.message ?? entity.message,
        link: rendered?.link ?? entity.link,
        metadata: entity.metadata,
        readAt: entity.readAt?.toISOString() ?? null,
        createdAt: entity.createdAt.toISOString(),
    }
}
