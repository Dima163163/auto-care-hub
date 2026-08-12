import { describe, expect, it } from 'vitest'

import {
    getStripeUnmatchedWebhookExpiryCutoff,
    isStripeUnmatchedWebhookExpired,
} from './stripe-webhook-retention.js'

describe('Stripe unmatched webhook retention', () => {
    it('uses a bounded 24-hour retry window', () => {
        const now = new Date('2026-08-01T12:00:00.000Z')
        expect(getStripeUnmatchedWebhookExpiryCutoff(now).toISOString())
            .toBe('2026-07-31T12:00:00.000Z')
        expect(isStripeUnmatchedWebhookExpired('2026-07-31T11:59:59.000Z', now)).toBe(true)
        expect(isStripeUnmatchedWebhookExpired('2026-07-31T12:00:00.000Z', now)).toBe(false)
    })
})
