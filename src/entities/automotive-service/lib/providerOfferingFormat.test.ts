import { describe, expect, it } from 'vitest'

import type { ProviderOffering } from '../model/autocareMockData'

import { formatProviderOfferingDuration, formatProviderOfferingPrice } from './providerOfferingFormat'

const offering: ProviderOffering = {
    id: 'offer-1',
    serviceId: 'oil-change',
    priceLabel: 'от 2 900 ₽',
    price: 2900,
    priceTo: 3500,
    currency: 'RUB',
    priceType: 'range',
    duration: '60 мин',
    durationMinutes: 45,
    durationMinutesTo: 60,
    availability: 'Сегодня',
    includes: [],
}

describe('provider offering formatting', () => {
    it('formats structured ranges using the selected locale', () => {
        expect(formatProviderOfferingPrice(offering, 'en', { from: (price) => `from ${price}`, quoteRequired: 'quote required' })).toMatch(/RUB|₽/)
        expect(formatProviderOfferingPrice(offering, 'ru', { from: (price) => `от ${price}`, quoteRequired: 'цена по запросу' })).toMatch(/2.?900.*3.?500/)
    })

    it('formats from and quote-required offers without raw locale strings', () => {
        expect(formatProviderOfferingPrice({ ...offering, priceTo: null, priceType: 'from' }, 'en', { from: (price) => `from ${price}`, quoteRequired: 'quote required' })).toMatch(/^from /)
        expect(formatProviderOfferingPrice({ ...offering, priceType: 'quote_required' }, 'ru', { from: (price) => `от ${price}`, quoteRequired: 'по запросу' })).toBe('по запросу')
    })

    it('formats duration ranges and keeps legacy labels as a fallback', () => {
        expect(formatProviderOfferingDuration(offering, 'ru')).toMatch(/45.*60.*мин/)
        expect(formatProviderOfferingDuration({ ...offering, durationMinutes: undefined }, 'en')).toBe('60 мин')
        expect(formatProviderOfferingPrice({ ...offering, price: undefined, currency: undefined }, 'en', { from: (price) => `from ${price}`, quoteRequired: 'quote required' })).toBe('от 2 900 ₽')
    })
})
