import type { FastifyInstance } from 'fastify'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { buildApp } from '../../app.js'
import { AppDataSource } from '../../database/data-source.js'
import {
    AutomotiveLocationZoneEntity,
    AutomotiveMarketCountryEntity,
    AutomotiveMarketEntity,
} from '../../entities/index.js'
import { AuditAction, AuditLogEntity } from '../../entities/audit-log/audit-log.entity.js'
import { UserEntity, UserRole, UserStatus } from '../../entities/user/user.entity.js'
import { createAuthTokens } from '../auth/auth.service.js'

describe('Super-admin market hierarchy integration', () => {
    const suffix = `${Date.now()}`
    let countryCode = ''
    let app: FastifyInstance
    let superAdmin: UserEntity
    let regularAdmin: UserEntity
    let countryId = ''
    let marketId = ''
    let zoneId = ''

    beforeAll(async () => {
        app = await buildApp()
        await app.ready()
        const countryRepository = AppDataSource.getRepository(AutomotiveMarketCountryEntity)
        const existingCodes = new Set((await countryRepository.find({ select: { code: true } })).map((country) => country.code))
        const seed = Number(suffix.slice(-6)) || 1
        for (let offset = 0; offset < 26 * 26; offset += 1) {
            const value = (seed + offset) % (26 * 26)
            const candidate = `${String.fromCharCode(65 + Math.floor(value / 26))}${String.fromCharCode(65 + (value % 26))}`
            if (!existingCodes.has(candidate)) {
                countryCode = candidate
                break
            }
        }
        if (!countryCode) throw new Error('Unable to allocate an unused market country code for integration test.')
        const users = AppDataSource.getRepository(UserEntity)
        ;[superAdmin, regularAdmin] = await users.save([
            users.create({ name: 'Market Hierarchy Super Admin', email: `market-hierarchy-super-${suffix}@example.com`, passwordHash: 'hash', role: UserRole.SuperAdmin, status: UserStatus.Active, emailVerifiedAt: new Date() }),
            users.create({ name: 'Market Hierarchy Admin', email: `market-hierarchy-admin-${suffix}@example.com`, passwordHash: 'hash', role: UserRole.Admin, status: UserStatus.Active, emailVerifiedAt: new Date() }),
        ])
    })

    afterAll(async () => {
        if (!AppDataSource.isInitialized) return
        if (zoneId) await AppDataSource.getRepository(AutomotiveLocationZoneEntity).delete({ id: zoneId })
        if (marketId) await AppDataSource.getRepository(AutomotiveMarketEntity).delete({ id: marketId })
        if (countryId) await AppDataSource.getRepository(AutomotiveMarketCountryEntity).delete({ id: countryId })
        const userIds = [superAdmin?.id, regularAdmin?.id].filter((id): id is string => Boolean(id))
        if (userIds.length > 0) await AppDataSource.getRepository(UserEntity).delete(userIds)
        if (app) await app.close()
    })

    it('keeps the hierarchy super-admin-only', async () => {
        const response = await request(app.server)
            .get('/super-admin/market-hierarchy')
            .set('Authorization', `Bearer ${createAuthTokens(regularAdmin).accessToken}`)

        expect(response.status).toBe(403)
    })

    it('creates and edits a country, city and zone without changing public frontend data', async () => {
        const token = createAuthTokens(superAdmin).accessToken
        const profile = {
            defaultLocale: 'en',
            supportedLocales: ['en', 'ru'],
            timezone: 'Europe/Samara',
            currencyCode: 'EUR',
            capabilities: { search: true, chat: false },
            legalLinks: { privacy: 'https://example.test/privacy', terms: 'https://example.test/terms' },
        }
        const country = await request(app.server)
            .post('/super-admin/market-countries')
            .set('Authorization', `Bearer ${token}`)
            .send({ ...profile, code: countryCode, names: { en: 'Integration land', ru: 'Интеграционная страна' }, active: true })
        expect(country.status).toBe(200)
        countryId = country.body.id as string

        const monetizationCapability = await request(app.server)
            .patch(`/super-admin/market-countries/${countryId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                ...profile,
                names: { en: 'Integration land', ru: 'Интеграционная страна' },
                active: true,
                capabilities: { paid_access: true },
            })
        expect(monetizationCapability.status).toBe(400)

        const updatedCountryProfile = {
            ...profile,
            currencyCode: 'USD',
            capabilities: { ...profile.capabilities, bookings: true },
            active: true,
            names: { en: 'Integration land', ru: 'Интеграционная страна' },
        }
        const updatedCountry = await request(app.server)
            .patch(`/super-admin/market-countries/${countryId}`)
            .set('Authorization', `Bearer ${token}`)
            .send(updatedCountryProfile)
        expect(updatedCountry.status).toBe(200)
        expect(updatedCountry.body).toMatchObject({ currencyCode: 'USD', capabilities: { bookings: true } })

        const city = await request(app.server)
            .post(`/super-admin/market-countries/${countryId}/cities`)
            .set('Authorization', `Bearer ${token}`)
            .send({ ...profile, cityCode: `integration-city-${suffix}`, cityName: 'Integration City', regionCode: 'test-region', regionName: 'Test region', centerLatitude: 53.2, centerLongitude: 50.1, launchReady: false })
        expect(city.status).toBe(200)
        marketId = city.body.id as string

        const updatedCity = await request(app.server)
            .patch(`/super-admin/market-cities/${marketId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                ...profile,
                cityCode: `integration-city-${suffix}`,
                cityName: 'Integration City',
                regionCode: 'test-region',
                regionName: 'Test region',
                centerLatitude: 53.2,
                centerLongitude: 50.1,
                launchReady: true,
            })
        expect(updatedCity.status).toBe(200)
        expect(updatedCity.body).toMatchObject({ id: marketId, launchReady: true })

        const zone = await request(app.server)
            .post(`/super-admin/market-cities/${marketId}/zones`)
            .set('Authorization', `Bearer ${token}`)
            .send({ slug: 'central', zoneType: 'district', names: { en: 'Central district', ru: 'Центральный район' }, centerLatitude: 53.2, centerLongitude: 50.1, radiusKm: 6, imageUrl: null, displayOrder: 4, active: true })
        expect(zone.status).toBe(200)
        zoneId = zone.body.id as string

        const editedZone = await request(app.server)
            .patch(`/super-admin/market-zones/${zoneId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ parentId: null, slug: 'central', zoneType: 'district', names: { en: 'Central district', ru: 'Центральный район' }, centerLatitude: 53.2, centerLongitude: 50.1, radiusKm: 8, imageUrl: null, displayOrder: 2, active: false })
        const hierarchy = await request(app.server)
            .get('/super-admin/market-hierarchy')
            .set('Authorization', `Bearer ${token}`)
        const publicMarkets = await request(app.server).get('/v1/markets')
        const audits = await AppDataSource.getRepository(AuditLogEntity).find({ where: { actorId: superAdmin.id } })

        expect(editedZone.status).toBe(200)
        expect(editedZone.body).toMatchObject({ id: zoneId, active: false, radiusKm: 8, displayOrder: 2 })
        expect(hierarchy.status).toBe(200)
        expect(hierarchy.body).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: countryId, code: countryCode, capabilities: updatedCountryProfile.capabilities, legalLinks: profile.legalLinks, cities: expect.arrayContaining([expect.objectContaining({ id: marketId, cityName: 'Integration City', zones: expect.arrayContaining([expect.objectContaining({ id: zoneId, active: false })]) })]) }),
        ]))
        expect(publicMarkets.status).toBe(200)
        expect(publicMarkets.body).toEqual(expect.arrayContaining([expect.objectContaining({ id: marketId, cityCode: `integration-city-${suffix}`, capabilities: profile.capabilities })]))
        expect(audits.map((audit) => audit.action)).toEqual(expect.arrayContaining([
            AuditAction.AutoCareMarketCountryCreated,
            AuditAction.AutoCareMarketCountryUpdated,
            AuditAction.AutoCareMarketCreated,
            AuditAction.AutoCareMarketUpdated,
            AuditAction.AutoCareMarketZoneCreated,
            AuditAction.AutoCareMarketZoneUpdated,
        ]))
    })
})
