import { describe, expect, it } from 'vitest'

import {
    MAX_PUBLIC_REVIEWS,
    MAX_REVIEW_TEXT_LENGTH,
    normalizeReviewInput,
    normalizeReviewText,
} from './review-input-policy.js'

describe('review input policy', () => {
    it('normalizes bounded review input', () => {
        expect(normalizeReviewInput({ rating: 5, text: '  Great\nservice  ' })).toEqual({
            rating: 5,
            text: 'Great service',
        })
        expect(MAX_PUBLIC_REVIEWS).toBe(100)
    })

    it('rejects invalid ratings and text lengths', () => {
        expect(() => normalizeReviewInput({ rating: 6, text: 'valid review text' })).toThrow(/rating/)
        expect(() => normalizeReviewText('x'.repeat(MAX_REVIEW_TEXT_LENGTH + 1))).toThrow(/text/)
        expect(() => normalizeReviewText('short')).toThrow(/text/)
    })
})
