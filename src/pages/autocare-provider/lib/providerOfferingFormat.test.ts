import { describe, expect, it } from 'vitest'

import type { ProviderOffering } from '@/entities/automotive-service'

import { formatProviderOfferingPrice } from './providerOfferingFormat'

const offering: ProviderOffering = {
    id: 'offer-1',
    serviceId: 'oil-change',
    priceLabel: 'от 2 900 ₽',
    price: 2900,
    priceTo: 3500,
    currency: 'RUB',
    priceType: 'range',
    duration: '60 мин',
    availability: 'Сегодня',
    includes: [],
}

describe('provider offering price formatting', () => {
    it('formats structured ranges using the selected locale', () => {
        expect(formatProviderOfferingPrice(offering, 'en', { from: (price) => `from ${price}`, quoteRequired: 'quote required' })).toMatch(/RUB|₽/)
        expect(formatProviderOfferingPrice(offering, 'ru', { from: (price) => `от ${price}`, quoteRequired: 'цена по запросу' })).toMatch(/2.?900.*3.?500/)
    })

    it('formats from and quote-required offers without raw locale strings', () => {
        expect(formatProviderOfferingPrice({ ...offering, priceTo: null, priceType: 'from' }, 'en', { from: (price) => `from ${price}`, quoteRequired: 'quote required' })).toMatch(/^from /)
        expect(formatProviderOfferingPrice({ ...offering, priceType: 'quote_required' }, 'ru', { from: (price) => `от ${price}`, quoteRequired: 'по запросу' })).toBe('по запросу')
    })

    it('keeps the legacy label when structured pricing is unavailable', () => {
        expect(formatProviderOfferingPrice({ ...offering, price: undefined, currency: undefined }, 'en', { from: (price) => `from ${price}`, quoteRequired: 'quote required' })).toBe('от 2 900 ₽')
    })
})
