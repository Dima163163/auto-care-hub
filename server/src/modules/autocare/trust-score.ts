export type AutoCareTrustScoreInput = {
    verified: boolean
    rating: number
    reviewCount: number
    yearsActive: number
    profileFields: number
    verifiedEvidenceCount: number
    activeGuaranteeClaims: number
}

export type AutoCareTrustScore = {
    score: number
    badge: 'trusted' | 'quality' | 'new' | null
    factors: {
        profile: number
        reviews: number
        evidence: number
        reliability: number
        claimsPenalty: number
    }
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/**
 * Calculates the public trust signal from observable, auditable inputs.
 * The score is intentionally deterministic and bounded to 0..100 so the
 * same policy can be used by discovery ranking, provider details and admin
 * recalculation jobs without duplicating business rules.
 */
export function calculateAutoCareTrustScore(input: AutoCareTrustScoreInput): AutoCareTrustScore {
    const profile = clamp(input.profileFields, 0, 5) / 5 * 20
    const reviews = clamp(input.rating, 0, 5) / 5 * 30 + Math.min(Math.max(input.reviewCount, 0), 100) / 100 * 15
    const evidence = Math.min(Math.max(input.verifiedEvidenceCount, 0), 5) / 5 * 20
    const reliability = (input.verified ? 10 : 0) + Math.min(Math.max(input.yearsActive, 0), 10) / 10 * 5
    const claimsPenalty = Math.min(Math.max(input.activeGuaranteeClaims, 0), 5) * 5
    const score = Math.round(clamp(profile + reviews + evidence + reliability - claimsPenalty, 0, 100) * 10) / 10

    return {
        score,
        badge: input.verified && input.reviewCount >= 10 && score >= 80
            ? 'trusted'
            : input.verified && score >= 65
                ? 'quality'
                : input.reviewCount < 3
                    ? 'new'
                    : null,
        factors: {
            profile: Math.round(profile * 10) / 10,
            reviews: Math.round(reviews * 10) / 10,
            evidence: Math.round(evidence * 10) / 10,
            reliability: Math.round(reliability * 10) / 10,
            claimsPenalty: Math.round(claimsPenalty * 10) / 10,
        },
    }
}
