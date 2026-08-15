import { describe, expect, it } from 'vitest'

import { getRecommendedScore } from './autocare-ranking.js'

describe('getRecommendedScore', () => {
    it('prioritizes verified, trusted services without using paid placement', () => {
        const strong = getRecommendedScore({ rating: 4.8, trustScore: 92, reviewCount: 260, verified: true, distanceKm: 3 })
        const weak = getRecommendedScore({ rating: 4.5, trustScore: 55, reviewCount: 20, verified: false, distanceKm: 8 })

        expect(strong).toBeGreaterThan(weak)
    })

    it('is deterministic and clamps malformed metric values', () => {
        const input = { rating: 6, trustScore: 120, reviewCount: -10, verified: true, distanceKm: -4 }

        expect(getRecommendedScore(input)).toBe(getRecommendedScore(input))
        expect(getRecommendedScore(input)).toBeCloseTo(85, 5)
    })
})
