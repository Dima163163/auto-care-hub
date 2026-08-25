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

    it('rewards explicit service, vehicle, availability and reliability signals', () => {
        const complete = getRecommendedScore({
            rating: 4.5,
            trustScore: 70,
            reviewCount: 40,
            verified: true,
            distanceKm: 8,
            serviceRelevance: 1,
            vehicleRelevance: 1,
            availabilityScore: 1,
            priceCompleteness: 1,
            responseReliability: 0.95,
            bookingReliability: 0.95,
        })
        const incomplete = getRecommendedScore({
            rating: 4.5,
            trustScore: 70,
            reviewCount: 40,
            verified: true,
            distanceKm: 8,
            serviceRelevance: 0.4,
            vehicleRelevance: 0.3,
            availabilityScore: 0,
            priceCompleteness: 0,
            responseReliability: 0.2,
            bookingReliability: 0.2,
        })

        expect(complete).toBeGreaterThan(incomplete)
    })

    it('keeps legacy records neutral when operational evidence is unavailable', () => {
        const base = { rating: 4.6, trustScore: 76, reviewCount: 80, verified: true, distanceKm: 5 }

        expect(getRecommendedScore(base)).toBe(getRecommendedScore({ ...base, serviceRelevance: undefined }))
    })
})
