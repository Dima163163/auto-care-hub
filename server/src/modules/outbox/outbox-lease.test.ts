import { describe, expect, it } from 'vitest'

import { getOutboxLeaseDecision, getStaleOutboxRecoveryStatus } from './outbox-lease.js'

describe('outbox lease decisions', () => {
    const base = { availableAt: 1_000, attempts: 1, maxAttempts: 5, now: 10_000, staleLockMs: 5_000 }

    it('claims ready pending and failed events', () => {
        expect(getOutboxLeaseDecision({ ...base, status: 'pending', lockedAt: null })).toBe('claim')
        expect(getOutboxLeaseDecision({ ...base, status: 'failed', lockedAt: null })).toBe('claim')
    })

    it('recovers only stale processing leases', () => {
        expect(getOutboxLeaseDecision({ ...base, status: 'processing', lockedAt: 4_000 })).toBe('recover_stale')
        expect(getOutboxLeaseDecision({ ...base, status: 'processing', lockedAt: 9_000 })).toBe('skip')
        expect(getOutboxLeaseDecision({ ...base, status: 'pending', lockedAt: null, availableAt: 20_000 })).toBe('skip')
    })

    it('moves stale leases to retry or dead letter based on attempts', () => {
        expect(getStaleOutboxRecoveryStatus(2, 5)).toBe('failed')
        expect(getStaleOutboxRecoveryStatus(5, 5)).toBe('dead_letter')
    })
})
