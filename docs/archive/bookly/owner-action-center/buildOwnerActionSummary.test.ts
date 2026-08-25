import { describe, expect, it } from 'vitest'

import type { BookingRescheduleRequest, OwnerBooking } from '@/entities/booking'
import type { Cabinet } from '@/entities/cabinet'

import { buildOwnerActionSummary } from './buildOwnerActionSummary'

const booking = (createdAt: string, status: OwnerBooking['status'] = 'pending') => ({
    id: `booking-${createdAt}`,
    clientId: 'client-1',
    cabinetId: 'cabinet-1',
    serviceId: 'service-1',
    date: '2026-08-10',
    startTime: '10:00',
    endTime: '11:00',
    status,
    createdAt,
    cabinet: { id: 'cabinet-1', title: 'Studio', address: 'Main 1', city: 'Samara' },
    service: { id: 'service-1', title: 'Consultation', durationMinutes: 60, price: 1500 },
    client: { id: 'client-1', name: 'Alex', email: 'alex@example.com', phone: null },
    ownerNote: null,
}) satisfies OwnerBooking

const reschedule = (createdAt: string) => ({
    id: `request-${createdAt}`,
    bookingId: 'booking-1',
    proposedDate: '2026-08-11',
    proposedStartTime: '12:00',
    proposedEndTime: '13:00',
    status: 'pending',
    resolutionReason: null,
    createdAt,
    resolvedAt: null,
}) satisfies BookingRescheduleRequest

const cabinet = (status: Cabinet['status']) => ({
    id: `cabinet-${status}`,
    ownerId: 'owner-1',
    title: 'Studio',
    description: '',
    address: 'Main 1',
    city: 'Samara',
    pricePerHour: 1500,
    status,
    photos: [],
    createdAt: '2026-08-01T00:00:00.000Z',
}) satisfies Cabinet

describe('buildOwnerActionSummary', () => {
    it('keeps actionable counts owner-scoped and calculates the overdue slice', () => {
        const summary = buildOwnerActionSummary({
            bookings: [
                booking('2026-08-07T08:00:00.000Z'),
                booking('2026-08-09T08:00:00.000Z'),
                booking('2026-08-07T08:00:00.000Z', 'confirmed'),
            ],
            rescheduleRequests: [reschedule('2026-08-07T08:00:00.000Z')],
            cabinets: [cabinet('active'), cabinet('draft'), cabinet('blocked')],
            now: new Date('2026-08-09T12:00:00.000Z'),
        })

        expect(summary).toMatchObject({
            pendingBookings: 2,
            pendingReschedules: 1,
            draftCabinets: 1,
            blockedCabinets: 1,
            pendingBookingsOlderThan24Hours: 1,
            pendingReschedulesOlderThan24Hours: 1,
            oldestPendingBookingAt: '2026-08-07T08:00:00.000Z',
            oldestPendingRescheduleAt: '2026-08-07T08:00:00.000Z',
        })
    })

    it('returns a clear empty summary when all owner work is clear', () => {
        expect(buildOwnerActionSummary({
            bookings: [],
            rescheduleRequests: [],
            cabinets: [],
        })).toEqual({
            pendingBookings: 0,
            pendingReschedules: 0,
            draftCabinets: 0,
            blockedCabinets: 0,
            pendingBookingsOlderThan24Hours: 0,
            pendingReschedulesOlderThan24Hours: 0,
            oldestPendingBookingAt: null,
            oldestPendingRescheduleAt: null,
        })
    })
})
