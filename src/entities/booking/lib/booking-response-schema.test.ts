import { describe, expect, it } from 'vitest'

import {
    normalizeClientBookingListResponse,
    normalizeOwnerBookingListResponse,
    normalizeResolveBookingRescheduleResponse,
} from './booking-response-schema'

const booking = {
    id: 'booking-1',
    clientId: 'client-1',
    cabinetId: 'cabinet-1',
    serviceId: 'service-1',
    date: '2026-08-01',
    startTime: '10:00',
    endTime: '11:00',
    status: 'pending' as const,
    comment: null,
    cancellationReason: null,
    createdAt: '2026-08-01T08:00:00.000Z',
    cabinet: { id: 'cabinet-1', title: 'Studio', address: 'Main 1', city: 'Samara' },
    service: { id: 'service-1', title: 'Portrait', durationMinutes: 60, price: 1500 },
}

describe('booking response schemas', () => {
    it('parses client and owner booking lists', () => {
        expect(normalizeClientBookingListResponse([booking])).toHaveLength(1)
        expect(normalizeOwnerBookingListResponse([{
            ...booking,
            client: { id: 'client-1', name: 'Alex', email: 'alex@example.com', phone: null },
            ownerNote: null,
        }])[0]?.ownerNote).toBeNull()
        expect(normalizeOwnerBookingListResponse({
            items: [{
                ...booking,
                client: { id: 'client-1', name: 'Alex', email: 'alex@example.com', phone: null },
                ownerNote: null,
            }],
            nextCursor: null,
        })).toHaveLength(1)
    })

    it('validates the owner reschedule resolution response', () => {
        const result = normalizeResolveBookingRescheduleResponse({
            request: {
                id: 'request-1',
                bookingId: 'booking-1',
                proposedDate: '2026-08-02',
                proposedStartTime: '12:00',
                proposedEndTime: '13:00',
                status: 'accepted',
                resolutionReason: null,
                createdAt: '2026-08-01T08:00:00.000Z',
                resolvedAt: '2026-08-01T09:00:00.000Z',
            },
            booking: {
                ...booking,
                client: { id: 'client-1', name: 'Alex', email: 'alex@example.com', phone: null },
                ownerNote: null,
            },
        })

        expect(result.request.status).toBe('accepted')
        expect(result.booking.id).toBe('booking-1')
    })

    it('rejects malformed booking state', () => {
        expect(() => normalizeClientBookingListResponse([{ ...booking, status: 'paid' }])).toThrow()
    })
})
