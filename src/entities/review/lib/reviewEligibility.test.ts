import { describe, expect, it } from 'vitest'

import type { ClientBooking } from '@/entities/booking'
import type { Review } from '../model/types'
import { canCreateCabinetReview } from './reviewEligibility'

const booking = {
    id: 'booking-1',
    clientId: 'client-1',
    cabinetId: 'cabinet-1',
    serviceId: 'service-1',
    date: '2026-02-01',
    startTime: '10:00',
    endTime: '11:00',
    status: 'completed',
    createdAt: '2026-01-01T00:00:00.000Z',
    cabinet: {
        id: 'cabinet-1',
        title: 'Cabinet',
        address: 'Address',
        city: 'City',
    },
    service: {
        id: 'service-1',
        title: 'Service',
        durationMinutes: 60,
        price: 1000,
    },
} satisfies ClientBooking

describe('canCreateCabinetReview', () => {
    it('allows review when client has completed booking for cabinet', () => {
        expect(
            canCreateCabinetReview({
                cabinetId: 'cabinet-1',
                bookings: [booking],
                reviews: [],
            })
        ).toBe(true)
    })

    it('blocks review when booking is not completed', () => {
        expect(
            canCreateCabinetReview({
                cabinetId: 'cabinet-1',
                bookings: [
                    {
                        ...booking,
                        status: 'confirmed',
                    },
                ],
                reviews: [],
            })
        ).toBe(false)
    })

    it('blocks review when client already has an approved review', () => {
        expect(
            canCreateCabinetReview({
                cabinetId: 'cabinet-1',
                bookings: [booking],
                reviews: [
                    {
                        id: 'review-1',
                        cabinetId: 'cabinet-1',
                        clientId: 'client-1',
                        rating: 5,
                        text: 'Great service.',
                        status: 'approved',
                        createdAt: '2026-01-02T00:00:00.000Z',
                        client: {
                            id: 'client-1',
                            name: 'Client',
                        },
                    } satisfies Review,
                ],
            })
        ).toBe(false)
    })
})
