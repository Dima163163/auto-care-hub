import { describe, expect, it } from 'vitest'

import { normalizeAutoCareServiceOfferDecision, normalizeAutoCareServiceOfferInput } from './offer-policy.js'

describe('AutoCare service offer policy', () => {
    it('normalizes a valid discount offer into a canonical persisted shape', () => {
        expect(normalizeAutoCareServiceOfferInput({
            type: 'discount',
            title: '  Скидка на повторный визит  ',
            description: '  Действует семь дней.  ',
            discountPercent: 15,
            couponCode: ' save-15 ',
            amountMinor: 125_000,
            currencyCode: ' rub ',
            expiresAt: '2026-08-21T23:59:59.000Z',
        })).toEqual({
            type: 'discount',
            title: 'Скидка на повторный визит',
            description: 'Действует семь дней.',
            discountPercent: 15,
            couponCode: 'SAVE-15',
            amountMinor: 125_000,
            currencyCode: 'RUB',
            expiresAt: '2026-08-21T23:59:59.000Z',
        })
    })

    it('requires discount fields and paired amount/currency values', () => {
        expect(normalizeAutoCareServiceOfferInput({ type: 'discount', title: 'Без процента' })).toBeNull()
        expect(normalizeAutoCareServiceOfferInput({ type: 'alternative', title: 'Без валюты', amountMinor: 100 })).toBeNull()
        expect(normalizeAutoCareServiceOfferInput({ type: 'alternative', title: 'Лишняя скидка', discountPercent: 10 })).toBeNull()
    })

    it('rejects malformed direct-service values instead of persisting them', () => {
        expect(normalizeAutoCareServiceOfferInput(null)).toBeNull()
        expect(normalizeAutoCareServiceOfferInput({ type: 'discount', title: 'x'.repeat(161), discountPercent: 10 })).toBeNull()
        expect(normalizeAutoCareServiceOfferInput({ type: 'discount', title: 'Купон', discountPercent: 10, couponCode: 'bad!' })).toBeNull()
        expect(normalizeAutoCareServiceOfferInput({ type: 'discount', title: 'Срок', discountPercent: 10, expiresAt: 'not-a-date+03:00' })).toBeNull()
    })

    it('accepts only the persisted offer decision values', () => {
        expect(normalizeAutoCareServiceOfferDecision('accept')).toBe('accept')
        expect(normalizeAutoCareServiceOfferDecision('decline')).toBe('decline')
        expect(normalizeAutoCareServiceOfferDecision(' ACCEPT ')).toBeNull()
        expect(normalizeAutoCareServiceOfferDecision({ decision: 'accept' })).toBeNull()
    })
})
