import { describe, expect, it } from 'vitest'

import { BookingStatus } from '../../entities/booking/booking.entity.js'
import { UserRole } from '../../entities/user/user.entity.js'
import {
    cancelClientBooking,
    createClientBooking,
    createOwnerBooking,
    getBookingStatusHistory,
    getClientBookings,
    getOccupiedSlots,
    getOwnerBookings,
    recordClientExperimentEventFromRoute,
    recordOwnerActionCenterEvent,
    requestClientBookingReschedule,
    resolveOwnerBookingReschedule,
    updateOwnerBookingNote,
    updateOwnerBookingStatus,
} from './bookings.service.js'

const client = { id: '11111111-1111-4111-8111-111111111111', role: UserRole.Client } as never
const owner = { id: '22222222-2222-4222-8222-222222222222', role: UserRole.Owner } as never
const admin = { id: '33333333-3333-4333-8333-333333333333', role: UserRole.Admin } as never

const validReschedule = {
    date: '2026-09-10',
    startTime: '10:00',
    endTime: '11:00',
}

describe('Booking service boundaries', () => {
    it('rejects malformed booking ids before history/reschedule/cancel lookup', async () => {
        await expect(getBookingStatusHistory(client, 'not-a-uuid')).rejects.toMatchObject({ statusCode: 422 })
        await expect(requestClientBookingReschedule(client, 'not-a-uuid', validReschedule)).rejects.toMatchObject({ statusCode: 422 })
        await expect(cancelClientBooking(client, 'not-a-uuid', 'Client requested cancellation.', 'http://localhost:4175')).rejects.toMatchObject({ statusCode: 422 })
    })

    it('rejects malformed owner booking ids before reschedule/status/note lookup', async () => {
        await expect(resolveOwnerBookingReschedule(owner, 'not-a-uuid', { decision: 'accepted' })).rejects.toMatchObject({ statusCode: 422 })
        await expect(updateOwnerBookingStatus(owner, 'not-a-uuid', BookingStatus.Confirmed, 'http://localhost:4175')).rejects.toMatchObject({ statusCode: 422 })
        await expect(updateOwnerBookingNote(owner, 'not-a-uuid', 'Note')).rejects.toMatchObject({ statusCode: 422 })
    })

    it('rejects malformed cabinet ids before occupied-slot lookup', async () => {
        await expect(getOccupiedSlots(client, 'not-a-uuid', '2026-09-10')).rejects.toMatchObject({ statusCode: 422 })
    })

    it('rejects malformed occupied-slot dates before repository access', async () => {
        await expect(getOccupiedSlots(client, '33333333-3333-4333-8333-333333333333', '2026-02-30')).rejects.toMatchObject({ statusCode: 422 })
        await expect(getOccupiedSlots(client, '33333333-3333-4333-8333-333333333333', null)).rejects.toMatchObject({ statusCode: 422 })
    })

    it('keeps client/owner role checks ahead of booking repository access', async () => {
        await expect(getClientBookings(owner)).rejects.toMatchObject({ statusCode: 403 })
        await expect(getOwnerBookings(client)).rejects.toMatchObject({ statusCode: 403 })
        await expect(cancelClientBooking(owner, 'not-a-uuid', 'Client requested cancellation.', 'http://localhost:4175')).rejects.toMatchObject({ statusCode: 403 })
        await expect(updateOwnerBookingStatus(client, 'not-a-uuid', BookingStatus.Confirmed, 'http://localhost:4175')).rejects.toMatchObject({ statusCode: 403 })
        await expect(getOccupiedSlots(admin, 'not-a-uuid', '2026-09-10')).rejects.toMatchObject({ statusCode: 403 })
    })

    it('rejects malformed list filters before building booking queries', async () => {
        await expect(getClientBookings(client, { limit: 101 } as never)).rejects.toMatchObject({ statusCode: 422 })
        await expect(getOwnerBookings(owner, { fromDate: '2026-02-30' } as never)).rejects.toMatchObject({ statusCode: 422 })
        await expect(getOwnerBookings(owner, { fromDate: '2026-09-10', toDate: '2026-09-01' } as never)).rejects.toMatchObject({ statusCode: 422 })
    })

    it('rejects malformed create payloads before cabinet/service/client lookup', async () => {
        await expect(createClientBooking(client, {
            cabinetId: 'not-a-uuid',
            serviceId: '44444444-4444-4444-8444-444444444444',
            date: '2026-09-10',
            startTime: '10:00',
            endTime: '11:00',
        } as never, 'http://localhost:4175')).rejects.toMatchObject({ statusCode: 422 })
        await expect(createOwnerBooking(owner, {
            clientId: '55555555-5555-4555-8555-555555555555',
            cabinetId: '33333333-3333-4333-8333-333333333333',
            serviceId: '44444444-4444-4444-8444-444444444444',
            date: '2026-09-10',
            startTime: 'not-a-time',
            endTime: '11:00',
        } as never, 'http://localhost:4175')).rejects.toMatchObject({ statusCode: 422 })
    })

    it('rejects malformed booking mutation payloads before repository access', async () => {
        await expect(requestClientBookingReschedule(client, '33333333-3333-4333-8333-333333333333', {
            date: '2026-02-30',
            startTime: '10:00',
            endTime: '11:00',
        } as never)).rejects.toMatchObject({ statusCode: 422 })
        await expect(resolveOwnerBookingReschedule(owner, '33333333-3333-4333-8333-333333333333', { decision: 'pending' } as never)).rejects.toMatchObject({ statusCode: 422 })
        await expect(updateOwnerBookingStatus(owner, '33333333-3333-4333-8333-333333333333', 'invalid-status' as never, 'http://localhost:4175')).rejects.toMatchObject({ statusCode: 422 })
        await expect(updateOwnerBookingNote(owner, '33333333-3333-4333-8333-333333333333', { unsafe: true })).rejects.toMatchObject({ statusCode: 422 })
    })

    it('rejects unknown telemetry events before metrics labels are written', () => {
        expect(() => recordOwnerActionCenterEvent(owner, 'owner-input' as never)).toThrowError(expect.objectContaining({ statusCode: 422 }))
        expect(() => recordClientExperimentEventFromRoute(client, 'client-input' as never)).toThrowError(expect.objectContaining({ statusCode: 422 }))
        expect(() => recordClientExperimentEventFromRoute(owner, 'client-input' as never)).toThrowError(expect.objectContaining({ statusCode: 403 }))
    })
})
