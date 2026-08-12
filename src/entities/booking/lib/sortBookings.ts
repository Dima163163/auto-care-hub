import type { Booking } from '../model/types'

export function getBookingDateTime(booking: Booking) {
    const timestamp = new Date(`${booking.date}T${booking.startTime}`).getTime()

    return Number.isNaN(timestamp)
        ? Number.POSITIVE_INFINITY
        : timestamp
}

function compareBookingDateTime(
    firstBooking: Booking,
    secondBooking: Booking,
    direction: 'asc' | 'desc',
) {
    const firstTimestamp = getBookingDateTime(firstBooking)
    const secondTimestamp = getBookingDateTime(secondBooking)
    const isFirstInvalid = firstTimestamp === Number.POSITIVE_INFINITY
    const isSecondInvalid = secondTimestamp === Number.POSITIVE_INFINITY

    if (isFirstInvalid && isSecondInvalid) {
        return 0
    }

    if (isFirstInvalid) {
        return 1
    }

    if (isSecondInvalid) {
        return -1
    }

    return direction === 'asc'
        ? firstTimestamp - secondTimestamp
        : secondTimestamp - firstTimestamp
}

export function sortBookingsByDateAsc<TBooking extends Booking>(
    bookings: TBooking[]
): TBooking[] {
    return [...bookings].sort(
        (firstBooking, secondBooking) =>
            compareBookingDateTime(firstBooking, secondBooking, 'asc'),
    )
}

export function sortBookingsByDateDesc<TBooking extends Booking>(
    bookings: TBooking[]
): TBooking[] {
    return [...bookings].sort(
        (firstBooking, secondBooking) =>
            compareBookingDateTime(firstBooking, secondBooking, 'desc'),
    )
}
