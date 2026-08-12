import { describe, expect, it } from 'vitest'

import { assertInvoiceRecord } from './invoice-contract.js'

describe('invoice record contract', () => {
    it('accepts a valid payment invoice record', () => {
        expect(assertInvoiceRecord({
            invoiceId: 'in_123',
            paymentId: 'payment-1',
            amount: 1_000,
            currency: 'eur',
            status: 'paid',
            issuedAt: '2026-07-29T00:00:00.000Z',
        }).status).toBe('paid')
    })

    it('rejects malformed invoice records', () => {
        expect(() => assertInvoiceRecord({ invoiceId: '', paymentId: 'p', amount: 1, currency: 'eur', status: 'open', issuedAt: 'now' })).toThrow()
        expect(() => assertInvoiceRecord({ invoiceId: 'i', paymentId: 'p', amount: 1, currency: 'gbp', status: 'open', issuedAt: '2026-01-01' })).toThrow()
    })
})
