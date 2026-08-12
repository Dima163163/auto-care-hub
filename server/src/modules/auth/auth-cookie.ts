import type { FastifyReply, FastifyRequest } from 'fastify'

import { env } from '../../config/env.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'

const SEVEN_DAYS_IN_SECONDS = 7 * 24 * 60 * 60

function getRefreshCookieOptions() {
    const isProduction = env.nodeEnv === 'production'

    return {
        path: '/',
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' as const : 'lax' as const,
        maxAge: SEVEN_DAYS_IN_SECONDS,
    }
}

export function setRefreshTokenCookie(
    reply: FastifyReply,
    refreshToken: string
) {
    reply.setCookie(
        env.auth.refreshTokenCookieName,
        refreshToken,
        getRefreshCookieOptions()
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