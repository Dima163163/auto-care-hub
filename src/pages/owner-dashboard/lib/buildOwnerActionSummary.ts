import type { BookingRescheduleRequest, OwnerBooking } from '@/entities/booking'
import type { Cabinet } from '@/entities/cabinet'
import type { OwnerReadiness } from '@/entities/payment'

export const OWNER_ACTION_QUERY_LIMIT = 50

export type OwnerActionSummary = {
    pendingBookings: number
    pendingReschedules: number
    draftCabinets: number
    blockedCabinets: number
    readinessBlockers: OwnerReadiness['blockers']
    pendingBookingsOlderThan24Hours: number
    pendingReschedulesOlderThan24Hours: number
    oldestPendingBookingAt: string | null
    oldestPendingRescheduleAt: string | null
}

type BuildOwnerActionSummaryInput = {
    bookings: OwnerBooking[]
    rescheduleRequests: BookingRescheduleRequest[]
    cabinets: Cabinet[]
    readiness: OwnerReadiness | null
    now?: Date
}

function getValidTimestamp(value: string) {
    const timestamp = Date.parse(value)

    return Number.isFinite(timestamp) ? timestamp : null
}

function getOldestTimestamp(values: string[]) {
    return values.reduce<string | null>((oldest, value) => {
        const timestamp = getValidTimestamp(value)

        if (timestamp === null) {
            return oldest
        }

        if (!oldest) {
            return value
        }

        const oldestTimestamp = getValidTimestamp(oldest)

        return oldestTimestamp === null || timestamp < oldestTimestamp ? value : oldest
    }, null)
}

function countOlderThan24Hours(values: string[], now: number) {
    const dayInMilliseconds = 24 * 60 * 60 * 1000

    return values.filter((value) => {
        const timestamp = getValidTimestamp(value)

        return timestamp !== null && now - timestamp >= dayInMilliseconds
    }).length
}

export function buildOwnerActionSummary({
    bookings,
    rescheduleRequests,
    cabinets,
    readiness,
    now = new Date(),
}: BuildOwnerActionSummaryInput): OwnerActionSummary {
    const pendingBookingCreatedAt = bookings
        .filter((booking) => booking.status === 'pending')
        .map((booking) => booking.createdAt)
    const pendingRescheduleCreatedAt = rescheduleRequests
        .filter((request) => request.status === 'pending')
        .map((request) => request.createdAt)
    const nowTimestamp = now.getTime()

    return {
        pendingBookings: pendingBookingCreatedAt.length,
        pendingReschedules: pendingRescheduleCreatedAt.length,
        draftCabinets: cabinets.filter((cabinet) => cabinet.status === 'draft').length,
        blockedCabinets: cabinets.filter((cabinet) => cabinet.status === 'blocked').length,
        readinessBlockers: readiness?.blockers ?? [],
        pendingBookingsOlderThan24Hours: countOlderThan24Hours(pendingBookingCreatedAt, nowTimestamp),
        pendingReschedulesOlderThan24Hours: countOlderThan24Hours(pendingRescheduleCreatedAt, nowTimestamp),
        oldestPendingBookingAt: getOldestTimestamp(pendingBookingCreatedAt),
        oldestPendingRescheduleAt: getOldestTimestamp(pendingRescheduleCreatedAt),
    }
}
