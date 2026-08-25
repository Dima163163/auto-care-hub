export type RecommendedRankingInput = {
    rating: number
    trustScore: number
    reviewCount: number
    verified: boolean
    distanceKm: number
    serviceRelevance?: number
    vehicleRelevance?: number
    availabilityScore?: number
    priceCompleteness?: number
    responseReliability?: number
    bookingReliability?: number
}

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max)
}

/**
 * Organic ranking is deliberately independent from subscriptions, promotions
 * and any paid placement signal. Keep the inputs explicit so a future plan
 * field cannot silently affect discovery ordering.
 */
export function getRecommendedScore(input: RecommendedRankingInput) {
    const ratingScore = clamp(input.rating, 0, 5) / 5
    const trustScore = clamp(input.trustScore, 0, 100) / 100
    const reviewConfidence = clamp(Math.log10(Math.max(input.reviewCount, 0) + 1) / 3, 0, 1)
    const distanceScore = clamp(1 - Math.max(input.distanceKm, 0) / 50, 0, 1)
    const verificationScore = input.verified ? 1 : 0

    // Optional operational signals are neutral when unavailable. This keeps
    // legacy records stable while rewarding complete, observable offers.
    const operationalSignals = [
        input.serviceRelevance,
        input.vehicleRelevance,
        input.availabilityScore,
        input.priceCompleteness,
        input.responseReliability,
        input.bookingReliability,
    ]
    const availableOperationalSignals = operationalSignals.filter((value): value is number => value !== undefined)
    const operationalScore = availableOperationalSignals.length === 0
        ? 0.5
        : availableOperationalSignals.reduce((sum, value) => sum + clamp(value, 0, 1), 0) / availableOperationalSignals.length
    const operationalMultiplier = 1 + (operationalScore - 0.5) * 0.1

    return Math.min(100, (
        ratingScore * 45
        + trustScore * 25
        + reviewConfidence * 15
        + verificationScore * 10
        + distanceScore * 5
    ) * operationalMultiplier)
}
