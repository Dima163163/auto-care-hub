import { describe, expect, it } from 'vitest'

import {
    parseAccessTokenResponse,
    parseCsrfTokenResponse,
} from './security-response-schema'

describe('security response schemas', () => {
    it('accepts non-empty access and CSRF tokens', () => {
        expect(parseAccessTokenResponse({ accessToken: 'access-1' })).toBe('access-1')
        expect(parseCsrfTokenResponse({ csrfToken: 'csrf-1' })).toBe('csrf-1')
    })

    it('fails closed for missing, empty, or wrong token values', () => {
        expect(parseAccessTokenResponse({ accessToken: '' })).toBeNull()
        expect(parseAccessTokenResponse({ accessToken: 42 })).toBeNull()
        expect(parseCsrfTokenResponse({ csrfToken: undefined })).toBeNull()
        expect(parseCsrfTokenResponse(null)).toBeNull()
    })
})

