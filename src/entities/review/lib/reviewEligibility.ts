import type { ClientBooking } from '@/entities/booking'
import type { Review } from '../model/types'

export function canCreateCabinetReview(input: {
    cabinetId: string
    bookings: ClientBooking[]
    reviews: Review[]
}) {
    const reviewedBookingIds = new Set(
        input.reviews.map((review) => review.clientId)
    )

    return input.bookings.some((booking) =>
        booking.cabinetId === input.cabinetId &&
        booking.status === 'completed' &&
        !reviewedBookingIds.has(booking.clientId)
    )
}
