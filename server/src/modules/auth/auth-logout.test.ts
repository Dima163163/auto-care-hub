import Fastify, { type FastifyInstance } from 'fastify'
import cookie from '@fastify/cookie'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const logoutMocks = vi.hoisted(() => ({
    verifyRefreshToken: vi.fn(),
    revokeUserSession: vi.fn(),
}))

vi.mock('./auth-token.js', () => ({
    verifyAccessToken: vi.fn(),
    verifyRefreshToken: logoutMocks.verifyRefreshToken,
}))

vi.mock('./auth.service.js', () => ({
    changePassword: vi.fn(),
    completeEmailVerification: vi.fn(),
    completePasswordReset: vi.fn(),
    completePasswordSetup: vi.fn(),
    createEmailVerificationTokenForUser: vi.fn(),
    createPasswordResetTokenForEmail: vi.fn(),
    getUserById: vi.fn(),
    loginMockUser: vi.fn(),
    loginUser: vi.fn(),
    refreshAuth: vi.fn(),
    registerUser: vi.fn(),
    verifyEmailVerificationToken: vi.fn(),
    verifyPasswordResetToken: vi.fn(),
    verifyPasswordSetupToken: vi.fn(),
}))

vi.mock('./require-auth.js', () => ({ requireAuth: vi.fn() }))

vi.mock('./session.service.js', () => ({
    createUserSession: vi.fn(),
    findUserSession: vi.fn(),
    listUserSessions: vi.fn(),
    revokeAllUserSessions: vi.fn(),
    revokeUserSession: logoutMocks.revokeUserSession,
    rotateUserSession: vi.fn(),
    updateUserSessionActivity: vi.fn(),
}))

vi.mock('../../shared/security/rate-limit.js', () => ({
    createRateLimitPreHandler: () => async () => undefined,
    getAuthenticatedUserRateLimitIdentifier: vi.fn(),
    getEmailRateLimitIdentifier: vi.fn(),
}))

import { env } from '../../config/env.js'
import { authRoutes } from './auth.routes.js'

const tokenPayload = {
    userId: '00000000-0000-4000-8000-000000000001',
    role: 'client' as const,
    tokenVersion: 1,
    sessionId: '00000000-0000-4000-8000-000000000002',
    tokenType: 'refresh' as const,
}

describe('auth logout', () => {
    let app: FastifyInstance

    beforeEach(async () => {
        logoutMocks.verifyRefreshToken.mockReset()
        logoutMocks.revokeUserSession.mockReset()
        logoutMocks.revokeUserSession.mockResolvedValue(undefined)

        app = Fastify()
        await app.register(cookie)
        await app.register(authRoutes)
        await app.ready()
    })

    afterEach(async () => {
        await app.close()
    })

    async function logoutWithCookie(refreshToken: string) {
        const csrfResponse = await app.inject({ method: 'GET', url: '/auth/csrf' })
        const refreshCookieName = env.auth.refreshTokenCookieName
        const csrfCookie = csrfResponse.headers['set-cookie']
        const csrfCookieValue = (Array.isArray(csrfCookie) ? csrfCookie[0] : csrfCookie)
            ?.split(';', 1)[0]

        return app.inject({
            method: 'POST',
            url: '/auth/logout',
            headers: {
                'x-csrf-token': csrfResponse.json().csrfToken,
                cookie: `${csrfCookieValue}; ${refreshCookieName}=${refreshToken}`,
            },
        })
    }

    function expectBothCookiesCleared(response: Awaited<ReturnType<typeof app.inject>>) {
        const setCookie = response.headers['set-cookie']
        const headers = Array.isArray(setCookie) ? setCookie : [setCookie]

        expect(headers.some((header) => header?.startsWith(`${env.auth.refreshTokenCookieName}=`)))
            .toBe(true)
        expect(headers.some((header) => header?.startsWith(`${env.auth.csrfTokenCookieName}=`)))
            .toBe(true)
        expect(headers.every((header) => header?.includes('Max-Age=0'))).toBe(true)
    }

    it('treats an invalid refresh token as an idempotent local logout', async () => {
        logoutMocks.verifyRefreshToken.mockImplementation(() => {
            throw new Error('invalid refresh token')
        })

        const response = await logoutWithCookie('invalid-token')

        expect(response.statusCode).toBe(200)
        expect(response.json()).toEqual({ success: true })
        expect(logoutMocks.revokeUserSession).not.toHaveBeenCalled()
        expectBothCookiesCleared(response)
    })

    it('does not claim logout success when storage revocation fails but still clears both cookies', async () => {
        logoutMocks.verifyRefreshToken.mockReturnValue(tokenPayload)
        logoutMocks.revokeUserSession.mockRejectedValueOnce(new Error('database unavailable'))

        const response = await logoutWithCookie('valid-token')

        expect(logoutMocks.revokeUserSession).toHaveBeenCalledWith(
            tokenPayload.sessionId,
            tokenPayload.userId,
        )
        expect(response.statusCode).toBe(500)
        expect(response.json().success).not.toBe(true)
        expectBothCookiesCleared(response)
    })
})
