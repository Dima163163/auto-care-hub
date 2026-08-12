import { describe, expect, it } from 'vitest'

import {
    MAX_STRIPE_IDENTIFIER_LENGTH,
    normalizeStripeIdentifier,
} from './stripe-identifiers.js'

describe('Stripe identifier bounds', () => {
    it('normalizes valid provider identifiers', () => {
        expect(normalizeStripeIdentifier('  pi_123  ', 'paymentIntentId')).toBe('pi_123')
        expect(normalizeStripeIdentifier(undefined, 'chargeId')).toBeUndefined()
    })

    it('rejects malformed or oversized provider identifiers', () => {
        expect(() => normalizeStripeIdentifier('pi_123/evil', 'paymentIntentId')).toThrow(/invalid/)
        expect(() => normalizeStripeIdentifier('x'.repeat(MAX_STRIPE_IDENTIFIER_LENGTH + 1), 'eventId'))
            .toThrow(/invalid/)
    })
})
