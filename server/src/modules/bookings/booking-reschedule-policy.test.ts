import { describe, expect, it } from 'vitest'

import { assertBookingRescheduleDecision } from './booking-reschedule-policy.js'

describe('booking reschedule decision policy', () => {
    it('accepts only explicit decisions', () => {
        expect(assertBookingRescheduleDecision('accepted')).toBe('accepted')
        expect(assertBookingRescheduleDecision('rejected')).toBe('rejected')
        expect(() => assertBookingRescheduleDecision('anything-else')).toThrow(/invalid/)
    })
})
