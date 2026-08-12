import Stripe from 'stripe'
import { describe, expect, it } from 'vitest'

import { BookingPaymentStatus } from '../../entities/booking/booking-payment.entity.js'
import {
    getRefundReconciliationStatuses,
    toRefundLedgerEntries,
} from './payment-refund-reconciliation.service.js'

describe('payment refund reconciliation', () => {
    it('checks paid payments so missed refund webhooks can converge', () => {
        expect(getRefundReconciliationStatuses()).toEqual([
            BookingPaymentStatus.Paid,
            BookingPaymentStatus.PartiallyRefunded,
            BookingPaymentStatus.Refunded,
        ])
    })

    it('maps every expanded Stripe refund into a ledger entry', () => {
        const entries = toRefundLedgerEntries({
            id: 'ch_123',
            refunds: {
                data: [{
                    id: 're_1',
                    amount: 2500,
                    currency: 'rub',
                    reason: 'requested_by_customer',
                }, {
                    id: 're_2',
                    amount: 7500,
                    currency: 'rub',
                    reason: null,
                }],
            },
        } as unknown as Stripe.Charge)

        expect(entries).toEqual([{
            providerRefundId: 're_1',
            providerChargeId: 'ch_123',
            amountMinor: 2500,
            currency: 'rub',
            reason: 'requested_by_customer',
        }, {
            providerRefundId: 're_2',
            providerChargeId: 'ch_123',
            amountMinor: 7500,
            currency: 'rub',
            reason: undefined,
        }])
    })

    it('returns an empty list when Stripe did not expand refunds', () => {
        expect(toRefundLedgerEntries({ id: 'ch_123', refunds: undefined })).toEqual([])
    })
})
