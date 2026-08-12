import { describe, expect, it } from 'vitest'

import { assertReviewStatus } from './review-status-policy.js'

describe('review status policy', () => {
    it('accepts known statuses', () => {
        expect(assertReviewStatus('approved')).toBe('approved')
    })

    it('rejects unknown statuses before persistence', () => {
        expect(() => assertReviewStatus('published')).toThrow(/status/)
    })
})
