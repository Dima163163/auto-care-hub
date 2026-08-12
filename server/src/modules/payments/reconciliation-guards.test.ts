import { describe, expect, it } from 'vitest'

import {
    assertReconciliationResult,
    getReconciliationBatchLimit,
    selectReconciliationGaps,
    selectReconciliationCandidates,
} from './reconciliation-guards.js'

describe('payment reconciliation guards', () => {
    it('keeps candidate batches bounded and ordered', () => {
        expect(selectReconciliationCandidates(['first', 'second', 'third'], 2)).toEqual(['first', 'second'])
    })

    it('rejects invalid batch sizes', () => {
        expect(() => getReconciliationBatchLimit(0)).toThrow(/invalid/)
        expect(() => getReconciliationBatchLimit(101)).toThrow(/invalid/)
    })

    it('selects payment and delivery gaps for recovery', () => {
        const rows = [
            { id: 'pending', status: 'pending', session: 'cs_1', booking: 'confirmed', notification: true },
            { id: 'paid-booking', status: 'paid', session: 'cs_2', booking: 'pending', notification: true },
            { id: 'healthy', status: 'paid', session: 'cs_3', booking: 'confirmed', notification: true },
        ]

        expect(selectReconciliationGaps(rows, (row) => ({
            paymentStatus: row.status,
            stripeSessionId: row.session,
            bookingStatus: row.booking,
            notificationPresent: row.notification,
        })).map((row) => row.id)).toEqual(['pending', 'paid-booking'])
    })

    it('rejects invalid reconciliation counters', () => {
        expect(assertReconciliationResult({ checked: 2, errors: 0 })).toEqual({ checked: 2, errors: 0 })
        expect(() => assertReconciliationResult({ checked: -1 })).toThrow(/invalid/)
    })
})
