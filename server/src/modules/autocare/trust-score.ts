export type AutoCareTrustScoreInput = {
    verified: boolean
    rating: number
    reviewCount: number
    yearsActive: number
    profileFields: number
    verifiedEvidenceCount: number
    activeGuaranteeClaims: number
    completedInteractionCount?: number
    cancelledInteractionCount?: number
    noShowInteractionCount?: number
    /** Average rating delta for recent eligible reviews versus the prior period. */
    recentRatingTrend?: number
    /** Share of completed visits with an open complaint/guarantee claim. */
    complaintRate?: number
    /** Average minutes until the first provider response. */
    responseTimeMinutes?: number
    /** Share of accepted quotes whose final amount matched the accepted snapshot. */
    priceAccuracyRate?: number
    /** Open critical moderation/safety/fraud violations. */
    moderationViolationCount?: number
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
        qualitySignals: number
        moderationPenalty: number
        confidence: number
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
    const reviewCount = Math.max(input.reviewCount, 0)
    const adjustedRating = reviewCount > 0
        ? (clamp(input.rating, 0, 5) * reviewCount + 4.2 * 5) / (reviewCount + 5)
        : 4.2
    const confidence = Math.min(reviewCount, 100) / 100 * 15
    const reviews = adjustedRating / 5 * 30 + confidence
    const evidence = Math.min(Math.max(input.verifiedEvidenceCount, 0), 5) / 5 * 20
    const completedInteractions = Math.max(input.completedInteractionCount ?? 0, 0)
    const failedInteractions = Math.max(input.cancelledInteractionCount ?? 0, 0) + Math.max(input.noShowInteractionCount ?? 0, 0)
    const interactionCount = completedInteractions + failedInteractions
    const completionRate = interactionCount > 0 ? completedInteractions / interactionCount : 0
    const noShowRate = interactionCount > 0 ? Math.max(input.noShowInteractionCount ?? 0, 0) / interactionCount : 0
    const reliability = (input.verified ? 7 : 0) + Math.min(Math.max(input.yearsActive, 0), 10) / 10 * 3 + completionRate * 5
    const claimsPenalty = Math.min(Math.max(input.activeGuaranteeClaims, 0), 5) * 5
    const complaintRate = clamp(input.complaintRate ?? 0, 0, 1)
    const trend = clamp(input.recentRatingTrend ?? 0, -1, 1)
    const responseSignal = input.responseTimeMinutes === undefined
        ? 0
        : clamp(1 - input.responseTimeMinutes / (24 * 60), 0, 1) * 3
    const priceSignal = input.priceAccuracyRate === undefined
        ? 0
        : clamp(input.priceAccuracyRate, 0, 1) * 2
    const qualitySignals = trend * 3 + responseSignal + priceSignal - complaintRate * 10
    const moderationPenalty = Math.min(Math.max(input.moderationViolationCount ?? 0, 0), 4) * 10
    const score = Math.round(clamp(profile + reviews + evidence + reliability + qualitySignals - claimsPenalty - moderationPenalty, 0, 100) * 10) / 10
    const trustedRating = adjustedRating >= 4.2
    const trustedReliability = noShowRate <= 0.1 && complaintRate <= 0.1
    const trustedPricing = input.priceAccuracyRate === undefined || input.priceAccuracyRate >= 0.9

    return {
        score,
        badge: input.verified && completedInteractions >= 10 && reviewCount >= 5 && trustedRating && trustedReliability && trustedPricing && (input.moderationViolationCount ?? 0) === 0 && score >= 80
            ? 'trusted'
            : input.verified && completedInteractions >= 1 && score >= 65
                ? 'quality'
                : reviewCount < 3
                    ? 'new'
                    : null,
        factors: {
            profile: Math.round(profile * 10) / 10,
            reviews: Math.round(reviews * 10) / 10,
            evidence: Math.round(evidence * 10) / 10,
            reliability: Math.round(reliability * 10) / 10,
            claimsPenalty: Math.round(claimsPenalty * 10) / 10,
            qualitySignals: Math.round(qualitySignals * 10) / 10,
            moderationPenalty: Math.round(moderationPenalty * 10) / 10,
            confidence: Math.round(confidence * 10) / 10,
        },
    }
}
