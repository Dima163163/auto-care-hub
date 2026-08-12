import { z } from 'zod'

import type { Notification, NotificationPage } from '../model/types'

const notificationLinkSchema = z.preprocess(
    (value) => typeof value === 'string' && value.trim() === '' ? null : value,
    z.union([
        z.string()
            .transform((value) => value.trim())
            .refine((value) => (
                value.length <= 2_048 &&
                value.startsWith('/') &&
                !value.startsWith('//') &&
                !value.includes('\\')
            ), 'Notification link must be an internal path.'),
        z.null(),
    ]),
)

const notificationSchema = z.object({
    id: z.string(),
    category: z.enum(['booking', 'moderation', 'subscription', 'account', 'security']),
    title: z.string(),
    message: z.string(),
    link: notificationLinkSchema,
    metadata: z.record(z.string(), z.unknown()),
    readAt: z.string().datetime({ offset: true }).nullable(),
    createdAt: z.string().datetime({ offset: true }),
}) satisfies z.ZodType<Notification>

const notificationPageSchema = z.object({
    items: z.array(notificationSchema),
    nextCursor: z.string().nullable(),
}) satisfies z.ZodType<NotificationPage>

const unreadCountSchema = z.object({
    count: z.number().int().nonnegative(),
})

const markAllReadSchema = z.object({
    updated: z.number().int().nonnegative(),
})

export function normalizeNotificationPageResponse(value: unknown): NotificationPage {
    return Array.isArray(value)
        ? { items: z.array(notificationSchema).parse(value), nextCursor: null }
        : notificationPageSchema.parse(value)
}

export function normalizeNotificationResponse(value: unknown): Notification {
    return notificationSchema.parse(value)
}

export function normalizeUnreadCountResponse(value: unknown) {
    return unreadCountSchema.parse(value)
}

export function normalizeMarkAllReadResponse(value: unknown) {
    return markAllReadSchema.parse(value)
}
