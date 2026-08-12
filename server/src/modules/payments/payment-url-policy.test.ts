import { describe, expect, it } from 'vitest'

import { assertPaymentCheckoutUrl, MAX_PAYMENT_CHECKOUT_URL_LENGTH } from './payment-url-policy.js'

describe('payment checkout URL policy', () => {
    it('accepts HTTPS checkout URLs', () => {
        expect(assertPaymentCheckoutUrl('https://checkout.stripe.com/session_123')).toContain('checkout.stripe.com')
    })

    it('rejects insecure, credentialed, and oversized URLs', () => {
        expect(() => assertPaymentCheckoutUrl('http://checkout.stripe.com/session')).toThrow(/checkout URL/)
        expect(() => assertPaymentCheckoutUrl('https://user:pass@checkout.stripe.com/session')).toThrow(/checkout URL/)
        expect(() => assertPaymentCheckoutUrl(`https://checkout.stripe.com/${'x'.repeat(MAX_PAYMENT_CHECKOUT_URL_LENGTH)}`)).toThrow(/checkout URL/)
        expect(() => assertPaymentCheckoutUrl('https://evil.example/checkout')).toThrow(/checkout URL/)
    })
})
