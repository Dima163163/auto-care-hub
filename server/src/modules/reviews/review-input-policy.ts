import { normalizeTextWhitespace } from '../../shared/security/string-normalization.js'

export const MIN_REVIEW_RATING = 1
export const MAX_REVIEW_RATING = 5
export const MIN_REVIEW_TEXT_LENGTH = 10
export const MAX_REVIEW_TEXT_LENGTH = 1_000
export const MAX_PUBLIC_REVIEWS = 100

export function normalizeReviewText(text: string) {
    const normalized = normalizeTextWhitespace(text).replace(/\s+/g, ' ').trim()
    if (
        normalized.length < MIN_REVIEW_TEXT_LENGTH
        || normalized.length > MAX_REVIEW_TEXT_LENGTH
    ) {
        throw new Error('Review text is invalid.')
    }

    return normalized
}

export function assertReviewRating(rating: number) {
    if (
        !Number.isSafeInteger(rating)
        || rating < MIN_REVIEW_RATING
        || rating > MAX_REVIEW_RATING
    ) {
        throw new Error('Review rating is invalid.')
    }

    return rating
}

export function normalizeReviewInput(input: { rating: number; text: string }) {
    return {
        rating: assertReviewRating(input.rating),
        text: normalizeReviewText(input.text),
    }
}
