import { describe, expect, it, vi } from 'vitest'

vi.mock('../../config/env', () => ({
    env: {
        auth: {
            csrfTokenCookieName: 'autocarehub_csrf_token',
        },
        nodeEnv: 'test',
    },
}))

import { AppError } from '../errors/app-error'
import { ERROR_CODES } from '../errors/error-codes'
import {
    assertValidCsrfToken,
    createCsrfToken,
    tokensMatch,
} from './csrf-token'

function requestWithToken(cookieToken?: string, headerToken?: string) {
    return {
        cookies: cookieToken
            ? {
                autocarehub_csrf_token: cookieToken,
            }
            : {},
        headers: headerToken
            ? {
                'x-csrf-token': headerToken,
            }
            : {},
    }
}

describe('csrf token protection', () => {
    it('creates unpredictable URL-safe tokens', () => {
        const firstToken = createCsrfToken()
        const secondToken = createCsrfToken()

        expect(firstToken).toMatch(/^[A-Za-z0-9_-]+$/)
        expect(firstToken).not.toBe(secondToken)
    })

    it('compares matching tokens', () => {
        expect(tokensMatch('matching-token', 'matching-token')).toBe(true)
        expect(tokensMatch('matching-token', 'different-token')).toBe(false)
    })

    it('accepts matching cookie and header tokens', () => {
        expect(() =>
            assertValidCsrfToken(
                requestWithToken('matching-token', 'matching-token')
            )
        ).not.toThrow()
    })

    it.each([
        requestWithToken(undefined, 'token'),
        requestWithToken('token'),
        requestWithToken('cookie-token', 'header-token'),
    ])('rejects missing or mismatched tokens', (request) => {
        expect(() => assertValidCsrfToken(request)).toThrow(AppError)

        try {
            assertValidCsrfToken(request)
        } catch (error) {
            expect((error as AppError).code).toBe(
                ERROR_CODES.CsrfTokenMismatch
            )
        }
    })

    it('rejects duplicate CSRF headers even when one value is valid', () => {
        expect(() => assertValidCsrfToken({
            cookies: { autocarehub_csrf_token: 'matching-token' },
            headers: { 'x-csrf-token': ['matching-token', 'attacker-value'] },
        })).toThrow(AppError)
    })
})
