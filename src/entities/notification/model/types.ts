import type { EntityId, ISODateString } from '@/shared/types/common'

export type NotificationCategory =
    | 'booking'
    | 'moderation'
    | 'account'
    | 'security'

export type Notification = {
    id: EntityId
    category: NotificationCategory
    title: string
    message: string
    link: string | null
    metadata: Record<string, unknown>
    readAt: ISODateString | null
    createdAt: ISODateString
}

export type NotificationPage = {
    items: Notification[]
    nextCursor: string | null
}
