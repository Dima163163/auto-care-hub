import type { FastifyRequest } from 'fastify'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppError } from '../../shared/errors/app-error.js'
import { parseBearerToken } from './bearer-token.js'
import { assertAccessSessionActive, requireVerifiedEmail } from './require-auth.js'

const sessionMocks = vi.hoisted(() => ({
    findUserSession: vi.fn(),
}))

const authMocks = vi.hoisted(() => ({
    getUserById: vi.fn(),
    verifyAccessToken: vi.fn(),
}))

vi.mock('./session.service.js', () => sessionMocks)
vi.mock('./auth.service.js', () => ({ getUserById: authMocks.getUserById }))
vi.mock('./auth-token.js', () => ({ verifyAccessToken: authMocks.verifyAccessToken }))

const accessTokenPayload = {
    userId: '00000000-0000-4000-8000-000000000001',
    role: 'client' as const,
    tokenVersion: 1,
    tokenType: 'access' as const,
}

const requestWithToken = {
    headers: { authorization: 'Bearer access-token' },
} as FastifyRequest

beforeEach(() => {
    sessionMocks.findUserSession.mockReset()
    authMocks.getUserById.mockReset()
    authMocks.verifyAccessToken.mockReset()
    authMocks.verifyAccessToken.mockReturnValue(accessTokenPayload)
})

describe('parseBearerToken', () => {
    it.each([
        ['missing header', undefined],
        ['basic authentication', 'Basic credentials'],
        ['missing token', 'Bearer'],
        ['multiple tokens', 'Bearer access-token extra'],
        ['token in the scheme position', 'access-token Bearer'],
    ])('rejects %s', (_label, header) => {
        expect(() => parseBearerToken(header)).toThrow(AppError)
    })

    it('accepts a case-insensitive scheme with surrounding whitespace', () => {
        expect(parseBearerToken('  bearer\taccess-token  ')).toBe('access-token')
    })
})

describe('assertAccessSessionActive', () => {
    it('rejects a token bound to a revoked or missing session', async () => {
        sessionMocks.findUserSession.mockResolvedValueOnce(null)

        await expect(assertAccessSessionActive('user-id', 'session-id')).rejects.toMatchObject({
            statusCode: 401,
        })
    })

    it('accepts an active persisted session and legacy sessionless tokens', async () => {
        sessionMocks.findUserSession.mockResolvedValueOnce({
            expiresAt: new Date(Date.now() + 60_000),
        })

        await expect(assertAccessSessionActive('user-id', 'session-id')).resolves.toBeUndefined()
        await expect(assertAccessSessionActive('user-id', undefined)).resolves.toBeUndefined()
    })
})

describe('requireVerifiedEmail', () => {
    it('rejects an authenticated user whose email is not verified', async () => {
        authMocks.getUserById.mockResolvedValue({ id: accessTokenPayload.userId, emailVerifiedAt: null })

        await expect(requireVerifiedEmail(requestWithToken)).rejects.toMatchObject({
            statusCode: 403,
            code: 'EMAIL_VERIFICATION_REQUIRED',
        })
    })

    it('returns an authenticated user after email verification', async () => {
        const user = { id: accessTokenPayload.userId, emailVerifiedAt: new Date() }
        authMocks.getUserById.mockResolvedValue(user)

        await expect(requireVerifiedEmail(requestWithToken)).resolves.toBe(user)
    })
})
