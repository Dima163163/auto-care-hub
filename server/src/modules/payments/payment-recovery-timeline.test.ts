import { describe, expect, it } from 'vitest'

import { getPaymentRecoveryTimeline } from './payment-recovery-timeline.js'

describe('payment recovery timeline', () => {
    it('returns attempts ordered by recovery sequence', () => {
        expect(getPaymentRecoveryTimeline([
            { attemptNumber: 2, status: 'failed', createdAt: new Date('2026-07-29T00:02:00.000Z') },
            { attemptNumber: 1, status: 'created', createdAt: new Date('2026-07-29T00:01:00.000Z') },
        ])).toEqual([
            { attemptNumber: 1, status: 'created', createdAt: '2026-07-29T00:01:00.000Z' },
            { attemptNumber: 2, status: 'failed', createdAt: '2026-07-29T00:02:00.000Z' },
        ])
    })
})
