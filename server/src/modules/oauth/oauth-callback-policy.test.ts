import { describe, expect, it } from 'vitest'

import {
    MAX_OAUTH_CODE_LENGTH,
    normalizeOAuthCallbackCode,
    normalizeOAuthCallbackError,
    normalizeOAuthCallbackErrorDescription,
} from './oauth-callback-policy.js'

describe('OAuth callback policy', () => {
    it('normalizes callback values and preserves optional fields', () => {
        expect(normalizeOAuthCallbackCode('  code\nvalue ')).toBe('code value')
        expect(normalizeOAuthCallbackError(' access_denied ')).toBe('access_denied')
        expect(normalizeOAuthCallbackErrorDescription(undefined)).toBeUndefined()
    })

    it('rejects empty and oversized callback values', () => {
        expect(() => normalizeOAuthCallbackCode('')).toThrow(/code/)
        expect(() => normalizeOAuthCallbackCode('x'.repeat(MAX_OAUTH_CODE_LENGTH + 1))).toThrow(/code/)
        expect(() => normalizeOAuthCallbackError('   ')).toThrow(/error/)
        expect(() => normalizeOAuthCallbackErrorDescription('x'.repeat(501))).toThrow(/description/)
    })
})
