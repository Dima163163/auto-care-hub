import { describe, expect, it } from 'vitest'

import { BookingPaymentStatus } from '../../entities/booking/booking-payment.entity.js'
import { BookingPaymentInvoiceStatus } from '../../entities/booking/booking-payment-invoice.entity.js'
import {
    createPaymentInvoiceBackfillPreflight,
    getInvoiceBackfillStatuses,
    toPaymentInvoiceBackfillRecord,
} from './payment-invoice-backfill.service.js'

describe('payment invoice backfill', () => {
    it('returns a read-only preflight with bounded status counts', () => {
        expect(createPaymentInvoiceBackfillPreflight({
            candidateCount: 5,
            oldestAgeMs: 1_000,
            statusCounts: {
                [BookingPaymentStatus.Paid]: 2,
                [BookingPaymentStatus.PartiallyRefunded]: 1,
                [BookingPaymentStatus.Refunded]: 2,
            },
        })).toEqual({
            dryRun: true,
            candidateCount: 5,
            wouldCreate: 5,
            oldestAgeMs: 1_000,
            statusCounts: {
                [BookingPaymentStatus.Paid]: 2,
                [BookingPaymentStatus.PartiallyRefunded]: 1,
                [BookingPaymentStatus.Refunded]: 2,
            },
        })
    })

    it('rejects inconsistent preflight status totals', () => {
        expect(() => createPaymentInvoiceBackfillPreflight({
            candidateCount: 2,
            oldestAgeMs: 0,
            statusCounts: {
                [BookingPaymentStatus.Paid]: 1,
                [BookingPaymentStatus.PartiallyRefunded]: 0,
                [BookingPaymentStatus.Refunded]: 0,
            },
        })).toThrow(/inconsistent/)
    })

    it('backfills only settled payment statuses', () => {
        expect(getInvoiceBackfillStatuses()).toEqual([
            BookingPaymentStatus.Paid,
            BookingPaymentStatus.PartiallyRefunded,
            BookingPaymentStatus.Refunded,
        ])
    })

    it('keeps historical partially refunded invoices paid', () => {
        expect(toPaymentInvoiceBackfillRecord({
            id: 'payment-partial',
            bookingId: 'booking-partial',
            grossAmount: 25_000,
            currency: 'rub',
            status: BookingPaymentStatus.PartiallyRefunded,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
        })).toEqual({
            paymentId: 'payment-partial',
            bookingId: 'booking-partial',
            invoiceId: 'inv_payment-partial',
            amount: 25_000,
            currency: 'rub',
            status: BookingPaymentInvoiceStatus.Paid,
            issuedAt: new Date('2026-01-01T00:00:00.000Z'),
        })
    })

    it('preserves the historical payment date and voids fully refunded invoices', () => {
        expect(toPaymentInvoiceBackfillRecord({
            id: 'payment-1',
            bookingId: 'booking-1',
            grossAmount: 25_000,
            currency: 'rub',
            status: BookingPaymentStatus.Refunded,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
        })).toEqual({
            paymentId: 'payment-1',
            bookingId: 'booking-1',
            invoiceId: 'inv_payment-1',
            amount: 25_000,
            currency: 'rub',
            status: BookingPaymentInvoiceStatus.Void,
            issuedAt: new Date('2026-01-01T00:00:00.000Z'),
        })
    })
})
