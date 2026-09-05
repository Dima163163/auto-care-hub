import { describe, expect, it } from 'vitest'

import {
    normalizePlatformReviewCreateInput,
    normalizePlatformReviewResponseInput,
    normalizePlatformReviewUuid,
    normalizePlatformReviewsLimit,
} from './platform-reviews-input-policy.js'

describe('platform review input policy', () => {
    it('normalizes review text and idempotency keys', () => {
        expect(normalizePlatformReviewCreateInput({ rating: 5, text: '  Отличный сервис, всё понятно.  ', idempotencyKey: ' review_123 ' })).toEqual({
            rating: 5,
            text: 'Отличный сервис, всё понятно.',
            idempotencyKey: 'review_123',
        })
    })

    it('rejects malformed ratings, text and idempotency keys', () => {
        expect(normalizePlatformReviewCreateInput({ rating: 4.5, text: 'Достаточно длинный текст' })).toBeNull()
        expect(normalizePlatformReviewCreateInput({ rating: 5, text: 'коротко' })).toBeNull()
        expect(normalizePlatformReviewCreateInput({ rating: 5, text: 'Достаточно длинный текст', idempotencyKey: 'unsafe key' })).toBeNull()
    })

    it('rejects unsupported create fields', () => {
        expect(normalizePlatformReviewCreateInput({ rating: 5, text: 'Достаточно длинный текст', status: 'approved' })).toBeNull()
    })

    it('normalizes moderator response text and rejects unknown fields', () => {
        expect(normalizePlatformReviewResponseInput({ response: '  Спасибо за отзыв!  ' })).toEqual({ response: 'Спасибо за отзыв!' })
        expect(normalizePlatformReviewResponseInput({ response: 'Спасибо!', status: 'approved' })).toBeNull()
    })

    it('normalizes review ids and rejects malformed ids', () => {
        expect(normalizePlatformReviewUuid(' 00000000-0000-4000-8000-000000000001 ')).toBe('00000000-0000-4000-8000-000000000001')
        expect(normalizePlatformReviewUuid('review-1')).toBeNull()
    })

    it('bounds public list limits and applies the route default', () => {
        expect(normalizePlatformReviewsLimit(undefined)).toBe(30)
        expect(normalizePlatformReviewsLimit(50)).toBe(50)
        expect(normalizePlatformReviewsLimit(0)).toBeNull()
        expect(normalizePlatformReviewsLimit(1.5)).toBeNull()
    })
})
