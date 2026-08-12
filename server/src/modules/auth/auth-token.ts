import jwt, { type Secret, type SignOptions } from 'jsonwebtoken'

import { env } from '../../config/env.js'
import type { AccessTokenPayload, RefreshTokenPayload } from './auth.types.js'

function isObjectPayload(payload: unknown): payload is Record<string, unknown> {
    return typeof payload === 'object' && payload !== null
}

function isTokenVersion(value: unknown): value is number {
    return Number.isSafeInteger(value) && Number(value) >= 1
}

function isUuid(value: unknown): value is string {
    return typeof value === 'string'
        && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function isOptionalUuid(value: unknown) {
    return value === undefined || isUuid(value)
}

function isUserRole(value: unknown): value is AccessTokenPayload['role'] {
    return value === 'client'
        || value === 'owner'
        || value === 'admin'
        || value === 'super_admin'
}

export function createAccessToken(
    payload: Omit<AccessTokenPayload, 'tokenType'>
) {
    const options: SignOptions = {
        expiresIn: env.auth.jwtAccessExpiresIn,
    }

    return jwt.sign(
        {
            ...payload,
            tokenType: 'access',
        },
        env.auth.jwtAccessSecret as Secret,
        options
    )
}

export function createRefreshToken(
    payload: Omit<RefreshTokenPayload, 'tokenType'>
) {
    const options: SignOptions = {
        expiresIn: env.auth.jwtRefreshExpiresIn,
    }

    return jwt.sign(
        {
            ...payload,
            tokenType: 'refresh',
        },
        env.auth.jwtRefreshSecret as Secret,
        options
    )
}

export function verifyAccessToken(token: string): AccessTokenPayload {
    const payload = jwt.verify(token, env.auth.jwtAccessSecret as Secret)

    if (
        !isObjectPayload(payload) ||
        payload.tokenType !== 'access' ||
        !isUuid(payload.userId) ||
        !isUserRole(payload.role) ||
        !isOptionalUuid(payload.sessionId) ||
        !isTokenVersion(payload.tokenVersion)
    ) {
        throw new Error('Invalid access token payload.')
    }

    return {
        userId: payload.userId,
        role: payload.role as AccessTokenPayload['role'],
        tokenVersion: payload.tokenVersion,
        sessionId: typeof payload.sessionId === 'string' ? payload.sessionId : undefined,
        tokenType: 'access',
    }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
    const payload = jwt.verify(token, env.auth.jwtRefreshSecret as Secret)

    if (
        !isObjectPayload(payload) ||
        payload.tokenType !== 'refresh' ||
        !isUuid(payload.userId) ||
        !isUserRole(payload.role) ||
        !isOptionalUuid(payload.sessionId) ||
        !isTokenVersion(payload.tokenVersion)
    ) {
        throw new Error('Invalid refresh token payload.')
    }

    return {
        userId: payload.userId,
        role: payload.role as RefreshTokenPayload['role'],
        tokenVersion: payload.tokenVersion,
        sessionId: typeof payload.sessionId === 'string' ? payload.sessionId : undefined,
        tokenType: 'refresh',
    }
}
