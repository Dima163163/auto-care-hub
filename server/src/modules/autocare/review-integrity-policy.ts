export type ReviewIntegritySample = {
    clientId: string | null
    providerId: string
    serviceRequestId: string | null
    text: string
    rating: number
    createdAt: Date
}

export type ReviewIntegrityAssessment = {
    flags: Array<'duplicate_request' | 'duplicate_text' | 'coordinated_burst'>
    recencyWeight: number
    needsModeration: boolean
}

const COORDINATED_WINDOW_MS = 10 * 60 * 1_000
const TEXT_DUPLICATE_WINDOW_MS = 90 * 24 * 60 * 60 * 1_000
const RECENCY_HALF_LIFE_MS = 180 * 24 * 60 * 60 * 1_000

export function normalizeReviewText(value: string) {
    return value
        .normalize('NFKC')
        .toLocaleLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim()
}

/**
 * Returns explainable, deterministic signals for the moderation queue. This
 * helper never changes the rating itself: it only marks a review for review
 * and supplies a decay weight for analytics/ranking experiments.
 */
export function assessReviewIntegrity(input: ReviewIntegritySample, recent: readonly ReviewIntegritySample[], now = new Date()): ReviewIntegrityAssessment {
    const text = normalizeReviewText(input.text)
    const flags = new Set<ReviewIntegrityAssessment['flags'][number]>()
    if (input.serviceRequestId && recent.some((item) => item.serviceRequestId === input.serviceRequestId)) flags.add('duplicate_request')

    const duplicateText = recent.some((item) => item.clientId === input.clientId
        && item.providerId === input.providerId
        && Math.abs(item.createdAt.getTime() - input.createdAt.getTime()) <= TEXT_DUPLICATE_WINDOW_MS
        && normalizeReviewText(item.text) === text)
    if (duplicateText) flags.add('duplicate_text')

    const burst = recent.filter((item) => item.providerId === input.providerId
        && item.rating === input.rating
        && Math.abs(item.createdAt.getTime() - input.createdAt.getTime()) <= COORDINATED_WINDOW_MS)
    const distinctClients = new Set(burst.map((item) => item.clientId).filter((clientId): clientId is string => Boolean(clientId)))
    if (distinctClients.size >= 3) flags.add('coordinated_burst')

    const age = Math.max(0, now.getTime() - input.createdAt.getTime())
    const recencyWeight = Math.round(Math.exp(-age / RECENCY_HALF_LIFE_MS) * 10_000) / 10_000
    return { flags: [...flags], recencyWeight, needsModeration: flags.size > 0 }
}
