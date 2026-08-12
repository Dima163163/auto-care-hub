import { describe, expect, it } from 'vitest'

import { BookingPaymentStatus } from '../../entities/booking/booking-payment.entity.js'
import { BookingPaymentInvoiceStatus } from '../../entities/booking/booking-payment-invoice.entity.js'
import { getPaymentInvoiceStatus } from './payment-invoice-state.js'

describe('payment invoice lifecycle', () => {
    it('keeps partially refunded invoices paid and voids only fully refunded invoices', () => {
        expect(getPaymentInvoiceStatus(BookingPaymentStatus.Paid)).toBe(BookingPaymentInvoiceStatus.Paid)
        expect(getPaymentInvoiceStatus(BookingPaymentStatus.PartiallyRefunded)).toBe(BookingPaymentInvoiceStatus.Paid)
        expect(getPaymentInvoiceStatus(BookingPaymentStatus.Refunded)).toBe(BookingPaymentInvoiceStatus.Void)
    })

    it('does not issue invoices for pending or failed payments', () => {
        expect(getPaymentInvoiceStatus(BookingPaymentStatus.Pending)).toBeNull()
        expect(getPaymentInvoiceStatus(BookingPaymentStatus.Failed)).toBeNull()
    })
})
