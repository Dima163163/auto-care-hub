import { describe, expect, it } from 'vitest'

import {
    assertPaymentTransitionMatched,
    assertStripeCheckoutMetadata,
} from './stripe-checkout-settlement.js'

describe('Stripe Checkout settlement guards', () => {
    it('accepts UUID metadata required to identify the payment', () => {
        expect(assertStripeCheckoutMetadata({
            bookingId: '123e4567-e89b-42d3-a456-426614174000',
            paymentId: '223e4567-e89b-42d3-a456-426614174000',
        })).toEqual({
            bookingId: '123e4567-e89b-42d3-a456-426614174000',
            paymentId: '223e4567-e89b-42d3-a456-426614174000',
        })
    })

    it('rejects missing or malformed checkout metadata', () => {
        expect(() => assertStripeCheckoutMetadata(undefined)).toThrow(/missing or invalid/)
        expect(() => assertStripeCheckoutMetadata({
            bookingId: 'booking-1',
            paymentId: 'payment-1',
        })).toThrow(/missing or invalid/)
    })

    it('rejects unmatched payment transitions instead of allowing processed state', () => {
        expect(() => assertPaymentTransitionMatched(null)).toThrow(/could not be matched/)
        expect(assertPaymentTransitionMatched({ changed: true })).toEqual({ changed: true })
    })
})
