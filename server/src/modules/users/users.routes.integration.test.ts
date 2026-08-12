import type { FastifyInstance } from 'fastify'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { buildApp } from '../../app.js'
import { AppDataSource } from '../../database/data-source.js'
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
})
