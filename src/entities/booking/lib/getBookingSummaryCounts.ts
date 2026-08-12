import type { Booking } from '../model/types'

import { groupBookingsByStatus } from './groupBookingsByStatus'

export function getBookingSummaryCounts<TBooking extends Booking>(
    bookings: TBooking[]
) {
    const {
        upcomingBookings,
        cancelledBookings,
        completedBookings,
    } = groupBookingsByStatus(bookings)

    return {
        totalBookingsCount: bookings.length,
        upcomingBookingsCount: upcomingBookings.length,
        cancelledBookingsCount: cancelledBookings.length,
        completedBookingsCount: completedBookings.length,
    }
}