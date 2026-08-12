import type { UserEntity } from '../../entities/user/user.entity.js'
import { NotificationCategory } from '../../entities/notification/notification.entity.js'
import { shouldDeliverNotification } from '../notifications/notification-preferences.js'

export function shouldSendBookingEmail(
    user: Pick<UserEntity, 'emailNotifications' | 'bookingEmailNotifications'>,
) {
    return shouldDeliverNotification(NotificationCategory.Booking, user, 'email')
}
