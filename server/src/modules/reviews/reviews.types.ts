import type { ReviewStatus } from '../../entities/review/review.entity.js'

export type PublicReviewClient = {
    id: string
    name: string
}

export type PublicReview = {
    id: string
    cabinetId: string
    clientId: string
    rating: number
    text: string
    status: ReviewStatus
    createdAt: Date
    client: PublicReviewClient
}

export type AdminReviewCabinet = {
    id: string
    title: string
}

export type ClientReview = PublicReview & {
    cabinet: AdminReviewCabinet
}

export type AdminReview = ClientReview & {
    bookingId: string
    updatedAt: Date
}
