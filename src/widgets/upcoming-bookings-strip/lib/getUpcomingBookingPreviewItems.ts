import type { ClientBooking } from '@/entities/booking'
import { getBookingDateTime, sortBookingsByDateAsc } from '@/entities/booking'

const UPCOMING_STATUSES = new Set(['pending', 'confirmed'])

function getBookingEndTimestamp(booking: ClientBooking) {
    const timestamp = new Date(`${booking.date}T${booking.endTime}`).getTime()

    return Number.isNaN(timestamp)
        ? Number.NEGATIVE_INFINITY
        : timestamp
}

export function getUpcomingBookingPreviewItems(
    bookings: ClientBooking[],
    limit = 2,
    currentDate = new Date(),
) {
    const currentTimestamp = currentDate.getTime()

    return sortBookingsByDateAsc(
        bookings.filter(
            (booking) =>
                UPCOMING_STATUSES.has(booking.status) &&
                getBookingDateTime(booking) !== Number.POSITIVE_INFINITY &&
                getBookingEndTimestamp(booking) >= currentTimestamp,
        ),
    ).slice(0, limit)
}
