export const DEFAULT_NOTIFICATION_RETENTION_DAYS = 180
export const MAX_NOTIFICATION_RETENTION_DAYS = 730

export function getNotificationRetentionCutoff(
    now = new Date(),
    retentionDays = DEFAULT_NOTIFICATION_RETENTION_DAYS,
) {
    if (!Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > MAX_NOTIFICATION_RETENTION_DAYS) {
        throw new Error('Notification retention days are outside accepted bounds.')
    }

    return new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000)
}

export function isNotificationOlderThan(
    createdAt: Date,
    cutoff: Date,
) {
    return createdAt.getTime() < cutoff.getTime()
}
