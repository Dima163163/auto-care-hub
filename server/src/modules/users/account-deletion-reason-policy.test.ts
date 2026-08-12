import { describe, expect, it } from 'vitest'

import { normalizeAccountDeletionReason } from './account-deletion-reason-policy.js'

describe('account deletion reason policy', () => {
    it('normalizes optional reasons', () => {
        expect(normalizeAccountDeletionReason('  No longer needed\n ')).toBe('No longer needed')
        expect(normalizeAccountDeletionReason(undefined)).toBeNull()
    })

    it('rejects oversized reasons', () => {
        expect(() => normalizeAccountDeletionReason('x'.repeat(501))).toThrow(/too long/)
    })
})
