import { describe, expect, it } from 'vitest'

import { BookingPaymentAttemptStatus } from '../../entities/booking/booking-payment-attempt.entity.js'
import { isPaymentAttemptTransitionAllowed } from './payment-attempt-state.js'

describe('payment attempt lifecycle', () => {
    it('allows creation and terminal success/failure transitions', () => {
        expect(isPaymentAttemptTransitionAllowed(BookingPaymentAttemptStatus.Creating, BookingPaymentAttemptStatus.Created)).toBe(true)
        expect(isPaymentAttemptTransitionAllowed(BookingPaymentAttemptStatus.Created, BookingPaymentAttemptStatus.Paid)).toBe(true)
        expect(isPaymentAttemptTransitionAllowed(BookingPaymentAttemptStatus.Created, BookingPaymentAttemptStatus.Expired)).toBe(true)
    })

    it('does not reopen terminal attempts', () => {
        expect(isPaymentAttemptTransitionAllowed(BookingPaymentAttemptStatus.Paid, BookingPaymentAttemptStatus.Failed)).toBe(false)
        expect(isPaymentAttemptTransitionAllowed(BookingPaymentAttemptStatus.Expired, BookingPaymentAttemptStatus.Paid)).toBe(false)
    })
})
