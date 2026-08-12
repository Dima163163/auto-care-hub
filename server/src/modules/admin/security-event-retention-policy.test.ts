import { describe, expect, it } from 'vitest'

import {
    getPrivacyRedactedSecurityEventMetadata,
    getSecurityEventPrivacyCutoff,
    normalizeSecurityEventIpRetentionDays,
} from './security-event-retention-policy.js'

describe('security event retention policy', () => {
    it('bounds IP retention against the audit retention window', () => {
        expect(normalizeSecurityEventIpRetentionDays(30, 365)).toBe(30)
        expect(() => normalizeSecurityEventIpRetentionDays(0, 365)).toThrow()
        expect(() => normalizeSecurityEventIpRetentionDays(366, 365)).toThrow()
        expect(() => normalizeSecurityEventIpRetentionDays(31, 30)).toThrow()
    })

    it('calculates a deterministic privacy cutoff and redaction marker', () => {
        const now = new Date('2026-08-08T12:00:00.000Z')
        expect(getSecurityEventPrivacyCutoff(now, 30).toISOString()).toBe('2026-07-09T12:00:00.000Z')
        expect(getPrivacyRedactedSecurityEventMetadata(now)).toEqual({
            privacyRedactedAt: '2026-08-08T12:00:00.000Z',
        })
    })
})
