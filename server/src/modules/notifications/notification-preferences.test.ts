import { describe, expect, it } from 'vitest'

import { NotificationCategory } from '../../entities/notification/notification.entity.js'
import { shouldDeliverNotification } from './notification-preferences.js'

describe('notification delivery preferences', () => {
    it('always keeps in-app security notifications enabled', () => {
        expect(shouldDeliverNotification(
            NotificationCategory.Security,
            { emailNotifications: false, bookingEmailNotifications: false },
            'in_app',
        )).toBe(true)
    })

    it('applies the master and booking-specific email switches', () => {
        const user = { emailNotifications: true, bookingEmailNotifications: false }
        expect(shouldDeliverNotification(NotificationCategory.Booking, user, 'email')).toBe(false)
        expect(shouldDeliverNotification(NotificationCategory.Security, user, 'email')).toBe(true)
        expect(shouldDeliverNotification(NotificationCategory.Booking, { ...user, emailNotifications: false }, 'email')).toBe(false)
    })
})
