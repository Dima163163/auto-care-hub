import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'

import { buildApp } from '../../app.js'
import { AppDataSource } from '../../database/data-source.js'
import { AuditAction, AuditLogEntity } from '../../entities/audit-log/audit-log.entity.js'
import { UserSessionEntity } from '../../entities/user-session/user-session.entity.js'
import { UserEntity, UserRole, UserStatus } from '../../entities/user/user.entity.js'
import { createAuthTokens } from '../auth/auth.service.js'

describe('Security Center session revocation route', () => {
    const apps: FastifyInstance[] = []

    afterEach(async () => {
        await Promise.all(apps.splice(0).map((app) => app.close()))
    })

    it('revokes the target sessions, increments token version, and writes a no-store audit response', async () => {
        const app = await buildApp()
        apps.push(app)

        const uniqueId = Date.now()
        const userRepository = AppDataSource.getRepository(UserEntity)
        const sessionRepository = AppDataSource.getRepository(UserSessionEntity)
        const superAdmin = await userRepository.save(userRepository.create({
            name: 'Security Center Super Admin',
            email: `security-center-super-admin-${uniqueId}@example.com`,
            passwordHash: 'hash',
            role: UserRole.SuperAdmin,
            status: UserStatus.Active,
            emailVerifiedAt: new Date(),
        }))
        const target = await userRepository.save(userRepository.create({
            name: 'Security Center Target User',
            email: `security-center-target-${uniqueId}@example.com`,
            passwordHash: 'hash',
            role: UserRole.Client,
            status: UserStatus.Active,
            emailVerifiedAt: new Date(),
        }))
        const session = await sessionRepository.save(sessionRepository.create({
            userId: target.id,
            userAgent: 'security-center-test',
            ipAddress: '192.0.2.10',
            lastActiveAt: new Date(),
            expiresAt: new Date(Date.now() + 60 * 60_000),
            revokedAt: null,
            revocationReason: null,
        }))
        const token = createAuthTokens(superAdmin).accessToken
        const initialTokenVersion = target.tokenVersion

        try {
            await app.ready()

            const response = await request(app.server)
                .post(`/admin/security-center/users/${target.id}/revoke-sessions`)
                .set('Authorization', `Bearer ${token}`)

            expect(response.status).toBe(200)
            expect(response.headers['cache-control']).toBe('no-store')
            expect(response.body).toMatchObject({
                userId: target.id,
                revokedAt: expect.any(String),
            })

            const reloadedTarget = await userRepository.findOneByOrFail({ id: target.id })
            const revokedSession = await sessionRepository.findOneByOrFail({ id: session.id })
            const auditLog = await AppDataSource.getRepository(AuditLogEntity).findOne({
                where: { targetId: target.id, action: AuditAction.SecurityUserSessionsRevoked },
                order: { createdAt: 'DESC' },
            })

            expect(reloadedTarget.tokenVersion).toBe(initialTokenVersion + 1)
            expect(revokedSession.revokedAt).toEqual(expect.any(Date))
            expect(revokedSession.revocationReason).toBe('all_sessions')
            expect(auditLog).toEqual(expect.objectContaining({
                actorId: superAdmin.id,
                targetType: 'user_sessions',
            }))

            const selfRevokeResponse = await request(app.server)
                .post(`/admin/security-center/users/${superAdmin.id}/revoke-sessions`)
                .set('Authorization', `Bearer ${token}`)

            expect(selfRevokeResponse.status).toBe(409)
        } finally {
            await sessionRepository.delete({ id: session.id })
            await userRepository.delete({ id: target.id })
            await userRepository.delete({ id: superAdmin.id })
        }
    })
})
