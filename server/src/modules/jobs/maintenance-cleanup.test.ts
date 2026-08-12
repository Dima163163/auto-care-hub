import { describe, expect, it } from 'vitest'

import { selectExpiredRecordIds, summarizeMaintenanceCycle } from './maintenance-jobs.service.js'
import { getMaintenanceBacklogAgeMs } from './maintenance-backlog-policy.js'

describe('selectExpiredRecordIds', () => {
    it('keeps cleanup batches bounded and ordered', () => {
        expect(selectExpiredRecordIds([{ id: 'first' }, { id: 'second' }, { id: 'third' }], 2)).toEqual([
            'first',
            'second',
        ])
    })

    it('rejects invalid batch sizes', () => {
        expect(() => selectExpiredRecordIds([], 0)).toThrow()
        expect(() => selectExpiredRecordIds([], 1.5)).toThrow()
    })
})

describe('summarizeMaintenanceCycle', () => {
    it('keeps maintenance summaries bounded to numeric outcomes', () => {
        expect(summarizeMaintenanceCycle({
            remindersScheduled: 1,
            outbox: { claimed: 2, completed: 2, failed: 0, abandoned: 0, deadLetter: 0, secretsRedacted: 1 },
            authCleanup: { tokens: 3, sessions: 4, oauthLinkRequests: 5, accountDeletionRequests: 6 },
            auditCleanup: { auditLogs: 5, securityEvents: 2 },
            notificationCleanup: { notifications: 7 },
            orphanImageCleanup: { failed: 0, scanned: 6, removed: 1 },
            stripeWebhook: {
                unmatchedExpired: 2,
                replay: { checked: 1, applied: 1, unsupported: 0, retryable: 0, failed: 0, skipped: 0 },
            },
            payments: { checked: 7, paid: 1, failed: 0, repaired: 0, skipped: 6, errors: 0 },
            paymentRefunds: { checked: 2, repaired: 1, skipped: 1, errors: 0 },
            paymentInvoiceBackfill: { checked: 3, created: 2, skipped: 1, errors: 0 },
            phaseFailures: [],
        })).toEqual({
            remindersScheduled: 1,
            outbox: { claimed: 2, completed: 2, failed: 0, abandoned: 0, deadLetter: 0, secretsRedacted: 1 },
            authCleanup: { tokens: 3, sessions: 4, oauthLinkRequests: 5, accountDeletionRequests: 6 },
            auditCleanup: { auditLogs: 5, securityEvents: 2 },
            notificationCleanup: { notifications: 7 },
            orphanImageCleanup: { failed: 0, scanned: 6, removed: 1 },
            stripeWebhook: {
                unmatchedExpired: 2,
                replay: { checked: 1, applied: 1, unsupported: 0, retryable: 0, failed: 0, skipped: 0 },
            },
            payments: { checked: 7, paid: 1, failed: 0, repaired: 0, skipped: 6, errors: 0 },
            paymentRefunds: { checked: 2, repaired: 1, skipped: 1, errors: 0 },
            paymentInvoiceBackfill: { checked: 3, created: 2, skipped: 1, errors: 0 },
        })
    })
})

describe('maintenance backlog policy', () => {
    it('calculates a bounded age from the oldest record', () => {
        expect(getMaintenanceBacklogAgeMs(
            '2026-01-01T00:00:00.000Z',
            Date.parse('2026-01-01T00:00:12.500Z'),
        )).toBe(12_500)
    })

    it('does not report negative or invalid ages', () => {
        expect(getMaintenanceBacklogAgeMs(
            '2026-01-01T00:00:10.000Z',
            Date.parse('2026-01-01T00:00:00.000Z'),
        )).toBe(0)
        expect(getMaintenanceBacklogAgeMs('not-a-date', Date.now())).toBe(0)
        expect(getMaintenanceBacklogAgeMs(null, Date.now())).toBe(0)
    })
})
