export type BookingRescheduleDecision = 'accepted' | 'rejected'

export function assertBookingRescheduleDecision(decision: string): BookingRescheduleDecision {
    if (decision !== 'accepted' && decision !== 'rejected') {
        throw new Error('Booking reschedule decision is invalid.')
    }

    return decision
}
