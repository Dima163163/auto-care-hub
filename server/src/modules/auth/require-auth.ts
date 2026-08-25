import type { FastifyRequest } from 'fastify'

import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { verifyAccessToken } from './auth-token.js'
import { getUserById } from './auth.service.js'
import { parseBearerToken } from './bearer-token.js'
import { findUserSession } from './session.service.js'
import { isUserSessionExpired } from './session-lifecycle.js'

function getBearerToken(request: FastifyRequest) {
    return parseBearerToken(request.headers.authorization)
}

export async function assertAccessSessionActive(userId: string, sessionId: string | undefined) {
    // Legacy/setup access tokens may intentionally have no persisted session.
    // Once a token is bound to a session, however, revoking that session must
    // immediately invalidate the access token as well as its refresh token.
    if (!sessionId) return
    const session = await findUserSession(sessionId, userId)
    if (!session || isUserSessionExpired(session.expiresAt)) {
        throw new AppError({
            statusCode: 401,
            code: ERROR_CODES.Unauthorized,
            message: 'Session is no longer active.',
        })
    }
}

export async function requireAuth(request: FastifyRequest) {
    try {
        const token = getBearerToken(request)
        const payload = verifyAccessToken(token)

        const user = await getUserById(payload.userId, payload.tokenVersion)
        await assertAccessSessionActive(payload.userId, payload.sessionId)
        return user
    } catch (error) {
        if (error instanceof AppError) {
            throw error
        }

        throw new AppError({
            statusCode: 401,
            code: ERROR_CODES.Unauthorized,
            message: 'Invalid or expired access token.',
        })
    }
}

export async function requireVerifiedEmail(request: FastifyRequest) {
    const user = await requireAuth(request)

    if (!user.emailVerifiedAt) {
        throw new AppError({
            statusCode: 403,
            code: ERROR_CODES.EmailVerificationRequired,
            message: 'Email verification is required to perform this action.',
        })
    }

    return user
}
