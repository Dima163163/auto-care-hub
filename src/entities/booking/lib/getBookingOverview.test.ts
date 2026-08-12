import { describe, expect, it } from 'vitest'

import type { Booking } from '../model/types'
import { getBookingOverview } from './getBookingOverview'

const bookings: Booking[] = [
    {
        id: 'booking-1',
        clientId: 'client-1',
        cabinetId: 'cabinet-1',
        serviceId: 'service-1',
        date: '2026-05-20',
        startTime: '12:00',
        endTime: '13:00',
        status: 'confirmed',
        comment: undefined,
        createdAt: '2026-05-10T10:00:00.000Z',
    },
    {
        id: 'booking-2',
        clientId: 'client-1',
        cabinetId: 'cabinet-1',
        serviceId: 'service-1',
        date: '2026-05-18',
        startTime: '10:00',
        endTime: '11:00',
        status: 'pending',
        comment: undefined,
        createdAt: '2026-05-10T10:00:00.000Z',
    },
    {
        id: 'booking-3',
        clientId: 'client-1',
        cabinetId: 'cabinet-1',
        serviceId: 'service-1',
        date: '2026-05-15',
        startTime: '09:00',
        endTime: '10:00',
        status: 'cancelled',
        comment: undefined,
        createdAt: '2026-05-10T10:00:00.000Z',
    },
    {
        id: 'booking-4',
        clientId: 'client-1',
        cabinetId: 'cabinet-1',
        serviceId: 'service-1',
        date: '2026-05-16',
        startTime: '09:00',
        endTime: '10:00',
        status: 'completed',
        comment: undefined,
        createdAt: '2026-05-10T10:00:00.000Z',
    },
]

describe('getBookingOverview', () => {
    it('returns grouped bookings and summary counts', () => {
        const result = getBookingOverview(bookings)

        expect(result.totalBookingsCount).toBe(4)
        expect(result.upcomingBookingsCount).toBe(2)
        expect(result.cancelledBookingsCount).toBe(1)
        expect(result.completedBookingsCount).toBe(1)
    })

    it('returns upcoming bookings sorted by nearest date first', () => {
        const result = getBookingOverview(bookings)

        expect(result.upcomingBookings.map((booking) => booking.id)).toEqual([
            'booking-2',
            'booking-1',
        ])
    })

    it('returns cancelled and completed bookings', () => {
        const result = getBookingOverview(bookings)

        expect(result.cancelledBookings.map((booking) => booking.id)).toEqual([
            'booking-3',
        ])

        expect(result.completedBookings.map((booking) => booking.id)).toEqual([
            'booking-4',
        ])
    })
})