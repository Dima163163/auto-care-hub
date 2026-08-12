import { describe, expect, it } from 'vitest'

import { BookingPaymentStatus } from '../../entities/booking/booking-payment.entity.js'
import {
    assertRefundAmount,
    assertRefundReason,
    getRefundAmountBounds,
    getRefundEligibility,
    getRefundStatusForAmount,
    isRefundSucceeded,
} from './refund-guards.js'

describe('refund eligibility', () => {
    it('allows paid payments and makes repeated refunds idempotent', () => {
        expect(getRefundEligibility(BookingPaymentStatus.Paid, 'pi_123')).toEqual({ allowed: true, alreadyRefunded: false })
        expect(getRefundEligibility(BookingPaymentStatus.PartiallyRefunded, 'pi_123')).toEqual({ allowed: true, alreadyRefunded: false })
        expect(getRefundEligibility(BookingPaymentStatus.Refunded, null)).toEqual({ allowed: true, alreadyRefunded: true })
    })

    it('rejects pending, failed, and missing-intent payments', () => {
        expect(getRefundEligibility(BookingPaymentStatus.Pending, 'pi_123').allowed).toBe(false)
        expect(getRefundEligibility(BookingPaymentStatus.Paid, null).allowed).toBe(false)
        expect(getRefundEligibility(BookingPaymentStatus.Failed, 'pi_123').allowed).toBe(false)
    })

    it('bounds full and partial refund amounts', () => {
        expect(assertRefundAmount(1_000, 500)).toBe(500)
        expect(assertRefundAmount(1_000, 1_000)).toBe(1_000)
        expect(() => assertRefundAmount(1_000, 1_001)).toThrow()
        expect(() => assertRefundAmount(1_000, 0)).toThrow()
    })

    it('calculates a safe remaining amount for partial refunds', () => {
        expect(getRefundAmountBounds(10_000, 2_500, 7_500)).toEqual({
            remainingAmount: 7_500,
            requestedAmount: 7_500,
        })
        expect(() => getRefundAmountBounds(10_000, 7_500, 2_501)).toThrow(/bounds/)
    })

    it('accepts only Stripe refund reasons', () => {
        expect(assertRefundReason('requested_by_customer')).toBe('requested_by_customer')
        expect(() => assertRefundReason('other')).toThrow(/invalid/)
    })

    it('accepts only provider-confirmed refund status', () => {
        expect(isRefundSucceeded('succeeded')).toBe(true)
        expect(isRefundSucceeded('pending')).toBe(false)
        expect(isRefundSucceeded('failed')).toBe(false)
        expect(isRefundSucceeded(null)).toBe(false)
    })

    it('maps cumulative refund amounts to partial and full states', () => {
        expect(getRefundStatusForAmount(10_000, 2_500)).toBe(BookingPaymentStatus.PartiallyRefunded)
        expect(getRefundStatusForAmount(10_000, 10_000)).toBe(BookingPaymentStatus.Refunded)
        expect(() => getRefundStatusForAmount(10_000, 10_001)).toThrow(/bounds/)
    })
})
