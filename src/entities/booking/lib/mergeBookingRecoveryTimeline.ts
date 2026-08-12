import type {
    BookingPaymentStatusResponse,
    BookingStatusHistory,
} from '../model/types'

export type BookingRecoveryTimelineEvent =
    | {
        id: string
        kind: 'booking'
        status: BookingStatusHistory['status']
        createdAt: string
        reason: string | null
    }
    | {
        id: string
        kind: 'payment'
        status: BookingPaymentStatusResponse['attempts'][number]['status']
        attemptNumber: number
        createdAt: string
    }

export function mergeBookingRecoveryTimeline(
    statusHistory: BookingStatusHistory[],
    paymentStatus: BookingPaymentStatusResponse | undefined,
) {
    const bookingEvents: BookingRecoveryTimelineEvent[] = statusHistory.map((entry) => ({
        id: `booking:${entry.id}`,
        kind: 'booking',
        status: entry.status,
        createdAt: entry.createdAt,
        reason: entry.reason,
    }))
    const paymentEvents: BookingRecoveryTimelineEvent[] = (paymentStatus?.attempts ?? []).map((attempt) => ({
        id: `payment:${attempt.attemptNumber}:${attempt.createdAt}`,
        kind: 'payment',
        status: attempt.status,
        attemptNumber: attempt.attemptNumber,
        createdAt: attempt.createdAt,
    }))

    return [...bookingEvents, ...paymentEvents].sort((left, right) =>
        left.createdAt.localeCompare(right.createdAt),
    )
}
