import { describe, expect, it } from 'vitest'

import { mergeBookingRecoveryTimeline } from './mergeBookingRecoveryTimeline'

describe('mergeBookingRecoveryTimeline', () => {
    it('orders booking and payment events into one recovery history', () => {
        expect(mergeBookingRecoveryTimeline([
            {
                id: 'status-2',
                status: 'confirmed',
                changedById: 'owner-1',
                reason: null,
                createdAt: '2026-07-30T10:02:00.000Z',
            },
        ], {
            status: 'paid',
            grossAmount: 1500,
            refundedAmountMinor: 0,
            remainingAmountMinor: 150000,
            currency: 'rub',
            createdAt: '2026-07-30T10:00:00.000Z',
            invoice: null,
            attempts: [{
                attemptNumber: 1,
                status: 'paid',
                createdAt: '2026-07-30T10:01:00.000Z',
            }],
        })).toMatchObject([
            { kind: 'payment', attemptNumber: 1 },
            { kind: 'booking', status: 'confirmed' },
        ])
    })
})
