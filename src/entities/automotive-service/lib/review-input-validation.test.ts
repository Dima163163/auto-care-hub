import { describe, expect, it } from 'vitest'

import { validateAutoCareReview } from './review-input-validation'

describe('validateAutoCareReview', () => {
    it('normalizes valid rating and text', () => {
        expect(validateAutoCareReview('5', '  Great service and clear pricing.  ')).toEqual({
            valid: true,
            rating: 5,
            text: 'Great service and clear pricing.',
        })
    })

    it('rejects ratings outside the API range', () => {
        expect(validateAutoCareReview('0', 'Long enough review text')).toEqual({ valid: false, reason: 'rating' })
        expect(validateAutoCareReview('5.5', 'Long enough review text')).toEqual({ valid: false, reason: 'rating' })
    })

    it('rejects short or oversized text', () => {
        expect(validateAutoCareReview(5, 'too short')).toEqual({ valid: false, reason: 'text' })
        expect(validateAutoCareReview(5, 'x'.repeat(1_001))).toEqual({ valid: false, reason: 'text' })
    })
})
