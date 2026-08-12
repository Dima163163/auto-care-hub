import { describe, expect, it } from 'vitest'

import {
    getAccountDeletionRetentionDeadline,
    getAccountDeletionRetentionCutoff,
    isAccountDeletionReady,
    normalizeAccountDeletionRetentionDays,
} from './account-deletion-retention.js'

describe('account deletion retention', () => {
    const requestedAt = new Date('2026-01-01T00:00:00.000Z')

    it('calculates a deterministic retention deadline', () => {
        expect(getAccountDeletionRetentionDeadline(requestedAt, 30).toISOString()).toBe('2026-01-31T00:00:00.000Z')
        expect(isAccountDeletionReady(requestedAt, new Date('2026-01-30T23:59:59.999Z'), 30)).toBe(false)
        expect(isAccountDeletionReady(requestedAt, new Date('2026-01-31T00:00:00.000Z'), 30)).toBe(true)
    })

    it('clamps invalid retention settings to a bounded policy', () => {
        expect(normalizeAccountDeletionRetentionDays(undefined)).toBe(30)
        expect(normalizeAccountDeletionRetentionDays(0)).toBe(1)
        expect(normalizeAccountDeletionRetentionDays(900)).toBe(365)
    })

    it('calculates a bounded cleanup cutoff from the current time', () => {
        const now = new Date('2026-08-09T12:00:00.000Z')

        expect(getAccountDeletionRetentionCutoff(now, 30).toISOString()).toBe('2026-07-10T12:00:00.000Z')
        expect(getAccountDeletionRetentionCutoff(now, 0).toISOString()).toBe('2026-08-08T12:00:00.000Z')
    })
})
