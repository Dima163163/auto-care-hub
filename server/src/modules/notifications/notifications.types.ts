import type { NotificationCategory } from '../../entities/notification/notification.entity.js'

export type Notification = {
    id: string
    category: NotificationCategory
    title: string
    message: string
    link: string | null
    metadata: Record<string, unknown>
    readAt: string | null
    createdAt: string
}
