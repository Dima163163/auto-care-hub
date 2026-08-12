import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AppDataSource } from '../../database/data-source.js'
import { UserSessionEntity } from '../../entities/user-session/user-session.entity.js'
import { UserEntity, UserRole, UserStatus } from '../../entities/user/user.entity.js'
import { createUserSession, rotateUserSession } from './session.service.js'

describe('refresh session rotation integration', () => {
    let userId: string
    let sessionId: string

    beforeAll(async () => {
        const user = await AppDataSource.getRepository(UserEntity).save(
            AppDataSource.getRepository(UserEntity).create({
                name: `Refresh Integration ${Date.now()}`,
                email: `refresh-integration-${Date.now()}@example.com`,
                role: UserRole.Client,
                status: UserStatus.Active,
                passwordHash: 'hash',
                emailVerifiedAt: new Date(),
            }),
        )
        userId = user.id

        const session = await createUserSession({
            userId,
            userAgent: 'integration-test',
            ipAddress: '127.0.0.1',
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        })
        sessionId = session.id
    })

    afterAll(async () => {
        if (!AppDataSource.isInitialized) return

        await AppDataSource.getRepository(UserSessionEntity).delete({ userId })
        await AppDataSource.getRepository(UserEntity).delete({ id: userId })
    })

    it('allows only one concurrent refresh rotation to replace a session', async () => {
        const [first, second] = await Promise.all([
            rotateUserSession(sessionId, userId),
            rotateUserSession(sessionId, userId),
        ])

        expect([first, second].filter(Boolean)).toHaveLength(1)
        expect([first, second].filter((result) => result === null)).toHaveLength(1)

        const sessions = await AppDataSource.getRepository(UserSessionEntity).findBy({ userId })
        expect(sessions).toHaveLength(1)
        expect(sessions[0]?.id).not.toBe(sessionId)
    })
})
