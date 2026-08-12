import { describe, expect, it } from 'vitest'

import type { Booking } from '../model/types'
import { groupBookingsByStatus } from './groupBookingsByStatus'

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
        comment: 'Confirmed booking',
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
        comment: 'Pending booking',
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
        comment: 'Cancelled booking',
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
        comment: 'Completed booking',
        createdAt: '2026-05-10T10:00:00.000Z',
    },
]

describe('groupBookingsByStatus', () => {
    it('groups pending and confirmed bookings into upcoming bookings', () => {
        const result = groupBookingsByStatus(bookings)

        expect(result.upcomingBookings.map((booking) => booking.id)).toEqual([
            'booking-2',
            'booking-1',
        ])
    })

    it('groups cancelled bookings', () => {
        const result = groupBookingsByStatus(bookings)

        expect(result.cancelledBookings.map((booking) => booking.id)).toEqual([
            'booking-3',
        ])
    })

    it('groups completed bookings', () => {
        const result = groupBookingsByStatus(bookings)

        expect(result.completedBookings.map((booking) => booking.id)).toEqual([
            'booking-4',
        ])
    })

    it('does not mutate original bookings array', () => {
        const originalOrder = bookings.map((booking) => booking.id)

        groupBookingsByStatus(bookings)

        expect(bookings.map((booking) => booking.id)).toEqual(originalOrder)
    })
})