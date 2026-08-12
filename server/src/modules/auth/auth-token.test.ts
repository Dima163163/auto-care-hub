import jwt from 'jsonwebtoken'
import { describe, expect, it } from 'vitest'

import { env } from '../../config/env.js'
import {
    createAccessToken,
    createRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
} from './auth-token'

const payload = {
    userId: '00000000-0000-4000-8000-000000000001',
    role: 'client' as const,
    tokenVersion: 3,
    sessionId: '00000000-0000-4000-8000-000000000002',
}

describe('auth tokens', () => {
    it('preserves the current session version in access and refresh tokens', () => {
        expect(verifyAccessToken(createAccessToken(payload))).toMatchObject(
            payload
        )
        expect(verifyRefreshToken(createRefreshToken(payload))).toMatchObject(
            payload
        )
    })

    it.each([
        ['missing', undefined],
        ['fractional', 1.5],
        ['non-positive', 0],
    ])('rejects %s token versions', (_label, tokenVersion) => {
        const accessToken = jwt.sign(
            {
                userId: payload.userId,
                role: payload.role,
                tokenType: 'access',
                ...(tokenVersion === undefined ? {} : { tokenVersion }),
            },
            env.auth.jwtAccessSecret
        )

        expect(() => verifyAccessToken(accessToken)).toThrow(
            'Invalid access token payload.'
        )
    })

    it.each([
        ['non-uuid user id', { userId: 'user-id' }],
        ['unknown role', { role: 'operator' }],
    ])('rejects %s token payloads', (_label, invalidFields) => {
        const accessToken = jwt.sign(
            {
                ...payload,
                ...invalidFields,
                tokenType: 'access',
            },
            env.auth.jwtAccessSecret,
        )

        expect(() => verifyAccessToken(accessToken)).toThrow(
            'Invalid access token payload.',
        )
    })

    it('rejects malformed refresh identity claims', () => {
        const refreshToken = jwt.sign(
            {
                ...payload,
                role: 'operator',
                tokenType: 'refresh',
            },
            env.auth.jwtRefreshSecret,
        )

        expect(() => verifyRefreshToken(refreshToken)).toThrow(
            'Invalid refresh token payload.',
        )
    })

    it('rejects a malformed optional session identifier', () => {
        const accessToken = jwt.sign(
            {
                ...payload,
                sessionId: 'not-a-uuid',
                tokenType: 'access',
            },
            env.auth.jwtAccessSecret,
        )

        expect(() => verifyAccessToken(accessToken)).toThrow(
            'Invalid access token payload.',
        )
    })
})
