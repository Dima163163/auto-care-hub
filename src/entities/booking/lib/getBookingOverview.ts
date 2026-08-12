import type { Booking } from '../model/types'

import {
    groupBookingsByStatus,
    type GroupedBookings,
} from './groupBookingsByStatus'

export type BookingOverview<TBooking extends Booking = Booking> =
    GroupedBookings<TBooking> & {
    totalBookingsCount: number
    upcomingBookingsCount: number
    cancelledBookingsCount: number
    completedBookingsCount: number
}

export function getBookingOverview<TBooking extends Booking>(
    bookings: TBooking[]
): BookingOverview<TBooking> {
    const {
        upcomingBookings,
        cancelledBookings,
        completedBookings,
    } = groupBookingsByStatus(bookings)

    return {
        upcomingBookings,
        cancelledBookings,
        completedBookings,
        totalBookingsCount: bookings.length,
        upcomingBookingsCount: upcomingBookings.length,
        cancelledBookingsCount: cancelledBookings.length,
        completedBookingsCount: completedBookings.length,
    }
}