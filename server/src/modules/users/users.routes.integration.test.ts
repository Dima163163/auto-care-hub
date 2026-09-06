import type { FastifyInstance } from 'fastify'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { buildApp } from '../../app.js'
import { AppDataSource } from '../../database/data-source.js'
import { AuditAction, AuditLogEntity } from '../../entities/audit-log/audit-log.entity.js'
import { UserEntity, UserRole, UserStatus } from '../../entities/user/user.entity.js'
import { createAuthTokens } from '../auth/auth.service.js'

describe('private user routes integration', () => {
    let app: FastifyInstance
    let userId: string
    let accessToken: string

    beforeAll(async () => {
        app = await buildApp()
        await app.ready()

        const user = await AppDataSource.getRepository(UserEntity).save(
            AppDataSource.getRepository(UserEntity).create({
                name: `Export Integration User ${Date.now()}`,
                email: `export-integration-${Date.now()}@example.com`,
                role: UserRole.Client,
                status: UserStatus.Active,
                passwordHash: 'hash',
                emailVerifiedAt: new Date(),
            }),
        )
        userId = user.id
        accessToken = createAuthTokens(user).accessToken
    })

    afterAll(async () => {
        if (AppDataSource.isInitialized && userId) {
            await AppDataSource.transaction(async (manager) => {
                await manager.query("SELECT set_config('app.audit_retention_cleanup', 'on', true)")
                await manager.getRepository(AuditLogEntity).delete({ actorId: userId })
            })
            await AppDataSource.getRepository(UserEntity).delete({ id: userId })
        }
        await app.close()
    })

    it('returns a bounded private export with integrity metadata', async () => {
        const response = await request(app.server)
            .get('/users/me/export')
            .set('Authorization', `Bearer ${accessToken}`)

        expect(response.status).toBe(200)
        expect(response.headers['cache-control']).toBe('no-store')
        expect(response.headers.pragma).toBe('no-cache')
        expect(response.body).toMatchObject({
            schemaVersion: 1,
            user: { id: userId },
            limits: { maxRecordsPerCollection: 5_000 },
            integrity: { algorithm: 'sha256' },
            favorites: [],
            bookings: [],
            notifications: [],
            cabinets: [],
        })
        expect(response.body.integrity.checksum).toMatch(/^[a-f0-9]{64}$/)

        const auditLog = await AppDataSource.getRepository(AuditLogEntity).findOne({
            where: {
                actorId: userId,
                action: AuditAction.UserDataExported,
                targetId: userId,
                targetType: 'user_data_export',
            },
        })
        expect(auditLog).toEqual(expect.objectContaining({ metadata: {} }))
    })

    it('persists the account locale and returns it from the auth contract', async () => {
        const updateResponse = await request(app.server)
            .patch('/users/me/preferences')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ locale: 'de' })

        expect(updateResponse.status).toBe(200)
        expect(updateResponse.body.locale).toBe('de')

        const meResponse = await request(app.server)
            .get('/auth/me')
            .set('Authorization', `Bearer ${accessToken}`)

        expect(meResponse.status).toBe(200)
        expect(meResponse.body.user.locale).toBe('de')
    })

    it('creates, updates, lists and deletes a client vehicle', async () => {
        const vehicleInput = {
            brandId: 'toyota',
            model: 'RAV4',
            year: 2022,
            fuelType: 'hybrid',
            engineDisplacement: 2.5,
            horsepower: 218,
            color: 'white',
            vin: 'JTM1234567890ABCD',
        }

        const createResponse = await request(app.server)
            .post('/users/me/vehicles')
            .set('Authorization', `Bearer ${accessToken}`)
            .send(vehicleInput)

        expect(createResponse.status).toBe(200)
        expect(createResponse.body).toMatchObject({
            ...vehicleInput,
            isPrimary: true,
        })
        expect(createResponse.body.imageUrl).toContain('/images/autocare/vehicles/')

        const vehicleId = createResponse.body.id as string
        const listResponse = await request(app.server)
            .get('/users/me/vehicles')
            .set('Authorization', `Bearer ${accessToken}`)
        expect(listResponse.status).toBe(200)
        expect(listResponse.body).toHaveLength(1)

        const updateResponse = await request(app.server)
            .patch(`/users/me/vehicles/${vehicleId}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ horsepower: 222 })
        expect(updateResponse.status).toBe(200)
        expect(updateResponse.body.horsepower).toBe(222)
        expect(updateResponse.body.vin).toBe(vehicleInput.vin)

        const deleteResponse = await request(app.server)
            .delete(`/users/me/vehicles/${vehicleId}`)
            .set('Authorization', `Bearer ${accessToken}`)
        expect(deleteResponse.status).toBe(200)
        expect(deleteResponse.body).toEqual({ success: true })
    })
})
