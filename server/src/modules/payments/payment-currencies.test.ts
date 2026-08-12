import { describe, expect, it } from 'vitest'

import { isSupportedPaymentCurrency } from './payment-currencies.js'

describe('payment currency allowlist', () => {
    it('accepts supported currencies case-insensitively', () => {
        expect(isSupportedPaymentCurrency(' RUB ')).toBe(true)
        expect(isSupportedPaymentCurrency('usd')).toBe(true)
    })

    it('rejects unsupported currency codes', () => {
        expect(isSupportedPaymentCurrency('gbp')).toBe(false)
        expect(isSupportedPaymentCurrency('euro')).toBe(false)
    })
})
