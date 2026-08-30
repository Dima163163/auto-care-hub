import { describe, expect, it } from 'vitest'

import { validateChatOffer } from './chat-offer-validation'

const baseDraft = {
    type: 'discount' as const,
    title: 'Discount on service',
    description: 'Includes parts and labour.',
    discountPercent: '15',
    couponCode: 'SAVE-15',
    amount: '',
}

describe('validateChatOffer', () => {
    it('normalizes a discount offer and optional coupon', () => {
        expect(validateChatOffer({ ...baseDraft, title: '  Discount on service  ', couponCode: ' save-15 ' })).toEqual({
            valid: true,
            title: 'Discount on service',
            description: 'Includes parts and labour.',
            discountPercent: 15,
            couponCode: 'SAVE-15',
            amountMinor: null,
            currencyCode: null,
        })
    })

    it('rejects invalid discount and coupon values', () => {
        expect(validateChatOffer({ ...baseDraft, discountPercent: '0' })).toMatchObject({ valid: false, reason: 'discountPercent' })
        expect(validateChatOffer({ ...baseDraft, couponCode: 'no' })).toMatchObject({ valid: false, reason: 'couponCode' })
    })

    it('normalizes an alternative price to minor currency units', () => {
        expect(validateChatOffer({ ...baseDraft, type: 'alternative', discountPercent: '', couponCode: '', amount: '1250.50' })).toMatchObject({
            valid: true,
            amountMinor: 125050,
            currencyCode: 'RUB',
        })
    })

    it('rejects malformed or out-of-range alternative prices', () => {
        expect(validateChatOffer({ ...baseDraft, type: 'alternative', amount: 'NaN' })).toMatchObject({ valid: false, reason: 'amount' })
        expect(validateChatOffer({ ...baseDraft, type: 'alternative', amount: '-10' })).toMatchObject({ valid: false, reason: 'amount' })
    })

    it('rejects empty and oversized titles/descriptions', () => {
        expect(validateChatOffer({ ...baseDraft, title: ' ' })).toMatchObject({ valid: false, reason: 'title' })
        expect(validateChatOffer({ ...baseDraft, description: 'x'.repeat(4_001) })).toMatchObject({ valid: false, reason: 'description' })
    })
})
