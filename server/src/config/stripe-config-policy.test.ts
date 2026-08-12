import { describe, expect, it } from 'vitest'

import { getStripeConfig } from './stripe-config-policy.js'

describe('Stripe configuration policy', () => {
    it('keeps mock defaults available outside production', () => {
        expect(getStripeConfig('development')).toEqual({
            secretKey: 'sk_test_mock',
            webhookSecret: 'whsec_mock',
        })
    })

    it('requires both Stripe credentials in production', () => {
        expect(() => getStripeConfig('production')).toThrow(
            'STRIPE_SECRET_KEY is required in production.',
        )
        expect(() => getStripeConfig('production', { secretKey: 'sk_live_configured' })).toThrow(
            'STRIPE_WEBHOOK_SECRET is required in production.',
        )
    })

    it('rejects tracked placeholder credentials in production', () => {
        expect(() => getStripeConfig('production', {
            secretKey: 'sk_test_mock',
            webhookSecret: 'whsec_configured',
        })).toThrow('STRIPE_SECRET_KEY must not use a placeholder value in production.')
        expect(() => getStripeConfig('production', {
            secretKey: 'sk_live_configured',
            webhookSecret: 'whsec_mock',
        })).toThrow('STRIPE_WEBHOOK_SECRET must not use a placeholder value in production.')
    })

    it('trims configured production credentials without exposing them', () => {
        expect(getStripeConfig('production', {
            secretKey: ' sk_live_configured ',
            webhookSecret: ' whsec_configured ',
        })).toEqual({
            secretKey: 'sk_live_configured',
            webhookSecret: 'whsec_configured',
        })
    })

})
