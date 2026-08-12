import type { UserEntity } from '../../entities/user/user.entity.js'
import { NotificationCategory } from '../../entities/notification/notification.entity.js'

export type NotificationChannel = 'in_app' | 'email'

type NotificationPreferenceUser = Pick<
    UserEntity,
    'emailNotifications' | 'bookingEmailNotifications'
>

export function shouldDeliverNotification(
    category: NotificationCategory,
    user: NotificationPreferenceUser,
    channel: NotificationChannel,
) {
    if (channel === 'in_app') return true
    if (!user.emailNotifications) return false
    if (category === NotificationCategory.Booking) {
        return user.bookingEmailNotifications !== false
    }

    return true
}
