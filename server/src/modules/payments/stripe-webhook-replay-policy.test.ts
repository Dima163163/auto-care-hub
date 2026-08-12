import Stripe from 'stripe'
import { describe, expect, it } from 'vitest'

import { getStripeWebhookReplayFailureOutcome } from './stripe-webhook-replay-policy.js'

describe('Stripe webhook replay failure policy', () => {
    it('keeps unmatched domain records retryable', () => {
        expect(getStripeWebhookReplayFailureOutcome(
            new Error('Stripe Checkout payment could not be matched to a stored payment.'),
            'Stripe Checkout payment could not be matched to a stored payment.',
        )).toBe('retry')
    })

    it('keeps transient Stripe API failures retryable', () => {
        const error = new Stripe.errors.StripeConnectionError({ message: 'provider unavailable' })
        expect(getStripeWebhookReplayFailureOutcome(error, error.message)).toBe('retry')
    })

    it('marks replay identity mismatches as terminal failures', () => {
        expect(getStripeWebhookReplayFailureOutcome(
            new Error('Stripe replay event identity did not match the stored webhook record.'),
            'Stripe replay event identity did not match the stored webhook record.',
        )).toBe('failed')
    })
})
