import { describe, expect, it, vi } from 'vitest'

vi.mock('../../config/env', () => ({
    env: {
        nodeEnv: 'test',
        oauth: {
            stateCookieName: 'autocarehub_oauth_state',
        },
    },
}))

import type { FastifyReply } from 'fastify'
import {
    clearOAuthStateCookie,
    generateOAuthState,
    getOAuthStateValidationResult,
    isOAuthStateValid,
    setOAuthStateCookie,
    MAX_OAUTH_STATE_COOKIE_LENGTH,
} from './oauth-state'

function createReply() {
    return {
        clearCookie: vi.fn(),
        setCookie: vi.fn(),
    } as unknown as FastifyReply
}

describe('OAuth state protection', () => {
    it('generates high-entropy URL-safe state values', () => {
        const state = generateOAuthState()

        expect(state).toMatch(/^[a-f0-9]{64}$/)
    })

    it('binds the cookie to the provider and callback state', () => {
        const reply = createReply()
        const state = generateOAuthState()

        setOAuthStateCookie(reply, 'google', state)

        const cookieValue = (reply.setCookie as ReturnType<typeof vi.fn>).mock
            .calls[0][1]

        expect(
            isOAuthStateValid(
                { cookies: { autocarehub_oauth_state: cookieValue } },
                'google',
                state
            )
        ).toBe(true)
        expect(
            isOAuthStateValid(
                { cookies: { autocarehub_oauth_state: cookieValue } },
                'yandex',
                state
            )
        ).toBe(false)
        expect(
            isOAuthStateValid(
                { cookies: { autocarehub_oauth_state: cookieValue } },
                'google',
                'replayed-state'
            )
        ).toBe(false)
    })

    it('rejects replay-shaped or non-hex callback state values', () => {
        expect(isOAuthStateValid(
            { cookies: { autocarehub_oauth_state: 'google:' + 'a'.repeat(64) } },
            'google',
            'a'.repeat(63),
        )).toBe(false)
        expect(isOAuthStateValid(
            { cookies: { autocarehub_oauth_state: 'google:state-value' } },
            'google',
            'state-value',
        )).toBe(false)
    })

    it('rejects missing state and clears the cookie with the expected scope', () => {
        const reply = createReply()

        expect(
            isOAuthStateValid(
                { cookies: {} },
                'google',
                undefined
            )
        ).toBe(false)

        clearOAuthStateCookie(reply)

        expect(reply.clearCookie).toHaveBeenCalledWith(
            'autocarehub_oauth_state',
            expect.objectContaining({ path: '/', sameSite: 'lax' })
        )
    })

    it('classifies missing, malformed, mismatched, and valid callbacks', () => {
        const state = 'a'.repeat(64)

        expect(getOAuthStateValidationResult(undefined, 'google', state)).toBe('missing')
        expect(getOAuthStateValidationResult('google:' + state, 'google', 'bad')).toBe('malformed')
        expect(getOAuthStateValidationResult('yandex:' + state, 'google', state)).toBe('mismatch')
        expect(getOAuthStateValidationResult('google:' + state, 'google', state)).toBe('valid')
        expect(getOAuthStateValidationResult('x'.repeat(MAX_OAUTH_STATE_COOKIE_LENGTH + 1), 'google', state))
            .toBe('malformed')
    })
})
