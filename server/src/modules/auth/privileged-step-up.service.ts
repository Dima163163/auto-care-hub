import type { FastifyRequest } from 'fastify'
import { IsNull } from 'typeorm'

import { AppDataSource } from '../../database/data-source.js'
import { UserSessionEntity } from '../../entities/user-session/user-session.entity.js'
import { UserEntity } from '../../entities/user/user.entity.js'
import { isAdminRole } from '../../shared/auth/roles.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { parseBearerToken } from './bearer-token.js'
import { verifyAccessToken } from './auth-token.js'
import { verifyPrivilegedMfa } from './privileged-mfa.service.js'
import { requireAuth } from './require-auth.js'
import { findUserSession } from './session.service.js'

export const PRIVILEGED_STEP_UP_MAX_AGE_MS = 5 * 60 * 1_000

function stepUpRequired() {
    return new AppError({
        statusCode: 403,
        code: ERROR_CODES.MfaStepUpRequired,
        message: 'Recent authenticator verification is required for this action.',
    })
}

function getCurrentSessionId(request: FastifyRequest) {
    const payload = verifyAccessToken(parseBearerToken(request.headers.authorization))
    if (!payload.sessionId) throw stepUpRequired()
    return payload.sessionId
}

export async function requireRecentPrivilegedMfa(request: FastifyRequest, now = Date.now()): Promise<UserEntity> {
    const user = await requireAuth(request)
    if (!isAdminRole(user.role)) {
        throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'Privileged access is required.' })
    }
    const session = await findUserSession(getCurrentSessionId(request), user.id)
    const verifiedAt = session?.mfaVerifiedAt?.getTime()
    if (verifiedAt === undefined || verifiedAt > now || now - verifiedAt > PRIVILEGED_STEP_UP_MAX_AGE_MS) {
        throw stepUpRequired()
    }
    return user
}

export async function stepUpPrivilegedSession(request: FastifyRequest, code: string, now = Date.now()) {
    const user = await requireAuth(request)
    if (!isAdminRole(user.role)) {
        throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'Privileged access is required.' })
    }
    const sessionId = getCurrentSessionId(request)
    await AppDataSource.transaction(async (manager) => {
        const session = await manager.getRepository(UserSessionEntity)
            .createQueryBuilder('session')
            .where('session.id = :sessionId', { sessionId })
            .andWhere('session.user_id = :userId', { userId: user.id })
            .andWhere('session.revoked_at IS NULL')
            .setLock('pessimistic_write')
            .getOne()
        if (!session || session.expiresAt.getTime() <= now) throw stepUpRequired()
        if (!await verifyPrivilegedMfa(user.id, code, now, manager)) throw stepUpRequired()
        const result = await manager.getRepository(UserSessionEntity).update(
            { id: sessionId, userId: user.id, revokedAt: IsNull() },
            { mfaVerifiedAt: new Date(now) },
        )
        if (result.affected !== 1) throw stepUpRequired()
    })
    return user
}
