import { describe, expect, it } from 'vitest'

import { BookingPaymentStatus } from '../../entities/booking/booking-payment.entity.js'
import {
    assertPaymentTransitionIdentity,
    assertPaymentTransitionMetadata,
} from './payment-transition-input.js'

describe('payment transition metadata', () => {
    const base = {
        status: BookingPaymentStatus.Refunded,
        expectedCurrency: 'eur',
        expectedAmount: 25,
        currency: 'eur',
        amount: 2_500,
    }

    it('accepts matching currency and a bounded refund in cents', () => {
        expect(assertPaymentTransitionMetadata({ ...base, currency: ' EUR ', amount: 2_500 })).toBeUndefined()
    })

    it('rejects currency mismatches and oversized refunds', () => {
        expect(() => assertPaymentTransitionMetadata({ ...base, currency: 'usd', amount: 2_500 })).toThrow(/currency/)
        expect(() => assertPaymentTransitionMetadata({ ...base, currency: 'eur', amount: 2_501 })).toThrow(/exceeds/)
    })

    it('requires partial and full refund amounts to match their state', () => {
        expect(() => assertPaymentTransitionMetadata({
            ...base,
            status: BookingPaymentStatus.PartiallyRefunded,
            amount: 2_500,
        })).toThrow(/below/)
        expect(() => assertPaymentTransitionMetadata({
            ...base,
            amount: 2_000,
        })).toThrow(/must match/)
        expect(() => assertPaymentTransitionMetadata({
            ...base,
            amount: 2_000,
            alreadyRefundedAmount: 2_500,
        })).toThrow(/backwards/)
    })

    it('rejects malformed transition amounts', () => {
        expect(() => assertPaymentTransitionMetadata({
            ...base,
            amount: 1.5,
        })).toThrow(/invalid/)
    })

    it('requires exact settlement metadata for paid transitions', () => {
        expect(() => assertPaymentTransitionMetadata({
            status: BookingPaymentStatus.Paid,
            expectedCurrency: 'eur',
            expectedAmount: 25,
        })).toThrow(/required/)
        expect(() => assertPaymentTransitionMetadata({
            status: BookingPaymentStatus.Paid,
            expectedCurrency: 'eur',
            expectedAmount: 25,
            currency: 'eur',
            amount: 2_499,
        })).toThrow(/does not match/)
        expect(assertPaymentTransitionMetadata({
            status: BookingPaymentStatus.Paid,
            expectedCurrency: 'eur',
            expectedAmount: 25,
            currency: 'EUR',
            amount: 2_500,
        })).toBeUndefined()
    })

    it('requires metadata for failed transitions as well', () => {
        expect(() => assertPaymentTransitionMetadata({
            status: BookingPaymentStatus.Failed,
            expectedCurrency: 'eur',
            expectedAmount: 25,
        })).toThrow(/required/)
    })
})

describe('payment transition identity', () => {
    it('accepts a stored payment and optional matching booking', () => {
        expect(assertPaymentTransitionIdentity({
            requestedPaymentId: 'payment-1',
            requestedBookingId: 'booking-1',
            storedPaymentId: 'payment-1',
            storedBookingId: 'booking-1',
        })).toBeUndefined()
        expect(assertPaymentTransitionIdentity({
            requestedPaymentId: 'payment-1',
            storedPaymentId: 'payment-1',
            storedBookingId: 'booking-1',
        })).toBeUndefined()
    })

    it('rejects payment and booking mismatches before a transition', () => {
        expect(() => assertPaymentTransitionIdentity({
            requestedPaymentId: 'payment-2',
            requestedBookingId: 'booking-1',
            storedPaymentId: 'payment-1',
            storedBookingId: 'booking-1',
        })).toThrow(/does not match/)
        expect(() => assertPaymentTransitionIdentity({
            requestedPaymentId: 'payment-1',
            requestedBookingId: 'booking-2',
            storedPaymentId: 'payment-1',
            storedBookingId: 'booking-1',
        })).toThrow(/does not match/)
    })
})
