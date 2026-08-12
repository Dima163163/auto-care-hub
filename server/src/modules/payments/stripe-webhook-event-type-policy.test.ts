import { describe, expect, it } from 'vitest'

import { getStripeWebhookEventOutcome } from './stripe-webhook-event-type-policy.js'

describe('Stripe webhook event type policy', () => {
    it('recognizes supported payment and operational events', () => {
        expect(getStripeWebhookEventOutcome('checkout.session.completed')).toBe('applied')
        expect(getStripeWebhookEventOutcome('charge.dispute.created')).toBe('applied')
        expect(getStripeWebhookEventOutcome('charge.dispute.updated')).toBe('applied')
    })

    it('classifies unknown provider event types as unsupported', () => {
        expect(getStripeWebhookEventOutcome('payment_intent.succeeded')).toBe('unsupported')
    })
})
