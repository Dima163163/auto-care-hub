export const OUTBOX_EVENT_TYPES = [
    'booking.reminder',
    'notification.create',
    'email.send',
] as const

export type OutboxEventType = (typeof OUTBOX_EVENT_TYPES)[number]

export function isSupportedOutboxEventType(value: unknown): value is OutboxEventType {
    return typeof value === 'string' && OUTBOX_EVENT_TYPES.includes(value as OutboxEventType)
}

export function assertSupportedOutboxEventType(value: unknown): asserts value is OutboxEventType {
    if (!isSupportedOutboxEventType(value)) throw new Error('Unsupported outbox event type.')
}
