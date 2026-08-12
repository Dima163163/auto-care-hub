import type { Booking } from '../model/types'

import {
    sortBookingsByDateAsc,
    sortBookingsByDateDesc,
} from './sortBookings'

export type GroupedBookings<TBooking extends Booking = Booking> = {
    upcomingBookings: TBooking[]
    cancelledBookings: TBooking[]
    completedBookings: TBooking[]
}

export function groupBookingsByStatus<TBooking extends Booking>(
    bookings: TBooking[]
): GroupedBookings<TBooking> {
    const upcomingBookings = sortBookingsByDateAsc(
        bookings.filter(
            (booking) =>
                booking.status === 'pending' ||
                booking.status === 'confirmed',
        ),
    )

    const cancelledBookings = sortBookingsByDateDesc(
        bookings.filter((booking) => booking.status === 'cancelled'),
    )

    const completedBookings = sortBookingsByDateDesc(
        bookings.filter((booking) => booking.status === 'completed'),
    )

    return {
        upcomingBookings,
        cancelledBookings,
        completedBookings,
    }
}