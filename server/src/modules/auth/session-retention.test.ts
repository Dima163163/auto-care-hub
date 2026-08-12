import { describe, expect, it } from 'vitest'

import {
    getRevokedSessionRetentionCutoff,
    isRevokedSessionReadyForCleanup,
} from './session-retention.js'

describe('revoked session retention', () => {
    it('selects revoked sessions older than the retention window', () => {
        const now = new Date('2026-07-29T00:00:00.000Z')
        const cutoff = getRevokedSessionRetentionCutoff(now, 7)

        expect(cutoff.toISOString()).toBe('2026-07-22T00:00:00.000Z')
        expect(isRevokedSessionReadyForCleanup(new Date('2026-07-21T23:59:59.000Z'), cutoff)).toBe(true)
        expect(isRevokedSessionReadyForCleanup(cutoff, cutoff)).toBe(false)
    })
})
