import type { FastifyInstance } from 'fastify'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { buildApp } from '../../app.js'
import { AppDataSource } from '../../database/data-source.js'
import { UserEntity, UserRole, UserStatus } from '../../entities/user/user.entity.js'
import { createAuthTokens } from '../auth/auth.service.js'

describe('Super-admin trust policy integration', () => {
    const suffix = `${Date.now()}`
    let app: FastifyInstance
    let superAdmin: UserEntity
    let regularAdmin: UserEntity
    let originalPolicy: Record<string, unknown> | null = null

    beforeAll(async () => {
        app = await buildApp()
        await app.ready()
        const users = AppDataSource.getRepository(UserEntity)
        ;[superAdmin, regularAdmin] = await users.save([
            users.create({ name: 'Trust Policy Super Admin', email: `trust-policy-super-${suffix}@example.com`, passwordHash: 'hash', role: UserRole.SuperAdmin, status: UserStatus.Active, emailVerifiedAt: new Date() }),
            users.create({ name: 'Trust Policy Admin', email: `trust-policy-admin-${suffix}@example.com`, passwordHash: 'hash', role: UserRole.Admin, status: UserStatus.Active, emailVerifiedAt: new Date() }),
        ])

        const response = await request(app.server)
            .get('/super-admin/trust-policy')
            .set('Authorization', `Bearer ${createAuthTokens(superAdmin).accessToken}`)
        expect(response.status).toBe(200)
        originalPolicy = response.body as Record<string, unknown>
    })

    afterAll(async () => {
        if (originalPolicy && superAdmin) {
            await request(app.server)
                .patch('/super-admin/trust-policy')
                .set('Authorization', `Bearer ${createAuthTokens(superAdmin).accessToken}`)
                .send(originalPolicy)
        }
        if (AppDataSource.isInitialized) {
            const userIds = [superAdmin?.id, regularAdmin?.id].filter((id): id is string => Boolean(id))
            if (userIds.length > 0) await AppDataSource.getRepository(UserEntity).delete(userIds)
        }
        if (app) await app.close()
    })

    it('restricts policy management to super-admins', async () => {
        const response = await request(app.server)
            .get('/super-admin/trust-policy')
            .set('Authorization', `Bearer ${createAuthTokens(regularAdmin).accessToken}`)

        expect(response.status).toBe(403)
    })

    it('validates rollout markets and persists policy changes', async () => {
        const token = createAuthTokens(superAdmin).accessToken
        const unknownMarket = await request(app.server)
            .patch('/super-admin/trust-policy')
            .set('Authorization', `Bearer ${token}`)
            .send({ ...originalPolicy, rollout: { enabled: true, marketIds: ['missing-market'], percentage: 10 } })

        expect(unknownMarket.status).toBe(422)

        const updated = await request(app.server)
            .patch('/super-admin/trust-policy')
            .set('Authorization', `Bearer ${token}`)
            .send({
                ...originalPolicy,
                policyVersion: 'autocare-trust-v2',
                trustedMinimumRating: 4.4,
                rollout: { enabled: false, marketIds: [], percentage: 25 },
            })

        expect(updated.status).toBe(200)
        expect(updated.body).toMatchObject({ policyVersion: 'autocare-trust-v2', trustedMinimumRating: 4.4, rollout: { enabled: false, marketIds: [], percentage: 25 } })

        const persisted = await request(app.server)
            .get('/super-admin/trust-policy')
            .set('Authorization', `Bearer ${token}`)
        expect(persisted.status).toBe(200)
        expect(persisted.body).toMatchObject({ policyVersion: 'autocare-trust-v2', rollout: { enabled: false, percentage: 25 } })
    })
})
