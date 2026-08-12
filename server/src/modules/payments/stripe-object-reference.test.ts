import { describe, expect, it } from 'vitest'

import { assertStripeObjectReference } from './stripe-object-reference.js'

describe('Stripe object references', () => {
    it('accepts matching normalized references', () => {
        expect(assertStripeObjectReference({ objectId: ' pi_123 ', referencedId: 'pi_123' })).toBe('pi_123')
    })

    it('rejects missing or mismatched references', () => {
        expect(() => assertStripeObjectReference({ objectId: 'pi_123', referencedId: 'pi_456' })).toThrow()
        expect(() => assertStripeObjectReference({ objectId: undefined, referencedId: 'pi_123' })).toThrow()
    })
})
