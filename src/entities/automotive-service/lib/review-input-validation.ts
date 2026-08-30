export type AutoCareReviewValidation =
    | { valid: true; rating: number; text: string }
    | { valid: false; reason: 'rating' | 'text' }

export function validateAutoCareReview(rating: string | number, text: string): AutoCareReviewValidation {
    const parsedRating = typeof rating === 'number' ? rating : Number(rating)
    const normalizedText = text.trim()

    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
        return { valid: false, reason: 'rating' }
    }
    if (normalizedText.length < 10 || normalizedText.length > 1_000) {
        return { valid: false, reason: 'text' }
    }

    return { valid: true, rating: parsedRating, text: normalizedText }
}
