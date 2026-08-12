import { describe, expect, it } from 'vitest'

import {
    MAX_AUDIT_TARGET_ID_LENGTH,
    normalizeAuditTarget,
} from './audit-target-policy.js'

describe('audit target policy', () => {
    it('normalizes optional target fields', () => {
        expect(normalizeAuditTarget(' target-1 ', MAX_AUDIT_TARGET_ID_LENGTH, 'target id')).toBe('target-1')
        expect(normalizeAuditTarget(null, MAX_AUDIT_TARGET_ID_LENGTH, 'target id')).toBeUndefined()
    })

    it('rejects empty and oversized target fields', () => {
        expect(() => normalizeAuditTarget(' ', MAX_AUDIT_TARGET_ID_LENGTH, 'target id')).toThrow(/target id/)
        expect(() => normalizeAuditTarget('x'.repeat(129), MAX_AUDIT_TARGET_ID_LENGTH, 'target id')).toThrow(/target id/)
    })
})
