import type { ReviewEntity } from '../../entities/review/review.entity.js'
import type { AdminReview, ClientReview, PublicReview } from './reviews.types.js'

export function toPublicReview(review: ReviewEntity): PublicReview {
    return {
        id: review.id,
        cabinetId: review.cabinetId,
        clientId: review.clientId,
        rating: review.rating,
        text: review.text,
        status: review.status,
        createdAt: review.createdAt,
        client: {
            id: review.client.id,
            name: review.client.name,
        },
    }
}

export function toAdminReview(review: ReviewEntity): AdminReview {
    return {
        ...toPublicReview(review),
        bookingId: review.bookingId,
        updatedAt: review.updatedAt,
        cabinet: {
            id: review.cabinet.id,
            title: review.cabinet.title,
        },
    }
}

export function toClientReview(review: ReviewEntity): ClientReview {
    return {
        ...toPublicReview(review),
        cabinet: {
            id: review.cabinet.id,
            title: review.cabinet.title,
        },
    }
}
