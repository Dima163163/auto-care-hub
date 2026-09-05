import { describe, expect, it } from 'vitest'

import {
    normalizeAutoCareReviewPromoCode,
    normalizeAutoCareReviewPromoInput,
    normalizeAutoCareReviewUuid,
} from './review-input-policy.js'

const providerId = '11111111-1111-4111-8111-111111111111'

describe('review input boundary policy', () => {
    it('canonicalizes provider/review identifiers', () => {
        expect(normalizeAutoCareReviewUuid(` ${providerId.toUpperCase()} `)).toBe(providerId)
        expect(normalizeAutoCareReviewUuid('not-a-uuid')).toBeNull()
    })

    it('normalizes owner review promo input and applies the route default', () => {
        expect(normalizeAutoCareReviewPromoInput({ discountPercent: 15, serviceSlug: '  brake-pads ', expiresInDays: undefined })).toEqual({
            discountPercent: 15,
            serviceSlug: 'brake-pads',
            expiresInDays: 30,
        })
        expect(normalizeAutoCareReviewPromoInput({ discountPercent: 10, serviceSlug: null, expiresInDays: 7 })).toEqual({
            discountPercent: 10,
            serviceSlug: null,
            expiresInDays: 7,
        })
    })

    it('rejects malformed promo payloads and unsupported fields', () => {
        expect(normalizeAutoCareReviewPromoInput({ discountPercent: 0 })).toBeNull()
        expect(normalizeAutoCareReviewPromoInput({ discountPercent: 10, expiresInDays: 91 })).toBeNull()
        expect(normalizeAutoCareReviewPromoInput({ discountPercent: 10, serviceSlug: '' })).toBeNull()
        expect(normalizeAutoCareReviewPromoInput({ discountPercent: 10, unexpected: true })).toBeNull()
    })

    it('canonicalizes promo codes and fails closed for malformed values', () => {
        expect(normalizeAutoCareReviewPromoCode(' care-ab12CD34 ')).toEqual({ code: 'CARE-AB12CD34' })
        expect(normalizeAutoCareReviewPromoCode('CARE-ABC')).toBeNull()
        expect(normalizeAutoCareReviewPromoCode(null)).toBeNull()
    })
})
