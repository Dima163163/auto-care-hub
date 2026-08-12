import { describe, expect, it } from 'vitest'

import {
    MAX_PAYMENT_IDEMPOTENCY_KEY_LENGTH,
    normalizePaymentIdempotencyKey,
    normalizePaymentCurrency,
    validatePaymentAmounts,
} from './payment-input.js'

describe('payment input validation', () => {
    it('accepts balanced bounded payment amounts and normalizes currency', () => {
        expect(validatePaymentAmounts({
            grossAmount: 1_000,
            commissionAmount: 20,
            ownerPayoutAmount: 980,
        })).toEqual({ grossAmount: 1_000, commissionAmount: 20, ownerPayoutAmount: 980 })
        expect(normalizePaymentCurrency(' EUR ')).toBe('eur')
        expect(normalizePaymentIdempotencyKey('  checkout_123  ')).toBe('checkout_123')
    })

    it('rejects unbalanced amounts and malformed currency codes', () => {
        expect(() => validatePaymentAmounts({ grossAmount: 100, commissionAmount: 20, ownerPayoutAmount: 70 }))
            .toThrow(/balance/)
        expect(() => normalizePaymentCurrency('euro')).toThrow(/three-letter/)
        expect(() => normalizePaymentIdempotencyKey('short')).toThrow(/idempotency/)
        expect(() => normalizePaymentIdempotencyKey('x'.repeat(MAX_PAYMENT_IDEMPOTENCY_KEY_LENGTH + 1))).toThrow(/idempotency/)
    })
})
