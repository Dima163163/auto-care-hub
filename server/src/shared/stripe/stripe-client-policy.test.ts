import { describe, expect, it } from 'vitest'

import { assertStripeClientPolicy } from './stripe-client-policy.js'

describe('Stripe client timeout policy', () => {
    it('accepts the default bounded client budget', () => {
        expect(assertStripeClientPolicy({ timeoutMs: 8_000, maxNetworkRetries: 2 })).toBeUndefined()
    })

    it('rejects a budget that can block too long', () => {
        expect(() => assertStripeClientPolicy({ timeoutMs: 121_000, maxNetworkRetries: 3 })).toThrow(/invalid/)
        expect(() => assertStripeClientPolicy({ timeoutMs: 0, maxNetworkRetries: 0 })).toThrow(/invalid/)
    })
})
