import { describe, expect, it } from 'vitest'

import {
    assertBookingDateRange,
    MAX_BOOKING_COMMENT_LENGTH,
    MAX_BOOKING_OWNER_NOTE_LENGTH,
    MAX_BOOKING_IDEMPOTENCY_KEY_LENGTH,
    normalizeBookingCancellationReason,
    normalizeBookingDate,
    normalizeBookingComment,
    normalizeBookingOwnerNote,
    normalizeBookingIdempotencyKey,
    normalizeBookingListQuery,
    normalizeBookingRescheduleInput,
    normalizeBookingRescheduleResolutionInput,
    normalizeBookingStatus,
    normalizeBookingTime,
    normalizeClientBookingCreationInput,
    normalizeOwnerBookingCreationInput,
} from './booking-input-policy.js'

describe('booking input policy', () => {
    it('normalizes optional booking text fields', () => {
        expect(normalizeBookingComment('  Please\ncall  ')).toBe('Please call')
        expect(normalizeBookingOwnerNote('  Prepare   room  ')).toBe('Prepare room')
        expect(normalizeBookingComment('')).toBeNull()
    })

    it('bounds booking idempotency keys', () => {
        expect(normalizeBookingIdempotencyKey(' booking_1 ')).toBe('booking_1')
        expect(() => normalizeBookingIdempotencyKey('short')).toThrow(/idempotency/)
        expect(() => normalizeBookingIdempotencyKey('x'.repeat(MAX_BOOKING_IDEMPOTENCY_KEY_LENGTH + 1))).toThrow(/idempotency/)
    })

    it('bounds optional booking text fields', () => {
        expect(() => normalizeBookingComment('x'.repeat(MAX_BOOKING_COMMENT_LENGTH + 1))).toThrow(/comment/)
        expect(() => normalizeBookingOwnerNote('x'.repeat(MAX_BOOKING_OWNER_NOTE_LENGTH + 1))).toThrow(/owner note/)
    })

    it('normalizes a cancellation reason', () => {
        expect(normalizeBookingCancellationReason('  Client\nchanged plans  ')).toBe('Client changed plans')
    })

    it('rejects empty and oversized reasons', () => {
        expect(() => normalizeBookingCancellationReason('  ')).toThrow(/invalid/)
        expect(() => normalizeBookingCancellationReason('x'.repeat(501))).toThrow(/invalid/)
    })

    it('rejects invalid or reversed booking date ranges', () => {
        expect(() => assertBookingDateRange('2026-07-30', '2026-07-29')).toThrow(/range/)
        expect(() => assertBookingDateRange('not-a-date', '2026-07-29')).toThrow(/date/)
        expect(() => assertBookingDateRange('2026-02-30', undefined)).toThrow(/date/)
        expect(() => assertBookingDateRange('20260729', undefined)).toThrow(/date/)
        expect(() => assertBookingDateRange('2026-07-29', '2026-07-30')).not.toThrow()
    })

    it('normalizes occupied-slot dates at the service boundary', () => {
        expect(normalizeBookingDate('2026-07-29')).toBe('2026-07-29')
        expect(normalizeBookingDate('2026-02-30')).toBeNull()
        expect(normalizeBookingDate(null)).toBeNull()
    })

    it('normalizes booking list queries and rejects unsafe filters', () => {
        expect(normalizeBookingListQuery({ limit: 25, status: 'confirmed', fromDate: '2026-07-29', toDate: '2026-07-30', cursor: '  cursor ' })).toEqual({ limit: 25, status: 'confirmed', fromDate: '2026-07-29', toDate: '2026-07-30', cursor: 'cursor' })
        expect(normalizeBookingListQuery(undefined)).toEqual({})
        expect(normalizeBookingListQuery(null)).toEqual({})
        expect(normalizeBookingListQuery({ limit: 101 })).toBeNull()
        expect(normalizeBookingListQuery({ status: 'unknown' })).toBeNull()
        expect(normalizeBookingListQuery({ fromDate: '2026-02-30' })).toBeNull()
        expect(normalizeBookingListQuery({ fromDate: '2026-07-30', toDate: '2026-07-29' })).toBeNull()
        expect(normalizeBookingListQuery({ extra: true })).toBeNull()
    })

    it('normalizes booking creation payloads before persistence', () => {
        expect(normalizeClientBookingCreationInput({
            cabinetId: ' 33333333-3333-4333-8333-333333333333 ',
            serviceId: '44444444-4444-4444-8444-444444444444',
            date: '2026-09-10',
            startTime: ' 10:00 ',
            endTime: '11:00',
            comment: '  Call\nme  ',
            idempotencyKey: ' booking_123 ',
        })).toEqual({
            cabinetId: '33333333-3333-4333-8333-333333333333',
            serviceId: '44444444-4444-4444-8444-444444444444',
            date: '2026-09-10',
            startTime: '10:00',
            endTime: '11:00',
            comment: 'Call me',
            idempotencyKey: 'booking_123',
        })
        expect(normalizeOwnerBookingCreationInput({
            clientId: '55555555-5555-4555-8555-555555555555',
            cabinetId: '33333333-3333-4333-8333-333333333333',
            serviceId: '44444444-4444-4444-8444-444444444444',
            date: '2026-09-10',
            startTime: '10:00',
            endTime: '11:00',
        })?.clientId).toBe('55555555-5555-4555-8555-555555555555')
        expect(normalizeClientBookingCreationInput({
            cabinetId: 'not-a-uuid',
            serviceId: '44444444-4444-4444-8444-444444444444',
            date: '2026-09-10',
            startTime: '10:00',
            endTime: '11:00',
        })).toBeNull()
        expect(normalizeClientBookingCreationInput({
            cabinetId: '33333333-3333-4333-8333-333333333333',
            serviceId: '44444444-4444-4444-8444-444444444444',
            date: '2026-09-10',
            startTime: '10:00',
            endTime: '11:00',
            extra: true,
        })).toBeNull()
        expect(normalizeBookingTime('25:00')).toBeNull()
    })

    it('normalizes booking mutation payloads before persistence', () => {
        expect(normalizeBookingRescheduleInput({ date: ' 2026-09-10 ', startTime: '10:00', endTime: '11:00' })).toEqual({ date: '2026-09-10', startTime: '10:00', endTime: '11:00' })
        expect(normalizeBookingRescheduleInput({ date: '2026-02-30', startTime: '10:00', endTime: '11:00' })).toBeNull()
        expect(normalizeBookingRescheduleInput({ date: '2026-09-10', startTime: '10:00', endTime: '11:00', extra: true })).toBeNull()
        expect(normalizeBookingRescheduleResolutionInput({ decision: 'accepted', reason: '  Please call\nclient ' })).toEqual({ decision: 'accepted', reason: 'Please call client' })
        expect(normalizeBookingRescheduleResolutionInput({ decision: 'pending' })).toBeNull()
        expect(normalizeBookingRescheduleResolutionInput({ decision: 'rejected', reason: { unsafe: true } })).toBeNull()
        expect(normalizeBookingStatus('confirmed')).toBe('confirmed')
        expect(normalizeBookingStatus('not-a-status')).toBeNull()
    })
})
