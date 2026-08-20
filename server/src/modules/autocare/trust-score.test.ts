import { describe, expect, it } from 'vitest'

import { calculateAutoCareTrustScore } from './trust-score.js'

describe('calculateAutoCareTrustScore', () => {
    it('rewards verified, complete and consistently reviewed services', () => {
        const result = calculateAutoCareTrustScore({
            verified: true,
            rating: 4.8,
            reviewCount: 96,
            yearsActive: 6,
            profileFields: 5,
            verifiedEvidenceCount: 4,
            activeGuaranteeClaims: 0,
            completedInteractionCount: 20,
        })

        expect(result.score).toBeGreaterThanOrEqual(80)
        expect(result.badge).toBe('trusted')
    })

    it('does not allow a high rating to hide unresolved guarantee claims', () => {
        const result = calculateAutoCareTrustScore({
            verified: true,
            rating: 5,
            reviewCount: 100,
            yearsActive: 10,
            profileFields: 5,
            verifiedEvidenceCount: 5,
            activeGuaranteeClaims: 5,
            completedInteractionCount: 20,
        })

        expect(result.score).toBeLessThan(100)
        expect(result.factors.claimsPenalty).toBe(25)
    })

    it('does not award a quality badge before a confirmed visit is completed', () => {
        const result = calculateAutoCareTrustScore({
            verified: true,
            rating: 5,
            reviewCount: 20,
            yearsActive: 5,
            profileFields: 5,
            verifiedEvidenceCount: 5,
            activeGuaranteeClaims: 0,
        })

        expect(result.badge).toBeNull()
    })
})
