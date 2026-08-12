import { describe, expect, it } from 'vitest'

import { BookingPaymentStatus } from '../../entities/booking/booking-payment.entity.js'
import { AuditAction } from '../../entities/audit-log/audit-log.entity.js'
import { getPaymentAuditAction, isPaymentDowngrade } from './payment-transition.service'

describe('payment transition policy', () => {
    it('does not allow failed webhooks to downgrade paid payments', () => {
        expect(
            isPaymentDowngrade(
                BookingPaymentStatus.Paid,
                BookingPaymentStatus.Failed,
            ),
        ).toBe(true)
    })

    it('does not allow checkout events to downgrade refunded payments', () => {
        expect(
            isPaymentDowngrade(
                BookingPaymentStatus.Refunded,
                BookingPaymentStatus.Paid,
            ),
        ).toBe(true)
    })

    it('allows forward payment transitions and idempotent repeats', () => {
        expect(
            isPaymentDowngrade(
                BookingPaymentStatus.Pending,
                BookingPaymentStatus.Paid,
            ),
        ).toBe(false)
        expect(
            isPaymentDowngrade(
                BookingPaymentStatus.Failed,
                BookingPaymentStatus.Paid,
            ),
        ).toBe(false)
        expect(
            isPaymentDowngrade(
                BookingPaymentStatus.Paid,
                BookingPaymentStatus.Paid,
            ),
        ).toBe(false)
    })

    it('uses distinct audit actions for partial and full refunds', () => {
        expect(getPaymentAuditAction(BookingPaymentStatus.PartiallyRefunded)).toBe(AuditAction.PaymentPartiallyRefunded)
        expect(getPaymentAuditAction(BookingPaymentStatus.Refunded)).toBe(AuditAction.PaymentRefunded)
        expect(getPaymentAuditAction(BookingPaymentStatus.Failed)).toBe(AuditAction.PaymentFailed)
    })
})
