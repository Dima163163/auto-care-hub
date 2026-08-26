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
            yearsActive: 10,
            profileFields: 5,
            verifiedEvidenceCount: 5,
            activeGuaranteeClaims: 0,
        })

        expect(result.badge).toBeNull()
    })

    it('uses a sample-size-adjusted rating for the trusted badge', () => {
        const smallSample = calculateAutoCareTrustScore({
            verified: true,
            rating: 5,
            reviewCount: 1,
            yearsActive: 5,
            profileFields: 5,
            verifiedEvidenceCount: 5,
            activeGuaranteeClaims: 0,
            completedInteractionCount: 10,
        })
        const stableSample = calculateAutoCareTrustScore({
            verified: true,
            rating: 4.3,
            reviewCount: 5,
            yearsActive: 10,
            profileFields: 5,
            verifiedEvidenceCount: 5,
            activeGuaranteeClaims: 0,
            completedInteractionCount: 10,
        })

        expect(smallSample.badge).not.toBe('trusted')
        expect(stableSample.badge).toBe('trusted')
        expect(stableSample.factors.confidence).toBeGreaterThan(0)
    })

    it('penalizes observable complaints and unresolved critical violations', () => {
        const result = calculateAutoCareTrustScore({
            verified: true,
            rating: 4.8,
            reviewCount: 20,
            yearsActive: 8,
            profileFields: 5,
            verifiedEvidenceCount: 5,
            activeGuaranteeClaims: 0,
            completedInteractionCount: 20,
            complaintRate: 0.2,
            moderationViolationCount: 1,
            recentRatingTrend: -0.5,
        })

        expect(result.factors.qualitySignals).toBeLessThan(0)
        expect(result.factors.moderationPenalty).toBe(10)
        expect(result.badge).not.toBe('trusted')
    })

    it('removes the trusted badge when a critical moderation violation is opened', () => {
        const result = calculateAutoCareTrustScore({
            verified: true,
            rating: 4.9,
            reviewCount: 40,
            yearsActive: 8,
            profileFields: 5,
            verifiedEvidenceCount: 5,
            activeGuaranteeClaims: 0,
            completedInteractionCount: 30,
            moderationViolationCount: 1,
        })

        expect(result.badge).not.toBe('trusted')
    })

    it('restores the trusted badge after the violation is resolved', () => {
        const result = calculateAutoCareTrustScore({
            verified: true,
            rating: 4.9,
            reviewCount: 40,
            yearsActive: 8,
            profileFields: 5,
            verifiedEvidenceCount: 5,
            activeGuaranteeClaims: 0,
            completedInteractionCount: 30,
            moderationViolationCount: 0,
        })

        expect(result.badge).toBe('trusted')
    })
})
