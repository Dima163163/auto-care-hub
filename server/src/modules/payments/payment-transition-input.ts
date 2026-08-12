import { BookingPaymentStatus } from '../../entities/booking/booking-payment.entity.js'
import { normalizePaymentCurrency } from './payment-input.js'

export function assertPaymentTransitionIdentity(input: {
    requestedPaymentId: string
    requestedBookingId?: string
    storedPaymentId: string
    storedBookingId: string
}) {
    if (
        input.requestedPaymentId !== input.storedPaymentId
        || (
            input.requestedBookingId !== undefined
            && input.requestedBookingId !== input.storedBookingId
        )
    ) {
        throw new Error('Payment transition payment or booking does not match the stored record.')
    }
}

export function assertPaymentTransitionMetadata(input: {
    status: BookingPaymentStatus
    amount?: number
    currency?: string
    expectedCurrency: string
    expectedAmount: number
    alreadyRefundedAmount?: number
}) {
    const requiresSettlementMetadata = true

    if (requiresSettlementMetadata && input.currency === undefined) {
        throw new Error('Payment transition currency is required.')
    }

    if (input.currency !== undefined
        && normalizePaymentCurrency(input.currency) !== normalizePaymentCurrency(input.expectedCurrency)) {
        throw new Error('Payment transition currency does not match the stored payment.')
    }

    if (requiresSettlementMetadata && input.amount === undefined) {
        throw new Error('Payment transition amount is required.')
    }

    if (input.amount === undefined) return
    if (!Number.isSafeInteger(input.amount) || input.amount < 0) {
        throw new Error('Payment transition amount is invalid.')
    }

    const maximumRefundAmount = input.expectedAmount * 100
    if (input.status === BookingPaymentStatus.Paid && input.amount !== maximumRefundAmount) {
        throw new Error('Payment transition amount does not match the stored payment.')
    }
    if (
        (input.status === BookingPaymentStatus.PartiallyRefunded
            || input.status === BookingPaymentStatus.Refunded)
        && input.amount > maximumRefundAmount
    ) {
        throw new Error('Payment refund amount exceeds the stored payment.')
    }
    if (
        input.alreadyRefundedAmount !== undefined
        && input.amount < input.alreadyRefundedAmount
    ) {
        throw new Error('Payment refund amount cannot move backwards.')
    }
    if (
        input.status === BookingPaymentStatus.PartiallyRefunded
        && input.amount >= maximumRefundAmount
    ) {
        throw new Error('Partial payment refund amount must be below the stored payment.')
    }
    if (
        input.status === BookingPaymentStatus.Refunded
        && input.amount !== maximumRefundAmount
    ) {
        throw new Error('Full payment refund amount must match the stored payment.')
    }
}
