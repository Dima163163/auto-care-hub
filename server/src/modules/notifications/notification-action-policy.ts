export const MAX_NOTIFICATION_MARK_ALL_BATCH = 500
const notificationUuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function getNotificationMarkAllBatchSize() {
    return MAX_NOTIFICATION_MARK_ALL_BATCH
}

export function normalizeNotificationUuid(value: unknown) {
    if (typeof value !== 'string') return null
    const normalized = value.trim().toLowerCase()
    return notificationUuidPattern.test(normalized) ? normalized : null
}
