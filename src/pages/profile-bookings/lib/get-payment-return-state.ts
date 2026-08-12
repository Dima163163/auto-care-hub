import type { BookingPaymentStatus } from '@/entities/booking'

export type PaymentReturnState = 'success' | 'pending' | 'failed' | 'cancelled' | null

export function getPaymentReturnState(input: {
    payment: string | null
    bookingId: string | null
    status: BookingPaymentStatus | null | undefined
    isLoading: boolean
    isError: boolean
}): PaymentReturnState {
    if (input.payment === 'cancelled') {
        return 'cancelled'
    }

    if (input.payment !== 'success' || !input.bookingId || input.isLoading || input.isError) {
        return null
    }

    if (input.status === 'paid') {
        return 'success'
    }

    if (input.status === 'failed') {
        return 'failed'
    }

    return input.status === 'pending' || input.status === null || input.status === undefined
        ? 'pending'
        : null
}
