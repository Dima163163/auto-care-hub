import type { Notification } from "@/entities/notification/model/types"
import { mockNotifications } from './mock-fixtures'

export function pushMockAutoCareNotification(input: { userId: string; requestId: string; title: string; message: string; role: 'client' | 'owner' }) {
    mockNotifications.unshift({
        id: `notification-autocare-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        category: 'booking',
        title: input.title,
        message: input.message,
        link: input.role === 'owner' ? `/owner/autocare-requests?request=${input.requestId}` : `/profile/bookings?request=${input.requestId}`,
        metadata: { serviceRequestId: input.requestId, domain: 'autocare' },
        readAt: null,
        createdAt: new Date().toISOString(),
        userId: input.userId,
    } as Notification & { userId: string })
}

export function addMockNotification(input: Omit<Notification, 'id' | 'createdAt' | 'readAt'> & { userId: string }) {
    mockNotifications.unshift({
        ...input,
        id: `notification-${Date.now()}-${mockNotifications.length + 1}`,
        readAt: null,
        createdAt: new Date().toISOString(),
    } as Notification & { userId: string })
}
