import { BookingPaymentStatus } from '../../entities/booking/booking-payment.entity.js'

export function isPaymentTransitionAllowed(
    current: BookingPaymentStatus,
    requested: BookingPaymentStatus,
) {
    if (current === requested) return true

    if (current === BookingPaymentStatus.Pending) {
        return requested === BookingPaymentStatus.Paid
            || requested === BookingPaymentStatus.Failed
    }

    if (current === BookingPaymentStatus.Failed) {
        return requested === BookingPaymentStatus.Paid
    }

    if (current === BookingPaymentStatus.Paid) {
        return requested === BookingPaymentStatus.PartiallyRefunded
            || requested === BookingPaymentStatus.Refunded
    }

    return current === BookingPaymentStatus.PartiallyRefunded
        && requested === BookingPaymentStatus.Refunded
}
