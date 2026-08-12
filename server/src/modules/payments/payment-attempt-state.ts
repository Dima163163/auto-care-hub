import { BookingPaymentAttemptStatus } from '../../entities/booking/booking-payment-attempt.entity.js'

export function isPaymentAttemptTransitionAllowed(
    current: BookingPaymentAttemptStatus,
    requested: BookingPaymentAttemptStatus,
) {
    if (current === requested) return true
    if (current === BookingPaymentAttemptStatus.Creating) {
        return requested === BookingPaymentAttemptStatus.Created
            || requested === BookingPaymentAttemptStatus.Failed
    }
    if (current === BookingPaymentAttemptStatus.Created) {
        return requested === BookingPaymentAttemptStatus.Paid
            || requested === BookingPaymentAttemptStatus.Expired
            || requested === BookingPaymentAttemptStatus.Failed
    }
    return false
}
