import { describe, expect, it } from 'vitest'

import {
    assertBookingDateRange,
    MAX_BOOKING_COMMENT_LENGTH,
    MAX_BOOKING_OWNER_NOTE_LENGTH,
    MAX_BOOKING_IDEMPOTENCY_KEY_LENGTH,
    normalizeBookingCancellationReason,
    normalizeBookingComment,
    normalizeBookingOwnerNote,
    normalizeBookingIdempotencyKey,
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
})
