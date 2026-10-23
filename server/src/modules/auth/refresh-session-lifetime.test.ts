import jwt from 'jsonwebtoken'
import { describe, expect, it } from 'vitest'

import { createRefreshToken, verifyRefreshToken } from './auth-token.js'
import { getRefreshTokenCookieMaxAge } from './auth-cookie.js'
import { calculateRefreshSessionExpiry, parseRefreshSessionTtlSeconds } from './refresh-session-lifetime.js'

const payload = {
    userId: '00000000-0000-4000-8000-000000000001',
    role: 'client' as const,
    tokenVersion: 1,
    sessionId: '00000000-0000-4000-8000-000000000002',
}

describe('absolute refresh session lifetime', () => {
    it.each([
        ['1h', 3_600],
        ['7d', 604_800],
        ['30d', 2_592_000],
    ])('aligns DB expiry, refresh JWT and cookie for %s', (duration, seconds) => {
        const now = new Date()
        const expiresAt = calculateRefreshSessionExpiry(duration, now)
        expect(expiresAt.getTime() - now.getTime()).toBe(seconds * 1_000)

        const token = createRefreshToken(payload, expiresAt)
        const tokenPayload = jwt.decode(token)
        expect(tokenPayload).toBeTruthy()
        expect(typeof tokenPayload).not.toBe('string')
        if (!tokenPayload || typeof tokenPayload === 'string') return

        expect(tokenPayload.exp).toBe(Math.floor(expiresAt.getTime() / 1_000))
        expect(getRefreshTokenCookieMaxAge(token)).toBeGreaterThanOrEqual(seconds - 2)
        expect(getRefreshTokenCookieMaxAge(token)).toBeLessThanOrEqual(seconds)
        expect(verifyRefreshToken(token)).toMatchObject(payload)
    })

    it.each(['0d', '-1d', '1.5h', '1', '366d', 'abc', '999999999999999999d'])('rejects invalid duration %s', (duration) => {
        expect(() => parseRefreshSessionTtlSeconds(duration)).toThrow('JWT_REFRESH_EXPIRES_IN')
    })

    it('preserves the original expiry when a refresh token is rotated', () => {
        const expiry = calculateRefreshSessionExpiry('1h')
        const first = createRefreshToken(payload, expiry)
        const rotated = createRefreshToken({ ...payload, sessionId: '00000000-0000-4000-8000-000000000003' }, expiry)
        const firstPayload = jwt.decode(first)
        const rotatedPayload = jwt.decode(rotated)
        expect(firstPayload).toHaveProperty('exp')
        expect(rotatedPayload).toHaveProperty('exp', (firstPayload as jwt.JwtPayload).exp)
    })

    it('refuses to issue an already expired refresh token', () => {
        expect(() => createRefreshToken(payload, new Date(0))).toThrow('Refresh session has expired.')
    })
})
