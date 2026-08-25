import type { PlatformReviewStatus } from '../../entities/platform-review/platform-review.entity.js'

export type PlatformReviewResponse = {
    id: string
    authorName: string
    avatarUrl: string | null
    authorRole: string
    rating: number
    text: string
    status: PlatformReviewStatus
    organizationResponse: string | null
    organizationRespondedAt: string | null
    createdAt: string
}

export type CreatePlatformReviewInput = { rating: number; text: string }
export type RespondPlatformReviewInput = { response: string }
