const NOTIFICATION_PREFERENCE_KEYS = [
    'emailNotifications',
    'bookingEmailNotifications',
] as const

export type NotificationPreferenceMutation = Partial<Record<(typeof NOTIFICATION_PREFERENCE_KEYS)[number], boolean>>

export function assertNotificationPreferenceMutation(input: Record<string, unknown>): NotificationPreferenceMutation {
    const keys = Object.keys(input)
    if (keys.length === 0 || keys.some((key) => !NOTIFICATION_PREFERENCE_KEYS.includes(key as (typeof NOTIFICATION_PREFERENCE_KEYS)[number]))) {
        throw new Error('Notification preference mutation is empty or contains unsupported fields.')
    }

    for (const key of NOTIFICATION_PREFERENCE_KEYS) {
        if (key in input && typeof input[key] !== 'boolean') {
            throw new Error('Notification preference values must be boolean.')
        }
    }

    return input as NotificationPreferenceMutation
}
