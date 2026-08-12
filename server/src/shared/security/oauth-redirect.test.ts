import { describe, expect, it } from 'vitest'

import { validateOAuthRedirectUri } from './oauth-redirect.js'

describe('OAuth redirect URI validation', () => {
    it('allows HTTPS production callbacks and loopback development callbacks', () => {
        expect(validateOAuthRedirectUri(
            'https://autocarehub.example/auth/oauth/google/callback',
            true,
        )).toBe('https://autocarehub.example/auth/oauth/google/callback')
        expect(validateOAuthRedirectUri(
            'http://localhost:4000/auth/oauth/google/callback',
            false,
        )).toContain('http://localhost:4000')
    })

    it('rejects downgrade, userinfo, and query-bearing callback URLs', () => {
        expect(() => validateOAuthRedirectUri('http://autocarehub.example/callback', true))
            .toThrow(/not allowed/)
        expect(() => validateOAuthRedirectUri('https://user:pass@autocarehub.example/callback', true))
            .toThrow(/not allowed/)
        expect(() => validateOAuthRedirectUri('https://autocarehub.example/callback?next=evil', true))
            .toThrow(/not allowed/)
    })
})
