import { normalizeTextWhitespace } from '../../shared/security/string-normalization.js'
import { NotificationCategory } from '../../entities/notification/notification.entity.js'

export const MAX_NOTIFICATION_TITLE_LENGTH = 200
export const MAX_NOTIFICATION_MESSAGE_LENGTH = 2_000

export function assertNotificationCategory(value: string) {
    if (!Object.values(NotificationCategory).includes(value as NotificationCategory)) {
        throw new Error('Notification category is invalid.')
    }
    return value as NotificationCategory
}

export function normalizeNotificationContent(value: string, maxLength: number, field: string) {
    const normalized = normalizeTextWhitespace(value)
        .replace(/\s+/g, ' ')
        .trim()

    if (normalized.length < 1 || normalized.length > maxLength) {
        throw new Error(`Notification ${field} is invalid.`)
    }

    return normalized
}
