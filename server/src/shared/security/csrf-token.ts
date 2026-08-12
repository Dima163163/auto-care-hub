import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import type { FastifyReply, FastifyRequest } from 'fastify'

import { env } from '../../config/env.js'
import { AppError } from '../errors/app-error.js'
import { ERROR_CODES } from '../errors/error-codes.js'

const CSRF_TOKEN_BYTES = 32
const CSRF_TOKEN_MAX_AGE_SECONDS = 60 * 60
const CSRF_HEADER_NAME = 'x-csrf-token'

function getCsrfCookieOptions() {
    const isProduction = env.nodeEnv === 'production'

    return {
        path: '/',
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' as const : 'lax' as const,
        maxAge: CSRF_TOKEN_MAX_AGE_SECONDS,
    }
}

function hashToken(token: string) {
    return createHash('sha256').update(token).digest()
}

export function createCsrfToken() {
    return randomBytes(CSRF_TOKEN_BYTES).toString('base64url')
}

export function setCsrfTokenCookie(reply: FastifyReply, token: string) {
    reply.setCookie(
        env.auth.csrfTokenCookieName,
        token,
        getCsrfCookieOptions()
    )
}

export function clearCsrfTokenCookie(reply: FastifyReply) {
    const isProduction = env.nodeEnv === 'production'

    reply.clearCookie(env.auth.csrfTokenCookieName, {
        path: '/',
        secure: isProduction,
        sameSite: isProduction ? 'none' as const : 'lax' as const,
    })
}

export function tokensMatch(left: string, right: string) {
    return timingSafeEqual(hashToken(left), hashToken(right))
}

export function assertValidCsrfToken(
    request: Pick<FastifyRequest, 'cookies' | 'headers'>
) {
    const cookieToken = request.cookies[env.auth.csrfTokenCookieName]
    const headerValue = request.headers[CSRF_HEADER_NAME]
    const headerToken = Array.isArray(headerValue) ? headerValue[0] : headerValue

    if (
        !cookieToken ||
        !headerToken ||
        !tokensMatch(cookieToken, headerToken)
    ) {
        throw new AppError({
            statusCode: 403,
            code: ERROR_CODES.CsrfTokenMismatch,
            message: 'CSRF token is missing or invalid.',
        })
    }
}
