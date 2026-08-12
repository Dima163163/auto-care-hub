import { describe, expect, it } from 'vitest'

import { normalizeOutboxIdempotencyKey } from './outbox-idempotency-policy.js'

describe('outbox idempotency policy', () => {
    it('trims a bounded idempotency key', () => {
        expect(normalizeOutboxIdempotencyKey('  booking:123  ')).toBe('booking:123')
    })

    it('rejects empty, control-character, and oversized keys', () => {
        expect(() => normalizeOutboxIdempotencyKey(' ')).toThrow(/invalid/)
        expect(() => normalizeOutboxIdempotencyKey('key\nvalue')).toThrow(/invalid/)
        expect(() => normalizeOutboxIdempotencyKey('x'.repeat(256))).toThrow(/invalid/)
    })
})
