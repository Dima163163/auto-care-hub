import { describe, expect, it } from 'vitest'

import { normalizeAuditLogRetentionDays } from './audit-retention-policy.js'

describe('audit retention policy', () => {
    it('accepts bounded retention periods', () => {
        expect(normalizeAuditLogRetentionDays(365)).toBe(365)
        expect(normalizeAuditLogRetentionDays(3_650)).toBe(3_650)
    })

    it('rejects unbounded or invalid periods', () => {
        expect(() => normalizeAuditLogRetentionDays(0)).toThrow()
        expect(() => normalizeAuditLogRetentionDays(3_651)).toThrow()
        expect(() => normalizeAuditLogRetentionDays(1.5)).toThrow()
    })
})
