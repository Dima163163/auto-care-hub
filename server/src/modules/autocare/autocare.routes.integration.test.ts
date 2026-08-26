import type { FastifyInstance } from 'fastify'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { buildApp } from '../../app.js'

describe('AutoCare public catalog and request route integration', () => {
    let app: FastifyInstance

    beforeAll(async () => {
        app = await buildApp()
        await app.ready()
    })

    afterAll(async () => {
        await app.close()
    })

    it('exposes the market catalog and zones before optional demo seed data', async () => {
        const marketsResponse = await request(app.server).get('/v1/markets')

        expect(marketsResponse.status).toBe(200)
        expect(marketsResponse.body).toEqual(expect.any(Array))
        expect(marketsResponse.body.length).toBeGreaterThan(0)

        const market = marketsResponse.body.find((item: { cityCode?: string }) => item.cityCode === 'moscow') ?? marketsResponse.body[0]
        const zonesResponse = await request(app.server).get(`/v1/markets/${encodeURIComponent(market.cityCode)}/zones`)

        expect(zonesResponse.status).toBe(200)
        expect(zonesResponse.body).toEqual(expect.any(Array))
    })

    it('keeps discovery scoped to the selected market and returns the cursor contract', async () => {
        const response = await request(app.server)
            .get('/v1/discovery/providers')
            .query({ serviceId: 'oil-change', marketId: 'moscow', radiusKm: 25, limit: 8 })

        expect(response.status).toBe(200)
        expect(response.body.items).toEqual(expect.any(Array))
        expect(response.body).toHaveProperty('nextCursor')
        expect(response.body.nextCursor === null || typeof response.body.nextCursor === 'string').toBe(true)
        expect(response.body.items.length).toBeLessThanOrEqual(8)
        expect(response.headers['cache-control']).toContain('max-age=5')
    })

    it('filters real seeded providers by the requested service catalog', async () => {
        const [tireService, airConditioning] = await Promise.all([
            request(app.server)
                .get('/v1/discovery/providers')
                .query({ serviceId: 'tire-service', marketId: 'moscow', radiusKm: 25, limit: 8 }),
            request(app.server)
                .get('/v1/discovery/providers')
                .query({ serviceId: 'air-conditioning', marketId: 'moscow', radiusKm: 25, limit: 8 }),
        ])

        expect(tireService.status).toBe(200)
        expect(airConditioning.status).toBe(200)
        expect(tireService.body.items.length).toBeGreaterThan(0)
        expect(airConditioning.body.items.length).toBeGreaterThan(0)
        expect(tireService.body.items.every((item: { offer: { serviceSlug: string } }) => item.offer.serviceSlug === 'tire-service')).toBe(true)
        expect(airConditioning.body.items.every((item: { offer: { serviceSlug: string } }) => item.offer.serviceSlug === 'air-conditioning')).toBe(true)
    })

    it('keeps keyset pages stable, bounded and duplicate-free', async () => {
        const firstPage = await request(app.server)
            .get('/v1/discovery/providers')
            .query({ serviceId: 'oil-change', marketId: 'moscow', radiusKm: 25, sort: 'distance_asc', limit: 1 })

        expect(firstPage.status).toBe(200)
        expect(firstPage.body.items.length).toBeLessThanOrEqual(1)
        const firstKeys = firstPage.body.items.map((item: { provider: { id: string; location: { id: string } } }) => `${item.provider.id}:${item.provider.location.id}`)
        expect(new Set(firstKeys).size).toBe(firstKeys.length)

        if (typeof firstPage.body.nextCursor === 'string') {
            const secondPage = await request(app.server)
                .get('/v1/discovery/providers')
                .query({ serviceId: 'oil-change', marketId: 'moscow', radiusKm: 25, sort: 'distance_asc', limit: 1, cursor: firstPage.body.nextCursor })
            expect(secondPage.status).toBe(200)
            expect(secondPage.body.items.length).toBeLessThanOrEqual(1)
            const secondKeys = secondPage.body.items.map((item: { provider: { id: string; location: { id: string } } }) => `${item.provider.id}:${item.provider.location.id}`)
            expect(new Set(secondKeys).size).toBe(secondKeys.length)
            expect(secondKeys.some((key: string) => firstKeys.includes(key))).toBe(false)
        }
    })

    it('returns an explicit empty result for an unavailable market and validates discovery bounds', async () => {
        const empty = await request(app.server)
            .get('/v1/discovery/providers')
            .query({ serviceId: 'oil-change', marketId: 'not-published-city', radiusKm: 25, limit: 8 })
        expect(empty.status).toBe(200)
        expect(empty.body.items).toEqual([])
        expect(empty.body.nextCursor).toBeNull()

        const tooMany = await request(app.server)
            .get('/v1/discovery/providers')
            .query({ marketId: 'moscow', limit: 51 })
        const invalidRadius = await request(app.server)
            .get('/v1/discovery/providers')
            .query({ marketId: 'moscow', radiusKm: 0 })
        expect(tooMany.status).toBe(400)
        expect(invalidRadius.status).toBe(400)
    })

    it('applies brand compatibility, multibrand fallback and price ordering in SQL-backed discovery', async () => {
        const bmw = await request(app.server)
            .get('/v1/discovery/providers')
            .query({ serviceId: 'oil-change', marketId: 'moscow', radiusKm: 25, brandId: 'bmw', sort: 'price_asc', limit: 8 })

        expect(bmw.status).toBe(200)
        expect(bmw.body.items.length).toBeGreaterThan(0)
        const bmwPrices = bmw.body.items.map((item: { offer: { priceFromMinor: number } }) => item.offer.priceFromMinor)
        expect(bmwPrices).toEqual([...bmwPrices].sort((left: number, right: number) => left - right))
        expect(bmw.body.items.every((item: { provider: { isMultibrand: boolean; brandSpecializations: string[] } }) => item.provider.isMultibrand || item.provider.brandSpecializations.includes('bmw'))).toBe(true)

        const multibrand = await request(app.server)
            .get('/v1/discovery/providers')
            .query({ serviceId: 'oil-change', marketId: 'moscow', radiusKm: 25, brandId: 'brand-not-in-catalog', limit: 8 })

        expect(multibrand.status).toBe(200)
        expect(multibrand.body.items.length).toBeGreaterThan(0)
        expect(multibrand.body.items.every((item: { provider: { isMultibrand: boolean } }) => item.provider.isMultibrand)).toBe(true)
    })

    it('requires a verified client before creating a service request', async () => {
        const response = await request(app.server)
            .post('/v1/service-requests')
            .send({})

        expect(response.status).toBe(401)
    })

    it('protects owner membership administration and schedule mutations before reaching the database', async () => {
        // Use RFC 4122 UUIDs so route validation reaches the authentication guard.
        // The previous all-zero fixtures were rejected as malformed params (400),
        // masking the intended unauthenticated (401) contract.
        const providerId = '00000000-0000-4000-8000-000000000001'
        const cabinetId = '00000000-0000-4000-8000-000000000002'

        const members = await request(app.server).get(`/owner/autocare-providers/${providerId}/members`)
        const invitation = await request(app.server)
            .post(`/owner/autocare-providers/${providerId}/members/invitations`)
            .send({ email: 'staff@example.com', role: 'staff' })
        const scheduleRead = await request(app.server).get(`/owner/cabinets/${cabinetId}/schedule`)
        const scheduleWrite = await request(app.server)
            .put(`/owner/cabinets/${cabinetId}/schedule`)
            .send({ items: [] })

        expect(members.status).toBe(401)
        expect(invitation.status).toBe(401)
        expect(scheduleRead.status).toBe(401)
        expect(scheduleWrite.status).toBe(401)
    })

    it('protects chat moderation mutations and exposes a bounded public trust route', async () => {
        const chatId = '00000000-0000-0000-0000-000000000003'
        const report = await request(app.server)
            .post(`/v1/chats/${chatId}/reports`)
            .send({ category: 'spam' })

        expect(report.status).toBe(401)

        const trust = await request(app.server)
            .get('/v1/providers/not-a-uuid/trust')

        expect(trust.status).toBe(400)
    })
})
