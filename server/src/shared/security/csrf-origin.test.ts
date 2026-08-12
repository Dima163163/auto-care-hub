import { describe, expect, it } from 'vitest'

import { AppError } from '../errors/app-error'
import { ERROR_CODES } from '../errors/error-codes'
import {
    assertTrustedRequestOrigin,
    getRequestOrigin,
    isTrustedRequestOrigin,
} from './csrf-origin'

const options = {
    allowedOrigins: ['https://app.example.com'],
    isProduction: true,
}

function requestWithHeaders(headers: Record<string, string | string[] | undefined>) {
    return {
        headers,
    }
}

describe('csrf origin protection', () => {
    it('reads origin header before referer', () => {
        expect(
            getRequestOrigin(
                requestWithHeaders({
                    origin: 'https://app.example.com',
                    referer: 'https://other.example.com/path',
                })
            )
        ).toBe('https://app.example.com')
    })

    it('falls back to referer origin', () => {
        expect(
            getRequestOrigin(
                requestWithHeaders({
                    referer: 'https://app.example.com/account?tab=security',
                })
            )
        ).toBe('https://app.example.com')
    })

    it('allows trusted origin', () => {
        expect(
            isTrustedRequestOrigin(
                requestWithHeaders({
                    origin: 'https://app.example.com',
                }),
                options
            )
        ).toBe(true)
    })

    it('allows any configured trusted origin', () => {
        expect(
            isTrustedRequestOrigin(
                requestWithHeaders({
                    origin: 'https://preview.example.com',
                }),
                {
                    ...options,
                    allowedOrigins: [
                        'https://app.example.com',
                        'https://preview.example.com',
                    ],
                }
            )
        ).toBe(true)
    })

    it('rejects cross-site origin', () => {
        expect(
            isTrustedRequestOrigin(
                requestWithHeaders({
                    origin: 'https://evil.example.com',
                }),
                options
            )
        ).toBe(false)
    })

    it('requires origin or referer in production', () => {
        expect(
            isTrustedRequestOrigin(requestWithHeaders({}), options)
        ).toBe(false)
    })

    it('allows missing origin outside production for local tools', () => {
        expect(
            isTrustedRequestOrigin(requestWithHeaders({}), {
                ...options,
                isProduction: false,
            })
        ).toBe(true)
    })

    it('rejects ambiguous duplicate origin headers', () => {
        expect(
            isTrustedRequestOrigin(
                requestWithHeaders({
                    origin: ['https://app.example.com', 'https://evil.example.com'],
                }),
                { ...options, isProduction: false },
            )
        ).toBe(false)
        expect(
            isTrustedRequestOrigin(
                requestWithHeaders({
                    referer: ['https://app.example.com/account', 'https://evil.example.com/'],
                }),
                { ...options, isProduction: false },
            )
        ).toBe(false)
    })

    it('throws stable CSRF error code for untrusted requests', () => {
        expect(() =>
            assertTrustedRequestOrigin(
                requestWithHeaders({
                    origin: 'https://evil.example.com',
                }),
                options
            )
        ).toThrow(AppError)

        try {
            assertTrustedRequestOrigin(
                requestWithHeaders({
                    origin: 'https://evil.example.com',
                }),
                options
            )
        } catch (error) {
            expect((error as AppError).code).toBe(ERROR_CODES.CsrfOriginMismatch)
        }
    })
})
