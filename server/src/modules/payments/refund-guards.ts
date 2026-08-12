import { BookingPaymentStatus } from '../../entities/booking/booking-payment.entity.js'

export const REFUND_REASONS = ['duplicate', 'fraudulent', 'requested_by_customer'] as const
export type RefundReason = (typeof REFUND_REASONS)[number]

export function assertRefundReason(reason: string): RefundReason {
    if (!REFUND_REASONS.includes(reason as RefundReason)) {
        throw new Error('Refund reason is invalid.')
    }

    return reason as RefundReason
}

export function isRefundSucceeded(status: string | null | undefined) {
    return status === 'succeeded'
}

export function getRefundStatusForAmount(paymentAmountMinor: number, refundedAmountMinor: number) {
    if (
        !Number.isSafeInteger(paymentAmountMinor)
        || !Number.isSafeInteger(refundedAmountMinor)
        || paymentAmountMinor < 1
        || refundedAmountMinor < 1
        || refundedAmountMinor > paymentAmountMinor
    ) {
        throw new Error('Refund amount is outside the payment bounds.')
    }

    return refundedAmountMinor === paymentAmountMinor
        ? BookingPaymentStatus.Refunded
        : BookingPaymentStatus.PartiallyRefunded
}

export function getRefundEligibility(
    status: BookingPaymentStatus,
    stripePaymentIntentId: string | null,
) {
    if (status === BookingPaymentStatus.Refunded) {
        return { allowed: true, alreadyRefunded: true }
    }

    return {
        allowed: (
            status === BookingPaymentStatus.Paid
            || status === BookingPaymentStatus.PartiallyRefunded
        ) && Boolean(stripePaymentIntentId),
        alreadyRefunded: false,
    }
}

export function assertRefundAmount(paymentAmount: number, refundAmount: number) {
    if (
        !Number.isSafeInteger(paymentAmount)
        || !Number.isSafeInteger(refundAmount)
        || paymentAmount < 1
        || refundAmount < 1
        || refundAmount > paymentAmount
    ) {
        throw new Error('Refund amount is outside the payment bounds.')
    }

    return refundAmount
}

export function getRefundAmountBounds(
    paymentAmount: number,
    alreadyRefundedAmount: number,
    requestedAmount: number,
) {
    if (
        !Number.isSafeInteger(paymentAmount)
        || !Number.isSafeInteger(alreadyRefundedAmount)
        || paymentAmount < 1
        || alreadyRefundedAmount < 0
        || alreadyRefundedAmount > paymentAmount
    ) {
        throw new Error('Refund history is outside the payment bounds.')
    }

    const remainingAmount = paymentAmount - alreadyRefundedAmount
    assertRefundAmount(remainingAmount, requestedAmount)

    return {
        remainingAmount,
        requestedAmount,
    }
}
