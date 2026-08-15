export type RecommendedRankingInput = {
    rating: number
    trustScore: number
    reviewCount: number
    verified: boolean
    distanceKm: number
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

    return (
        ratingScore * 45
        + trustScore * 25
        + reviewConfidence * 15
        + verificationScore * 10
        + distanceScore * 5
    )
}
