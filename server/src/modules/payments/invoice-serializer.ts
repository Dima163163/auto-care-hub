import { assertInvoiceRecord, type InvoiceRecord } from './invoice-contract.js'

export type PublicInvoiceRecord = Readonly<InvoiceRecord>

export function serializeInvoiceRecord(record: InvoiceRecord): PublicInvoiceRecord {
    assertInvoiceRecord(record)

    return {
        invoiceId: record.invoiceId.trim(),
        paymentId: record.paymentId.trim(),
        amount: record.amount,
        currency: record.currency.trim().toLowerCase(),
        status: record.status,
        issuedAt: new Date(record.issuedAt).toISOString(),
    }
}
