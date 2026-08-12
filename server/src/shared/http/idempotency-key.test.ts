import { describe, expect, it } from 'vitest'

import { getOptionalIdempotencyKey } from './idempotency-key.js'

describe('request idempotency key', () => {
    it('trims valid header values', () => {
        expect(getOptionalIdempotencyKey({ 'idempotency-key': ' booking_123 ' })).toBe('booking_123')
    })

    it('rejects malformed header values', () => {
        expect(() => getOptionalIdempotencyKey({ 'idempotency-key': 'short' })).toThrow(/8-128/)
        expect(() => getOptionalIdempotencyKey({ 'idempotency-key': ['a', 'b'] })).toThrow(/8-128/)
    })
})
