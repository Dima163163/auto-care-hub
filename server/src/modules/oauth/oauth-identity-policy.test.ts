import { describe, expect, it } from 'vitest'

import { normalizeOAuthProviderSubject } from './oauth-identity-policy.js'

describe('OAuth identity subject policy', () => {
    it('trims valid provider subjects', () => {
        expect(normalizeOAuthProviderSubject('  provider-123  ')).toBe('provider-123')
    })

    it('rejects empty, oversized, and control-character-only subjects', () => {
        expect(() => normalizeOAuthProviderSubject('')).toThrow(/invalid/)
        expect(() => normalizeOAuthProviderSubject('x'.repeat(256))).toThrow(/invalid/)
        expect(() => normalizeOAuthProviderSubject('\u0000')).toThrow(/invalid/)
    })
})
