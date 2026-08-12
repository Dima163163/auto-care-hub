import { describe, expect, it } from 'vitest'

import { BookingPaymentStatus } from '../../entities/booking/booking-payment.entity.js'
import { isPaymentTransitionAllowed } from './payment-state.js'

describe('payment state transitions', () => {
    it('allows forward, retry, and refund transitions', () => {
        expect(isPaymentTransitionAllowed(BookingPaymentStatus.Pending, BookingPaymentStatus.Paid)).toBe(true)
        expect(isPaymentTransitionAllowed(BookingPaymentStatus.Failed, BookingPaymentStatus.Paid)).toBe(true)
        expect(isPaymentTransitionAllowed(BookingPaymentStatus.Paid, BookingPaymentStatus.PartiallyRefunded)).toBe(true)
        expect(isPaymentTransitionAllowed(BookingPaymentStatus.PartiallyRefunded, BookingPaymentStatus.Refunded)).toBe(true)
        expect(isPaymentTransitionAllowed(BookingPaymentStatus.Paid, BookingPaymentStatus.Refunded)).toBe(true)
    })

    it('rejects invalid refund and downgrade transitions', () => {
        expect(isPaymentTransitionAllowed(BookingPaymentStatus.Pending, BookingPaymentStatus.Refunded)).toBe(false)
        expect(isPaymentTransitionAllowed(BookingPaymentStatus.Paid, BookingPaymentStatus.Failed)).toBe(false)
        expect(isPaymentTransitionAllowed(BookingPaymentStatus.Refunded, BookingPaymentStatus.Paid)).toBe(false)
        expect(isPaymentTransitionAllowed(BookingPaymentStatus.PartiallyRefunded, BookingPaymentStatus.Paid)).toBe(false)
    })
})
