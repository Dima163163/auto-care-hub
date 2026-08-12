import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'

import { buildApp } from '../app.js'
import { AppDataSource } from '../database/data-source.js'
import { UserEntity, UserRole, UserStatus } from '../entities/user/user.entity.js'
import { createAuthTokens } from '../modules/auth/auth.service.js'

describe('Request observability', () => {
    const apps: FastifyInstance[] = []

    afterEach(async () => {
        await Promise.all(apps.splice(0).map((app) => app.close()))
    })

    it('returns a generated request ID with not-found errors', async () => {
        const app = await buildApp()
        apps.push(app)
        await app.ready()

        const response = await request(app.server).get('/missing-route')

        expect(response.status).toBe(404)
        expect(response.headers['x-request-id']).toMatch(
            /^[a-f0-9-]{36}$/,
        )
        expect(response.body.requestId).toBe(
            response.headers['x-request-id'],
        )

    })

    it('records unhandled server errors and exposes incidents only to super-admins', async () => {
        const app = await buildApp()
        apps.push(app)
        const uniqueId = Date.now()
        const testRoute = `/test/unhandled-server-error-${uniqueId}`
        app.get(testRoute, async () => {
            throw new Error('Test-only server error')
        })

        const userRepository = AppDataSource.getRepository(UserEntity)
        const superAdmin = await userRepository.save(userRepository.create({
            name: 'Incident Super Admin',
            email: `incident-super-admin-${uniqueId}@example.com`,
            passwordHash: 'hash',
            role: UserRole.SuperAdmin,
            status: UserStatus.Active,
            emailVerifiedAt: new Date(),
        }))
        const admin = await userRepository.save(userRepository.create({
            name: 'Incident Admin',
            email: `incident-admin-${uniqueId}@example.com`,
            passwordHash: 'hash',
            role: UserRole.Admin,
            status: UserStatus.Active,
            emailVerifiedAt: new Date(),
        }))
        const superAdminToken = createAuthTokens(superAdmin).accessToken
        const adminToken = createAuthTokens(admin).accessToken

        await app.ready()

        const firstServerErrorResponse = await request(app.server)
            .get(testRoute)
        const repeatedServerErrorResponse = await request(app.server)
            .get(testRoute)

        expect(firstServerErrorResponse.status).toBe(500)
        expect(repeatedServerErrorResponse.status).toBe(500)

        const incidentsResponse = await request(app.server)
            .get('/admin/system-incidents')
            .set('Authorization', `Bearer ${superAdminToken}`)

        expect(incidentsResponse.status).toBe(200)
        expect(incidentsResponse.body).toEqual(expect.arrayContaining([
            expect.objectContaining({
                type: 'server_error',
                severity: 'critical',
                status: 'open',
                occurrenceCount: 2,
                requestId: repeatedServerErrorResponse.headers['x-request-id'],
                title: `Unhandled server error on ${testRoute}`,
            }),
        ]))

        const incident = incidentsResponse.body.find((item: { requestId: string }) =>
            item.requestId === repeatedServerErrorResponse.headers['x-request-id'],
        ) as { id: string }
        const acknowledgeResponse = await request(app.server)
            .patch(`/admin/system-incidents/${incident.id}/status`)
            .set('Authorization', `Bearer ${superAdminToken}`)
            .send({ status: 'acknowledged' })

        expect(acknowledgeResponse.status).toBe(200)
        expect(acknowledgeResponse.body).toEqual(expect.objectContaining({
            status: 'acknowledged',
            acknowledgedAt: expect.any(String),
        }))

        const forbiddenResponse = await request(app.server)
            .get('/admin/system-incidents')
            .set('Authorization', `Bearer ${adminToken}`)

        expect(forbiddenResponse.status).toBe(403)
    })
})
