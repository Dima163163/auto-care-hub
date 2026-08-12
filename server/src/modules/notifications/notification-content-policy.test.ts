import { describe, expect, it } from 'vitest'

import {
    assertNotificationCategory,
    MAX_NOTIFICATION_MESSAGE_LENGTH,
    MAX_NOTIFICATION_TITLE_LENGTH,
    normalizeNotificationContent,
} from './notification-content-policy.js'

describe('notification content policy', () => {
    it('accepts only known notification categories', () => {
        expect(assertNotificationCategory('booking')).toBe('booking')
        expect(() => assertNotificationCategory('unknown')).toThrow(/category/)
    })

    it('normalizes bounded title and message content', () => {
        expect(normalizeNotificationContent('  Booking\nready  ', MAX_NOTIFICATION_TITLE_LENGTH, 'title'))
            .toBe('Booking ready')
    })

    it('rejects empty and oversized content', () => {
        expect(() => normalizeNotificationContent('', MAX_NOTIFICATION_TITLE_LENGTH, 'title')).toThrow(/title/)
        expect(() => normalizeNotificationContent('x'.repeat(MAX_NOTIFICATION_MESSAGE_LENGTH + 1), MAX_NOTIFICATION_MESSAGE_LENGTH, 'message'))
            .toThrow(/message/)
    })
})
