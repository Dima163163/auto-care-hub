import { AppDataSource } from '../../database/data-source.js'
import { IsNull, MoreThan } from 'typeorm'
import { UserEntity } from '../../entities/user/user.entity.js'
import { UserSessionEntity } from '../../entities/user-session/user-session.entity.js'
import { isUserSessionExpired } from './session-lifecycle.js'
import { getRefreshRotationDecision } from './refresh-rotation.js'
import { getSessionListLimit } from './session-limits.js'
import { normalizeSessionMetadata } from './session-metadata.js'
import {
    getSessionRevocationMetadata,
    type SessionRevocationReason,
} from './session-revocation.js'

type CreateSessionInput = {
    userId: string
    userAgent?: string | null
    ipAddress?: string | null
    expiresAt: Date
}

export async function createUserSession(input: CreateSessionInput) {
    const sessionRepository = AppDataSource.getRepository(UserSessionEntity)
    const metadata = normalizeSessionMetadata(input)

    const session = sessionRepository.create({
        userId: input.userId,
        userAgent: metadata.userAgent,
        ipAddress: metadata.ipAddress,
        lastActiveAt: new Date(),
        expiresAt: input.expiresAt,
    })

    return sessionRepository.save(session)
}

export async function listUserSessions(userId: string, now = new Date()) {
    const sessionRepository = AppDataSource.getRepository(UserSessionEntity)

    return sessionRepository.find({
        where: { userId, expiresAt: MoreThan(now), revokedAt: IsNull() },
        order: { lastActiveAt: 'DESC' },
        take: getSessionListLimit(),
    })
}

export async function findUserSession(sessionId: string, userId: string) {
    const sessionRepository = AppDataSource.getRepository(UserSessionEntity)

    return sessionRepository.findOne({
        where: { id: sessionId, userId, revokedAt: IsNull() },
    })
}

export async function updateUserSessionActivity(sessionId: string, now = new Date()) {
    const sessionRepository = AppDataSource.getRepository(UserSessionEntity)

    const result = await sessionRepository
        .createQueryBuilder()
        .update(UserSessionEntity)
        .set({ lastActiveAt: now })
        .where('"id" = :sessionId', { sessionId })
        .andWhere('"expiresAt" > :now', { now })
        .execute()

    return (result.affected ?? 0) > 0
}

export async function rotateUserSession(sessionId: string, userId: string) {
    return AppDataSource.transaction(async (manager) => {
        const session = await manager
            .getRepository(UserSessionEntity)
            .createQueryBuilder('session')
            .where('session.id = :sessionId', { sessionId })
            .andWhere('session.user_id = :userId', { userId })
            .andWhere('session.revoked_at IS NULL')
            .setLock('pessimistic_write')
            .getOne()

        const decision = getRefreshRotationDecision({
            sessionFound: Boolean(session),
            expired: session ? isUserSessionExpired(session.expiresAt) : false,
            revoked: Boolean(session?.revokedAt),
        })

        if (decision !== 'rotate' || !session) return null

        const replacement = manager.getRepository(UserSessionEntity).create({
            userId: session.userId,
            userAgent: session.userAgent,
            ipAddress: session.ipAddress,
            lastActiveAt: new Date(),
            expiresAt: session.expiresAt,
            revokedAt: null,
            revocationReason: null,
        })

        await manager.getRepository(UserSessionEntity).remove(session)
        return manager.getRepository(UserSessionEntity).save(replacement)
    })
}

export async function revokeUserSession(
    sessionId: string,
    userId: string,
    reason: SessionRevocationReason = 'manual',
) {
    const sessionRepository = AppDataSource.getRepository(UserSessionEntity)

    await sessionRepository.update({ id: sessionId, userId, revokedAt: IsNull() }, getSessionRevocationMetadata(reason))
}

export async function revokeAllUserSessions(
    userId: string,
    reason: SessionRevocationReason = 'all_sessions',
) {
    await AppDataSource.transaction(async (manager) => {
        await manager.update(UserSessionEntity, { userId, revokedAt: IsNull() }, getSessionRevocationMetadata(reason))
        
        // Also increment token version to invalidate all current JWTs
        await manager.increment(UserEntity, { id: userId }, 'tokenVersion', 1)
    })
}

export async function cleanupExpiredSessions() {
    const sessionRepository = AppDataSource.getRepository(UserSessionEntity)

    await sessionRepository
        .createQueryBuilder()
        .delete()
        .where('"expiresAt" < :now', { now: new Date() })
        .execute()
}
