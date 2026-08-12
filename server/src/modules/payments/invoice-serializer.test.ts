import { describe, expect, it } from 'vitest'

import { serializeInvoiceRecord } from './invoice-serializer.js'

describe('invoice serializer', () => {
    it('returns normalized public invoice data', () => {
        expect(serializeInvoiceRecord({
            invoiceId: ' in_123 ',
            paymentId: ' pay_123 ',
            amount: 1_250,
            currency: 'EUR',
            status: 'paid',
            issuedAt: '2026-07-29T12:00:00+04:00',
        })).toEqual({
            invoiceId: 'in_123',
            paymentId: 'pay_123',
            amount: 1_250,
            currency: 'eur',
            status: 'paid',
            issuedAt: '2026-07-29T08:00:00.000Z',
        })
    })
})
