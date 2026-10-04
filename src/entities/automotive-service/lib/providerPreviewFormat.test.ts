import { describe, expect, it } from 'vitest'
import { formatProviderPreviewPrice } from './providerPreviewFormat'

const base = { price: 2900, priceTo: 3500, currency: 'RUB' }
const labels = { from: (price: string) => `from ${price}`, quoteRequired: 'Quote required' }

describe('discovery price semantics', () => {
    it('keeps fixed, from, range and quote prices distinct', () => {
        expect(formatProviderPreviewPrice({ ...base, priceType: 'fixed' }, 'en', labels)).not.toContain('from')
        expect(formatProviderPreviewPrice({ ...base, priceType: 'from' }, 'en', labels)).toMatch(/^from /)
        expect(formatProviderPreviewPrice({ ...base, priceType: 'range' }, 'en', labels)).toContain('–')
        expect(formatProviderPreviewPrice({ ...base, priceType: 'quote_required' }, 'en', labels)).toBe('Quote required')
    })
    it('does not fabricate a fixed price when the source omitted its type', () => {
        expect(formatProviderPreviewPrice(base, 'en', labels)).toMatch(/^from /)
    })
})
