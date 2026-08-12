import { describe, expect, it } from 'vitest'

import {
    assertSecurityMitigationTtl,
    getExtendedSecurityMitigationExpiry,
    getSecurityMitigationState,
    MAX_SECURITY_MITIGATION_TTL_MS,
    MIN_SECURITY_MITIGATION_TTL_MS,
} from './security-mitigation-policy.js'

describe('Security Center mitigation policy', () => {
    it('accepts only bounded whole-millisecond TTLs', () => {
        expect(assertSecurityMitigationTtl(MIN_SECURITY_MITIGATION_TTL_MS)).toBe(MIN_SECURITY_MITIGATION_TTL_MS)
        expect(assertSecurityMitigationTtl(MAX_SECURITY_MITIGATION_TTL_MS)).toBe(MAX_SECURITY_MITIGATION_TTL_MS)
        expect(() => assertSecurityMitigationTtl(MIN_SECURITY_MITIGATION_TTL_MS - 1)).toThrow()
        expect(() => assertSecurityMitigationTtl(MAX_SECURITY_MITIGATION_TTL_MS + 1)).toThrow()
        expect(() => assertSecurityMitigationTtl(1.5)).toThrow()
    })

    it('prioritizes explicit revocation and expires at the boundary', () => {
        const now = Date.parse('2026-08-08T12:00:00.000Z')

        expect(getSecurityMitigationState(new Date(now + 1), null, now)).toBe('active')
        expect(getSecurityMitigationState(new Date(now), null, now)).toBe('expired')
        expect(getSecurityMitigationState(new Date(now + 1), new Date(now), now)).toBe('revoked')
    })

    it('extends only active mitigations within the 24-hour recovery window', () => {
        const now = Date.parse('2026-08-11T12:00:00.000Z')

        expect(getExtendedSecurityMitigationExpiry(
            new Date(now + 60 * 60_000),
            15 * 60_000,
            now,
        )).toEqual(new Date(now + 75 * 60_000))
        expect(getExtendedSecurityMitigationExpiry(new Date(now), 15 * 60_000, now)).toBeNull()
        expect(getExtendedSecurityMitigationExpiry(
            new Date(now + MAX_SECURITY_MITIGATION_TTL_MS),
            MIN_SECURITY_MITIGATION_TTL_MS,
            now,
        )).toBeNull()
    })
})
