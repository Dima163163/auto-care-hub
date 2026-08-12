import { z } from 'zod'

import { NotificationCategory } from '../../entities/notification/notification.entity.js'

const booleanQuerySchema = z.preprocess(
    (value) => {
        if (value === 'true') return true
        if (value === 'false') return false
        return value
    },
    z.boolean().optional(),
)

export const notificationsQuerySchema = z.object({
    cursor: z.string().trim().max(512).optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    read: booleanQuerySchema,
    category: z.enum(NotificationCategory).optional(),
})

export type NotificationsQuery = z.infer<typeof notificationsQuerySchema>
