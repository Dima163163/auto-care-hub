import { describe, expect, it } from 'vitest'

import {
    toClientBookingPaymentStatusResponse,
} from './payment-status.service.js'
import { BookingPaymentInvoiceStatus } from '../../entities/booking/booking-payment-invoice.entity.js'

describe('client booking payment status response', () => {
    it('exposes bounded lifecycle fields without provider identifiers or failure text', () => {
        const response = toClientBookingPaymentStatusResponse({
            status: 'failed',
            grossAmount: 1500,
            refundedAmountMinor: 2500,
            remainingAmountMinor: 147500,
            currency: 'rub',
            createdAt: new Date('2026-07-30T10:00:00.000Z'),
        } as never, [{
            attemptNumber: 1,
            status: 'failed',
            createdAt: new Date('2026-07-30T10:01:00.000Z'),
            stripeSessionId: 'cs_secret_reference',
            failureMessage: 'provider payload should stay private',
        } as never], {
            invoiceId: 'inv_public_1',
            amount: 1500,
            currency: 'rub',
            status: BookingPaymentInvoiceStatus.Paid,
            issuedAt: new Date('2026-07-30T10:00:01.000Z'),
        } as never)

        expect(response).toEqual({
            status: 'failed',
            grossAmount: 1500,
            refundedAmountMinor: 2500,
            remainingAmountMinor: 147500,
            currency: 'rub',
            createdAt: '2026-07-30T10:00:00.000Z',
            invoice: {
                invoiceId: 'inv_public_1',
                amount: 1500,
                currency: 'rub',
                status: 'paid',
                issuedAt: '2026-07-30T10:00:01.000Z',
            },
            attempts: [{
                attemptNumber: 1,
                status: 'failed',
                createdAt: '2026-07-30T10:01:00.000Z',
            }],
        })
        expect(JSON.stringify(response)).not.toContain('cs_secret_reference')
        expect(JSON.stringify(response)).not.toContain('provider payload')
    })

    it('returns neutral money fields when a booking has no payment yet', () => {
        expect(toClientBookingPaymentStatusResponse(null, [])).toEqual({
            status: null,
            grossAmount: null,
            refundedAmountMinor: 0,
            remainingAmountMinor: null,
            currency: null,
            createdAt: null,
            invoice: null,
            attempts: [],
        })
    })
})
