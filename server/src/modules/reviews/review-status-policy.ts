import { ReviewStatus } from '../../entities/review/review.entity.js'

export function assertReviewStatus(value: string) {
    if (!Object.values(ReviewStatus).includes(value as ReviewStatus)) {
        throw new Error('Review status is invalid.')
    }
    return value as ReviewStatus
}
