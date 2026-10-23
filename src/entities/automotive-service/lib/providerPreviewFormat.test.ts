import { describe, expect, it } from 'vitest'
import { formatProviderPreviewAvailability, formatProviderPreviewPrice, formatProviderPreviewWarranty } from './providerPreviewFormat'

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
        expect(formatProviderPreviewPrice({ ...base, priceType: 'range', priceTo: null }, 'en', labels)).toMatch(/^from /)
    })

    it('does not promise a confirmed slot for request or quote offers', () => {
        const slot = 'Today, 11:30'
        expect(formatProviderPreviewAvailability({ bookingMode: 'request', priceType: 'fixed', nextSlot: slot }, 'en', 'On request')).toBe('On request')
        expect(formatProviderPreviewAvailability({ bookingMode: 'instant', priceType: 'quote_required', nextSlot: slot }, 'en', 'On request')).toBe('On request')
        expect(formatProviderPreviewAvailability({ bookingMode: 'instant', priceType: 'fixed', nextSlot: slot }, 'en', 'On request')).toBe('Today, 11:30')
    })

    it('prefers the actual warranty terms over a month count', () => {
        expect(formatProviderPreviewWarranty({ warrantyText: ' Labor only ', warrantyMonths: 12 }, (count) => `${count} months`)).toBe('Labor only')
        expect(formatProviderPreviewWarranty({ warrantyText: null, warrantyMonths: 12 }, (count) => `${count} months`)).toBe('12 months')
        expect(formatProviderPreviewWarranty({ warrantyText: null, warrantyMonths: null }, (count) => `${count} months`)).toBeNull()
    })
})
