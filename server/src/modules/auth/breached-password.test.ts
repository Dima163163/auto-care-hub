import { describe, expect, it } from 'vitest'

import {
    buildBreachedPasswordLookupRequest,
    checkBreachedPassword,
    getBreachedPasswordHashParts,
    isBreachedPasswordResponseWithinBounds,
    MAX_BREACHED_PASSWORD_RESPONSE_BYTES,
    parseBreachedPasswordResponse,
} from './breached-password.js'

describe('breached password helpers', () => {
    it('parses valid k-anonymity response lines and ignores malformed lines', () => {
        const suffix = 'A'.repeat(35)
        expect(parseBreachedPasswordResponse(
            `${suffix}:12\ninvalid\nabc:1\n`,
        )).toEqual([{
            suffix,
            count: 12,
        }])
    })

    it('returns a five-character prefix without exposing the password', () => {
        const parts = getBreachedPasswordHashParts('Correct Horse Battery Staple!')

        expect(parts.prefix).toHaveLength(5)
        expect(parts.suffix).toHaveLength(35)
        expect(parts.prefix).not.toContain('PASSWORD')
    })

    it('builds a bounded range request using only the hash prefix', () => {
        const request = buildBreachedPasswordLookupRequest('Correct Horse Battery Staple!')

        expect(request.url).toMatch(/^https:\/\/api\.pwnedpasswords\.com\/range\/[A-F0-9]{5}$/)
        expect(request.suffix).toMatch(/^[A-F0-9]{35}$/)
    })

    it('rejects oversized upstream responses before parsing', () => {
        expect(isBreachedPasswordResponseWithinBounds('ok')).toBe(true)
        expect(isBreachedPasswordResponseWithinBounds('x'.repeat(MAX_BREACHED_PASSWORD_RESPONSE_BYTES + 1))).toBe(false)
    })

    it('checks only the hash suffix returned by the range endpoint', async () => {
        const password = 'A different strong password 42!'
        const { suffix, url } = buildBreachedPasswordLookupRequest(password)
        const fetchImpl = async (input: string | URL | Request) => {
            expect(input).toBe(url)
            return new Response(`${'B'.repeat(35)}:2\n${suffix}:17\n`, {
                status: 200,
                headers: { 'content-type': 'text/plain' },
            })
        }

        await expect(checkBreachedPassword(password, {
            mode: 'enforce',
            fetchImpl,
        })).resolves.toEqual({ status: 'breached', count: 17 })
    })

    it('fails open as unavailable for upstream errors and oversized bodies', async () => {
        const fetchImpl = async () => new Response('upstream failure', { status: 503 })

        await expect(checkBreachedPassword('A different strong password 42!', {
            mode: 'shadow',
            fetchImpl,
        })).resolves.toEqual({ status: 'unavailable', reason: 'http' })

        const oversizedFetch = async () => new Response(
            'x'.repeat(MAX_BREACHED_PASSWORD_RESPONSE_BYTES + 1),
            { status: 200 },
        )

        await expect(checkBreachedPassword('A different strong password 42!', {
            mode: 'shadow',
            fetchImpl: oversizedFetch,
        })).resolves.toEqual({ status: 'unavailable', reason: 'response_too_large' })
    })

    it('does not call the provider when checks are disabled', async () => {
        const fetchImpl = async () => {
            throw new Error('provider must not be called')
        }

        await expect(checkBreachedPassword('A different strong password 42!', {
            mode: 'off',
            fetchImpl,
        })).resolves.toEqual({ status: 'not_breached' })
    })
})
