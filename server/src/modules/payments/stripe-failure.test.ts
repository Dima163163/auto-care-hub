import { describe, expect, it } from 'vitest'

import { classifyStripeFailure } from './stripe-failure.js'

describe('Stripe failure classification', () => {
    it('identifies retryable provider failures', () => {
        expect(classifyStripeFailure({ type: 'StripeConnectionError' })).toBe('transient')
        expect(classifyStripeFailure({ statusCode: 503 })).toBe('transient')
        expect(classifyStripeFailure({ statusCode: 429 })).toBe('transient')
    })

    it('separates permanent and unknown failures', () => {
        expect(classifyStripeFailure({ type: 'StripeCardError' })).toBe('permanent')
        expect(classifyStripeFailure(new Error('unexpected'))).toBe('unknown')
    })
})
