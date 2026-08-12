import { BookingPaymentStatus } from '../../entities/booking/booking-payment.entity.js'
import { BookingPaymentInvoiceStatus } from '../../entities/booking/booking-payment-invoice.entity.js'

export function getPaymentInvoiceStatus(status: BookingPaymentStatus) {
    if (status === BookingPaymentStatus.Paid) return BookingPaymentInvoiceStatus.Paid
    if (status === BookingPaymentStatus.PartiallyRefunded) return BookingPaymentInvoiceStatus.Paid
    if (status === BookingPaymentStatus.Refunded) return BookingPaymentInvoiceStatus.Void
    return null
}
