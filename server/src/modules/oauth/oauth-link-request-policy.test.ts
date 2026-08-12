import { describe, expect, it } from 'vitest'

import { getOAuthLinkRequestDecision } from './oauth-link-request-policy.js'

describe('OAuth link request consume policy', () => {
    const base = {
        exists: true,
        providerMatches: true,
        purposeMatches: true,
        consumed: false,
        expiresAt: new Date('2026-07-30T00:00:00.000Z'),
        now: new Date('2026-07-29T00:00:00.000Z'),
    }

    it('accepts only a matching active request', () => {
        expect(getOAuthLinkRequestDecision(base)).toBe('ready')
        expect(getOAuthLinkRequestDecision({ ...base, consumed: true })).toBe('consumed')
        expect(getOAuthLinkRequestDecision({ ...base, providerMatches: false })).toBe('wrong_provider')
        expect(getOAuthLinkRequestDecision({ ...base, expiresAt: new Date('2026-07-28T00:00:00.000Z') })).toBe('expired')
    })
})
