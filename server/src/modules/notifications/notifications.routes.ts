import type { FastifyInstance } from 'fastify'

import { requireAuth } from '../auth/require-auth.js'
import { validateParams, validateQuery } from '../../shared/validation/validate.js'
import { z } from 'zod'
import {
    getUnreadNotificationsCount,
    listNotifications,
    markAllNotificationsAsRead,
    markNotificationAsRead,
} from './notifications.service.js'
import type { Notification } from './notifications.types.js'
import { notificationsQuerySchema } from './notifications.schemas.js'
import { getRequestLocale } from '../../shared/i18n/request-locale.js'

type NotificationsListResponse = Notification[] | { items: Notification[]; nextCursor: string | null }
type UnreadCountResponse = { count: number }
type MarkAllReadResponse = { updated: number }

const notificationParamsSchema = z.object({
    id: z.string().uuid(),
})

export async function notificationsRoutes(app: FastifyInstance) {
    app.get<{ Querystring: unknown; Reply: NotificationsListResponse }>(
        '/notifications',
        async (request) => {
            const user = await requireAuth(request)
            const query = validateQuery(notificationsQuerySchema, request.query)

            return listNotifications(user, query, user.locale ?? getRequestLocale(request))
        }
    )

    app.get<{ Reply: UnreadCountResponse }>(
        '/notifications/unread-count',
        async (request) => {
            const user = await requireAuth(request)
            const count = await getUnreadNotificationsCount(user)

            return { count }
        }
    )

    app.patch<{ Params: unknown; Reply: Notification }>(
        '/notifications/:id/read',
        async (request) => {
            const user = await requireAuth(request)
            const params = validateParams(notificationParamsSchema, request.params)

            return markNotificationAsRead(user, params.id, user.locale ?? getRequestLocale(request))
        }
    )

    app.patch<{ Reply: MarkAllReadResponse }>(
        '/notifications/read-all',
        async (request) => {
            const user = await requireAuth(request)

            return markAllNotificationsAsRead(user)
        }
    )
}
