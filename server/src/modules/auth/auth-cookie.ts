import type { FastifyReply, FastifyRequest } from 'fastify'
import jwt from 'jsonwebtoken'

import { env } from '../../config/env.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'

export function getRefreshTokenCookieMaxAge(refreshToken: string, now = new Date()) {
    const payload = jwt.decode(refreshToken)
    if (!payload || typeof payload === 'string' || !Number.isSafeInteger(payload.exp)) {
        throw new Error('Refresh token expiry is missing.')
    }
    return Math.max(0, Number(payload.exp) - Math.ceil(now.getTime() / 1_000))
}

function getRefreshCookieOptions(refreshToken: string) {
    const isProduction = env.nodeEnv === 'production'

    return {
        path: '/',
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' as const : 'lax' as const,
        maxAge: getRefreshTokenCookieMaxAge(refreshToken),
    }
}

export function setRefreshTokenCookie(
    reply: FastifyReply,
    refreshToken: string
) {
    reply.setCookie(
        env.auth.refreshTokenCookieName,
        refreshToken,
        getRefreshCookieOptions(refreshToken)
    )
}

export function clearRefreshTokenCookie(reply: FastifyReply) {
    const isProduction = env.nodeEnv === 'production'

    reply.clearCookie(env.auth.refreshTokenCookieName, {
        path: '/',
        secure: isProduction,
        sameSite: isProduction ? 'none' as const : 'lax' as const,
    })
}

export function getRefreshTokenFromCookie(request: FastifyRequest) {
    const token = request.cookies[env.auth.refreshTokenCookieName]

    if (!token) {
        throw new AppError({
            statusCode: 401,
            code: ERROR_CODES.Unauthorized,
            message: 'Refresh token is required.',
        })
    }

    return token
}
