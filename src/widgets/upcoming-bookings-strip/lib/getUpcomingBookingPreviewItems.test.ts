import { describe, expect, it } from 'vitest'

import type { ClientBooking } from '@/entities/booking'

import { getUpcomingBookingPreviewItems } from './getUpcomingBookingPreviewItems'

const createBooking = (
    id: string,
    overrides: Partial<ClientBooking> = {},
): ClientBooking => ({
    id,
    clientId: 'client-1',
    cabinetId: 'cabinet-1',
    serviceId: 'service-1',
    date: '2026-06-20',
    startTime: '10:00',
    endTime: '11:00',
    status: 'pending',
    comment: null,
    createdAt: '2026-06-19T09:00:00.000Z',
    cabinet: {
        id: 'cabinet-1',
        title: 'Cabinet 1',
        address: 'Main Street 12',
        city: 'Moscow',
    },
    service: {
        id: 'service-1',
        title: 'Consultation',
        durationMinutes: 60,
        price: 1200,
    },
    ...overrides,
})

describe('getUpcomingBookingPreviewItems', () => {
    it('returns nearest future pending and confirmed bookings', () => {
        const currentDate = new Date('2026-06-19T09:00:00')
        const bookings = [
            createBooking('later', {
                date: '2026-06-21',
                startTime: '12:00',
                endTime: '13:00',
                status: 'confirmed',
            }),
            createBooking('cancelled', {
                date: '2026-06-19',
                startTime: '13:00',
                endTime: '14:00',
                status: 'cancelled',
            }),
            createBooking('nearest', {
                date: '2026-06-19',
                startTime: '10:00',
                endTime: '11:00',
            }),
        ]

        expect(
            getUpcomingBookingPreviewItems(bookings, 2, currentDate).map(
                (booking) => booking.id,
            ),
        ).toEqual(['nearest', 'later'])
    })

    it('does not show stale or invalid bookings', () => {
        const currentDate = new Date('2026-06-19T12:00:00')
        const bookings = [
            createBooking('stale', {
                date: '2026-06-19',
                startTime: '09:00',
                endTime: '10:00',
            }),
            createBooking('invalid', {
                date: 'not-a-date',
                startTime: '10:00',
                endTime: '11:00',
            }),
            createBooking('future', {
                date: '2026-06-19',
                startTime: '13:00',
                endTime: '14:00',
            }),
        ]

        expect(
            getUpcomingBookingPreviewItems(bookings, 3, currentDate).map(
                (booking) => booking.id,
            ),
        ).toEqual(['future'])
    })
})
