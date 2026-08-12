export const NOTIFICATION_TEMPLATE_KEYS = [
    'security.account_locked',
    'security.refresh_token_reuse',
    'security.account_deletion_requested',
    'booking.created.owner',
    'booking.created.client',
    'booking.confirmed.client',
    'booking.cancelled.owner',
    'booking.cancelled.client',
    'booking.status.pending',
    'booking.status.confirmed',
    'booking.status.cancelled',
    'booking.status.completed',
    'booking.reschedule.requested.owner',
    'booking.reschedule.requested.client',
    'booking.reschedule.accepted.client',
    'booking.reschedule.rejected.client',
    'booking.reschedule.accepted.owner',
    'booking.reschedule.rejected.owner',
    'booking.reminder',
    'payment.completed',
    'payment.failed',
    'payment.partially_refunded',
    'payment.refunded',
    'moderation.review_updated',
] as const

export type NotificationTemplateKey = (typeof NOTIFICATION_TEMPLATE_KEYS)[number]

export function isNotificationTemplateKey(value: unknown): value is NotificationTemplateKey {
    return typeof value === 'string'
        && NOTIFICATION_TEMPLATE_KEYS.includes(value as NotificationTemplateKey)
}
