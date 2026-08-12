import { describe, expect, it } from 'vitest'

import {
    DEFAULT_BOOKING_REMINDER_HOURS,
    getBookingReminderDateRangeDays,
    getBookingReminderWindowMs,
    MAX_BOOKING_REMINDER_HOURS,
    normalizeBookingReminderHours,
} from './booking-reminder-policy.js'

describe('booking reminder policy', () => {
    it('keeps the default reminder window at 24 hours', () => {
        expect(normalizeBookingReminderHours(DEFAULT_BOOKING_REMINDER_HOURS)).toBe(24)
        expect(getBookingReminderWindowMs(DEFAULT_BOOKING_REMINDER_HOURS)).toBe(24 * 60 * 60 * 1000)
        expect(getBookingReminderDateRangeDays(DEFAULT_BOOKING_REMINDER_HOURS)).toBe(2)
    })

    it('expands the candidate date range for a longer configured window', () => {
        expect(getBookingReminderDateRangeDays(25)).toBe(3)
        expect(getBookingReminderDateRangeDays(MAX_BOOKING_REMINDER_HOURS)).toBe(8)
    })

    it('rejects zero, fractional, and over-bounded windows', () => {
        for (const value of [0, 1.5, MAX_BOOKING_REMINDER_HOURS + 1]) {
            expect(() => normalizeBookingReminderHours(value)).toThrow(/between 1 and 168/)
        }
    })
})
