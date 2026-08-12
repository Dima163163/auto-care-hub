import { describe, expect, it } from 'vitest'

import {
    getSessionRevocationMetadata,
    normalizeSessionRevocationReason,
} from './session-revocation.js'

describe('session revocation reasons', () => {
    it('keeps supported reasons stable', () => {
        expect(normalizeSessionRevocationReason('refresh_reuse')).toBe('refresh_reuse')
        expect(normalizeSessionRevocationReason('all_sessions')).toBe('all_sessions')
    })

    it('falls back to a safe manual reason for unknown input', () => {
        expect(normalizeSessionRevocationReason(undefined)).toBe('manual')
        expect(normalizeSessionRevocationReason('user_supplied')).toBe('manual')
        expect(normalizeSessionRevocationReason(42)).toBe('manual')
    })

    it('maps a revoke event to persisted metadata', () => {
        const revokedAt = new Date('2026-07-29T08:00:00.000Z')

        expect(getSessionRevocationMetadata('refresh_reuse', revokedAt)).toEqual({
            revokedAt,
            revocationReason: 'refresh_reuse',
        })
    })
})
