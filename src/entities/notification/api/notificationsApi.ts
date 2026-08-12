import { baseApi } from '@/shared/api/baseApi'

import type { Notification, NotificationPage } from '../model/types'
import {
    normalizeMarkAllReadResponse,
    normalizeNotificationPageResponse,
    normalizeNotificationResponse,
    normalizeUnreadCountResponse,
} from '../lib/notification-response-schema'

export type NotificationsQueryArgs = {
    cursor?: string
    limit?: number
}

export type UnreadNotificationsCountResponse = {
    count: number
}

export type MarkAllNotificationsReadResponse = {
    updated: number
}

export const notificationsApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        getNotifications: build.query<NotificationPage, NotificationsQueryArgs | void>({
            query: (args) => {
                const searchParams = new URLSearchParams()
                if (args?.cursor) searchParams.set('cursor', args.cursor)
                if (args?.limit) searchParams.set('limit', String(args.limit))

                const query = searchParams.toString()
                return query ? `/notifications?${query}` : '/notifications'
            },
            transformResponse: normalizeNotificationPageResponse,
            providesTags: (result) =>
                result
                    ? [
                        ...result.items.map((notification) => ({
                            type: 'Notification' as const,
                            id: notification.id,
                        })),
                        {
                            type: 'Notification' as const,
                            id: 'LIST',
                        },
                    ]
                    : [
                        {
                            type: 'Notification' as const,
                            id: 'LIST',
                        },
                    ],
        }),
        getUnreadNotificationsCount: build.query<UnreadNotificationsCountResponse, void>({
            query: () => '/notifications/unread-count',
            transformResponse: normalizeUnreadCountResponse,
            providesTags: [
                {
                    type: 'Notification',
                    id: 'UNREAD_COUNT',
                },
            ],
        }),
        markNotificationRead: build.mutation<Notification, string>({
            query: (id) => ({
                url: `/notifications/${id}/read`,
                method: 'PATCH',
            }),
            transformResponse: normalizeNotificationResponse,
            invalidatesTags: (result, _error, id) => [
                {
                    type: 'Notification',
                    id: 'UNREAD_COUNT',
                },
                {
                    type: 'Notification',
                    id: 'LIST',
                },
                {
                    type: 'Notification',
                    id: result?.id ?? id,
                },
            ],
        }),
        markAllNotificationsRead: build.mutation<MarkAllNotificationsReadResponse, void>({
            query: () => ({
                url: '/notifications/read-all',
                method: 'PATCH',
            }),
            transformResponse: normalizeMarkAllReadResponse,
            invalidatesTags: [
                {
                    type: 'Notification',
                    id: 'UNREAD_COUNT',
                },
                {
                    type: 'Notification',
                    id: 'LIST',
                },
            ],
        }),
    }),
})

export const {
    useGetNotificationsQuery,
    useLazyGetNotificationsQuery,
    useGetUnreadNotificationsCountQuery,
    useMarkAllNotificationsReadMutation,
    useMarkNotificationReadMutation,
} = notificationsApi
