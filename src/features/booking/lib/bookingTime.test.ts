import { describe, expect, it } from 'vitest'

import {
    generateTimeSlots,
    normalizeBookingTime,
    timeSlotsOverlap,
} from './bookingTime'

describe('booking time helpers', () => {
    it('normalizes database time values with seconds', () => {
        expect(normalizeBookingTime('10:30:00')).toBe('10:30')
        expect(normalizeBookingTime('10:30')).toBe('10:30')
    })

    it('detects overlapping slots and allows touching boundaries', () => {
        expect(
            timeSlotsOverlap(
                { start: '10:00', end: '11:00' },
                { start: '10:30:00', end: '11:30:00' },
            ),
        ).toBe(true)
        expect(
            timeSlotsOverlap(
                { start: '11:00', end: '12:00' },
                { start: '10:00:00', end: '11:00:00' },
            ),
        ).toBe(false)
    })

    it('does not generate past slots for today', () => {
        const slots = generateTimeSlots(
            '2026-06-14',
            60,
            8,
            12,
            new Date('2026-06-14T09:15:00'),
        )

        expect(slots[0]).toEqual({
            start: '09:30',
            end: '10:30',
        })
    })

    it('generates the full working day for a future date', () => {
        const slots = generateTimeSlots(
            '2026-06-15',
            60,
            8,
            10,
            new Date('2026-06-14T09:15:00'),
        )

        expect(slots).toEqual([
            { start: '08:00', end: '09:00' },
            { start: '08:30', end: '09:30' },
            { start: '09:00', end: '10:00' },
        ])
    })
})
