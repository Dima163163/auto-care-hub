import { describe, expect, it } from 'vitest'

import {
    normalizeOwnerReadiness,
    normalizeStripeConnectStatus,
    normalizeStripeOnboardingResponse,
} from './payment-response-schema'

describe('payment response schemas', () => {
    it('normalizes bounded owner readiness and rejects unknown blockers', () => {
        expect(normalizeOwnerReadiness({
            ready: false,
            blockers: ['schedule'],
            checks: {
                emailVerified: true,
                activeCabinet: true,
                activeService: true,
                scheduleConfigured: false,
                payoutAccount: 'ready',
            },
        }).checks.scheduleConfigured).toBe(false)

        expect(() => normalizeOwnerReadiness({
            ready: false,
            blockers: ['provider_secret'],
            checks: {
                emailVerified: true,
                activeCabinet: true,
                activeService: true,
                scheduleConfigured: true,
                payoutAccount: 'ready',
            },
        })).toThrow()
    })

    it('parses Stripe Connect status', () => {
        expect(normalizeStripeConnectStatus({
            connected: true,
            detailsSubmitted: true,
            chargesEnabled: true,
            payoutsEnabled: false,
        }).payoutsEnabled).toBe(false)
    })

    it('accepts a valid onboarding URL', () => {
        expect(normalizeStripeOnboardingResponse({ url: 'https://connect.stripe.com/setup/1' }).url)
            .toContain('stripe.com')
    })

    it('rejects incomplete status and unsafe URLs', () => {
        expect(() => normalizeStripeConnectStatus({ connected: true })).toThrow()
        expect(() => normalizeStripeOnboardingResponse({ url: 'javascript:alert(1)' })).toThrow()
    })
})
