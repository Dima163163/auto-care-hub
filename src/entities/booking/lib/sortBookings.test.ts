import { describe, expect, it } from 'vitest'

import type { Booking } from '../model/types'
import {
    getBookingDateTime,
    sortBookingsByDateAsc,
    sortBookingsByDateDesc,
} from './sortBookings'

const createBooking = (
    id: string,
    date: string,
    startTime: string,
): Booking => ({
    id,
    clientId: 'client-1',
    cabinetId: 'cabinet-1',
    serviceId: 'service-1',
    date,
    startTime,
    endTime: '11:00',
    status: 'pending',
    createdAt: '2026-05-23T08:00:00.000Z',
})

describe('sortBookings', () => {
    it('returns positive infinity for invalid date payloads', () => {
        expect(
            getBookingDateTime(createBooking('invalid', 'not-a-date', '10:00')),
        ).toBe(Number.POSITIVE_INFINITY)
    })

    it('keeps invalid date payloads at the end in ascending order', () => {
        const bookings = [
            createBooking('invalid', 'not-a-date', '10:00'),
            createBooking('late', '2026-05-24', '10:00'),
            createBooking('early', '2026-05-23', '09:00'),
        ]

        expect(
            sortBookingsByDateAsc(bookings).map((booking) => booking.id),
        ).toEqual(['early', 'late', 'invalid'])
    })

    it('keeps invalid date payloads at the end in descending order', () => {
        const bookings = [
            createBooking('invalid', 'not-a-date', '10:00'),
            createBooking('late', '2026-05-24', '10:00'),
            createBooking('early', '2026-05-23', '09:00'),
        ]

        expect(
            sortBookingsByDateDesc(bookings).map((booking) => booking.id),
        ).toEqual(['late', 'early', 'invalid'])
    })
})
