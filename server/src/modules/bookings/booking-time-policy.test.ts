import { describe, expect, it } from 'vitest'

import { assertBookingTimeRange } from './booking-time-policy.js'

describe('booking time policy', () => {
    it('returns minute boundaries for a valid range', () => {
        expect(assertBookingTimeRange('09:00', '09:30')).toEqual({
            startMinutes: 540,
            endMinutes: 570,
        })
    })

    it('accepts PostgreSQL time values with zero seconds', () => {
        expect(assertBookingTimeRange('09:00:00', '09:30:00')).toEqual({
            startMinutes: 540,
            endMinutes: 570,
        })
    })

    it('rejects malformed and reversed ranges', () => {
        expect(() => assertBookingTimeRange('9:00', '09:30')).toThrow(/format/)
        expect(() => assertBookingTimeRange('10:00', '09:30')).toThrow(/range/)
        expect(() => assertBookingTimeRange('23:59', '24:00')).toThrow(/range/)
    })
})
