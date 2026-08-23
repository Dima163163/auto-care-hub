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
    })

    it('requires a verified client before creating a service request', async () => {
        const response = await request(app.server)
            .post('/v1/service-requests')
            .send({})

        expect(response.status).toBe(401)
    })

    it('protects owner membership administration and schedule mutations before reaching the database', async () => {
        const providerId = '00000000-0000-0000-0000-000000000001'
        const cabinetId = '00000000-0000-0000-0000-000000000002'

        const [members, invitation, scheduleRead, scheduleWrite] = await Promise.all([
            request(app.server).get(`/owner/autocare-providers/${providerId}/members`),
            request(app.server).post(`/owner/autocare-providers/${providerId}/members/invitations`).send({ email: 'staff@example.com', role: 'staff' }),
            request(app.server).get(`/owner/cabinets/${cabinetId}/schedule`),
            request(app.server).put(`/owner/cabinets/${cabinetId}/schedule`).send({ items: [] }),
        ])

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
