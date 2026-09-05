import { describe, expect, it } from 'vitest'

import { normalizeAutoCareQuoteDecisionInput, normalizeAutoCareServiceQuoteInput } from './quote-input-policy.js'

describe('AutoCare service quote input policy', () => {
    it('normalizes quote metadata and calculates immutable line totals', () => {
        expect(normalizeAutoCareServiceQuoteInput({
            amountMinor: 125_050,
            currencyCode: ' rub ',
            note: '  Замена масла  ',
            lineItems: [{ kind: 'labour', title: '  Работа  ', quantity: 1.5, unitPriceMinor: 50_000 }],
            taxMinor: 5_050,
            feesMinor: 0,
            validUntil: '2026-08-31T23:59:59.000Z',
            priceLocked: true,
        })).toEqual({
            amountMinor: 125_050,
            currencyCode: 'RUB',
            note: 'Замена масла',
            lineItems: [{ kind: 'labour', title: 'Работа', quantity: 1.5, unitPriceMinor: 50_000, totalMinor: 75_000 }],
            taxMinor: 5_050,
            feesMinor: 0,
            validUntil: '2026-08-31T23:59:59.000Z',
            priceLocked: true,
        })
    })

    it('applies safe defaults for optional quote fields', () => {
        expect(normalizeAutoCareServiceQuoteInput({ amountMinor: 2_900, currencyCode: 'USD' })).toEqual({
            amountMinor: 2_900,
            currencyCode: 'USD',
            note: null,
            lineItems: [],
            taxMinor: 0,
            feesMinor: 0,
            validUntil: null,
            priceLocked: false,
        })
    })

    it('rejects malformed direct-service quote values', () => {
        expect(normalizeAutoCareServiceQuoteInput(null)).toBeNull()
        expect(normalizeAutoCareServiceQuoteInput({ amountMinor: Number.NaN, currencyCode: 'USD' })).toBeNull()
        expect(normalizeAutoCareServiceQuoteInput({ amountMinor: 100, currencyCode: 'US' })).toBeNull()
        expect(normalizeAutoCareServiceQuoteInput({ amountMinor: 100, currencyCode: 'USD', priceLocked: 'true' })).toBeNull()
        expect(normalizeAutoCareServiceQuoteInput({ amountMinor: 100, currencyCode: 'USD', validUntil: 'tomorrow' })).toBeNull()
    })

    it('rejects unsafe line items before arithmetic or persistence', () => {
        expect(normalizeAutoCareServiceQuoteInput({ amountMinor: 100, currencyCode: 'USD', lineItems: [{ kind: 'unknown', title: 'Part', quantity: 1, unitPriceMinor: 100 }] })).toBeNull()
        expect(normalizeAutoCareServiceQuoteInput({ amountMinor: 100, currencyCode: 'USD', lineItems: [{ kind: 'part', title: '', quantity: 1, unitPriceMinor: 100 }] })).toBeNull()
        expect(normalizeAutoCareServiceQuoteInput({ amountMinor: 100, currencyCode: 'USD', lineItems: [{ kind: 'part', title: 'Part', quantity: 1, unitPriceMinor: Number.NaN }] })).toBeNull()
    })

    it('normalizes a quote decision revision and rejects stale-shaped input', () => {
        expect(normalizeAutoCareQuoteDecisionInput({ quoteId: '11111111-1111-4111-8111-111111111111', quoteVersion: 2 })).toEqual({
            quoteId: '11111111-1111-4111-8111-111111111111',
            quoteVersion: 2,
        })
        expect(normalizeAutoCareQuoteDecisionInput({ quoteId: 'not-a-uuid', quoteVersion: 2 })).toBeNull()
        expect(normalizeAutoCareQuoteDecisionInput({ quoteId: '11111111-1111-4111-8111-111111111111', quoteVersion: 0 })).toBeNull()
        expect(normalizeAutoCareQuoteDecisionInput({ quoteId: '11111111-1111-4111-8111-111111111111', quoteVersion: 1.5 })).toBeNull()
    })
})
