export type InvoiceRecord = {
    invoiceId: string
    paymentId: string
    amount: number
    currency: string
    status: 'open' | 'paid' | 'void'
    issuedAt: string
}

export function assertInvoiceRecord(record: InvoiceRecord) {
    if (!record.invoiceId.trim() || !record.paymentId.trim() || !Number.isSafeInteger(record.amount) || record.amount < 0) {
        throw new Error('Invoice record is invalid.')
    }
    if (!isSupportedPaymentCurrency(record.currency) || !['open', 'paid', 'void'].includes(record.status)) {
        throw new Error('Invoice record status or currency is invalid.')
    }
    if (Number.isNaN(Date.parse(record.issuedAt))) {
        throw new Error('Invoice issue date is invalid.')
    }

    return record
}
import { isSupportedPaymentCurrency } from './payment-currencies.js'
