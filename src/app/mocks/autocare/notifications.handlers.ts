import { http, HttpResponse } from "msw"
import type { Notification } from "@/entities/notification/model/types"
import { mockSession } from ".././session"
import { mockNotifications } from './mock-fixtures'

export const notificationsHandlers = [
{ order: 19, handler: http.get('/api/notifications', ({ request }) => {
        if (!mockSession.currentUserId) {
            return HttpResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            )
        }

        const url = new URL(request.url)
        const userNotifications = mockNotifications.filter(
            (notification) =>
                (notification as Notification & { userId: string }).userId === mockSession.currentUserId
        )
        const limit = Number(url.searchParams.get('limit'))

        if (!Number.isInteger(limit) || limit <= 0) {
            return HttpResponse.json(userNotifications)
        }

        const offset = Number(url.searchParams.get('cursor') ?? '0')
        const items = userNotifications.slice(offset, offset + limit)
        const nextOffset = offset + items.length

        return HttpResponse.json({
            items,
            nextCursor: nextOffset < userNotifications.length ? String(nextOffset) : null,
        })
    }) },
{ order: 20, handler: http.get('/api/notifications/unread-count', () => {
        if (!mockSession.currentUserId) {
            return HttpResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            )
        }

        return HttpResponse.json({
            count: mockNotifications.filter(
                (notification) =>
                    (notification as Notification & { userId: string }).userId === mockSession.currentUserId &&
                    !notification.readAt
            ).length,
        })
    }) },
{ order: 21, handler: http.patch('/api/notifications/:id/read', ({ params }) => {
        if (!mockSession.currentUserId) {
            return HttpResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            )
        }

        const notification = mockNotifications.find(
            (item) =>
                item.id === String(params.id) &&
                (item as Notification & { userId: string }).userId === mockSession.currentUserId
        )

        if (!notification) {
            return HttpResponse.json(
                { message: 'Notification not found' },
                { status: 404 }
            )
        }

        notification.readAt ??= new Date().toISOString()

        return HttpResponse.json(notification)
    }) },
{ order: 22, handler: http.patch('/api/notifications/read-all', () => {
        if (!mockSession.currentUserId) {
            return HttpResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            )
        }

        let updated = 0
        mockNotifications.forEach((notification) => {
            if (
                (notification as Notification & { userId: string }).userId === mockSession.currentUserId &&
                !notification.readAt
            ) {
                notification.readAt = new Date().toISOString()
                updated += 1
            }
        })

        return HttpResponse.json({ updated })
    }) }
]
