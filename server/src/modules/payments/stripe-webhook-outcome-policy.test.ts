import { describe, expect, it } from 'vitest'

import { getStripeWebhookFailureDisposition } from './stripe-webhook-outcome-policy.js'

describe('Stripe webhook failure disposition', () => {
    it('keeps unmatched payment events retryable as unmatched', () => {
        expect(getStripeWebhookFailureDisposition(
            'Stripe Checkout payment could not be matched to the stored booking.',
        )).toBe('unmatched')
        expect(getStripeWebhookFailureDisposition(
            'Stripe Checkout event metadata is missing or invalid.',
        )).toBe('unmatched')
    })

    it('keeps provider and processing failures in failed status', () => {
        expect(getStripeWebhookFailureDisposition('Stripe provider timeout.')).toBe('failed')
    })
})
