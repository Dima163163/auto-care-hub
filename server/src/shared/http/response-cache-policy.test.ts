import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import { afterEach, describe, expect, it } from 'vitest'

import { registerResponseCachePolicy } from './response-cache-policy.js'

const apps: ReturnType<typeof Fastify>[] = []

async function createApp() {
    const app = Fastify()
    apps.push(app)
    await app.register(cookie)
    registerResponseCachePolicy(app)
    return app
}

afterEach(async () => { await Promise.all(apps.splice(0).map((app) => app.close())) })

describe('API response cache boundary', () => {
    it.each([
        '/v1/broadcast-requests/my', '/v1/guarantee-claims/my',
        '/v1/expert-questions/my', '/v1/bonuses/my', '/v1/favorites/providers',
        '/owner/fleets', '/owner/autocare-providers/provider/members',
        '/owner/autocare-providers/provider/analytics', '/auth/me',
        '/admin/security-events', '/v1/service-requests/my', '/v1/chats',
    ])('prohibits caching private responses at %s', async (path) => {
        const app = await createApp()
        app.get(path, async () => ({ privateSnapshot: 'synthetic' }))
        const response = await app.inject({ url: `${path}?page=1` })
        expect(response.headers['cache-control']).toBe('private, no-store')
        expect(response.headers.pragma).toBe('no-cache')
    })

    it('fails closed for a future endpoint even if its handler sets public caching', async () => {
        const app = await createApp()
        app.get('/v1/future-private-resource', async (_request, reply) => reply.header('cache-control', 'public, max-age=60').send({ note: 'synthetic' }))
        const response = await app.inject('/v1/future-private-resource')
        expect(response.headers['cache-control']).toBe('private, no-store')
    })

    it.each([401, 403, 500])('prohibits caching discovery errors with status %s', async (status) => {
        const app = await createApp()
        app.get('/v1/discovery/providers', async (_request, reply) => reply.code(status).header('cache-control', 'public, max-age=5').send({ error: 'synthetic' }))
        expect((await app.inject('/v1/discovery/providers')).headers['cache-control']).toBe('private, no-store')
    })

    it.each([{ authorization: 'Bearer synthetic' }, { cookie: 'session=synthetic' }])('prohibits public caching with incoming credentials %j', async (headers) => {
        const app = await createApp()
        app.get('/v1/discovery/providers', async (_request, reply) => reply.header('cache-control', 'public, max-age=5').send({ items: [] }))
        expect((await app.inject({ url: '/v1/discovery/providers', headers })).headers['cache-control']).toBe('private, no-store')
    })

    it('detects actual cookie-plugin output before deciding public caching', async () => {
        const app = await createApp()
        app.get('/v1/discovery/providers', async (_request, reply) => reply.setCookie('session', 'synthetic').header('cache-control', 'public, max-age=5').send({ items: [] }))
        const response = await app.inject('/v1/discovery/providers')
        expect(response.headers['set-cookie']).toContain('session=synthetic')
        expect(response.headers['cache-control']).toBe('private, no-store')
    })

    it.each([
        '/v1/discovery/providers', '/uploads/autocare/logos/:fileName',
        '/uploads/autocare/media/:kind/:fileName', '/uploads/cabinets/:fileName',
    ])('preserves explicit anonymous public caching for %s and HEAD', async (path) => {
        const app = await createApp()
        app.get(path, async (_request, reply) => reply.header('cache-control', 'public, max-age=5, stale-while-revalidate=15').send('synthetic'))
        const url = path.replace(':kind', 'cover').replace(':fileName', 'synthetic.webp')
        for (const method of ['GET', 'HEAD'] as const) {
            const response = await app.inject({ method, url })
            expect(response.headers['cache-control']).toBe('public, max-age=5, stale-while-revalidate=15')
            expect(response.headers.pragma).toBeUndefined()
        }
    })

    it('preserves public 304 validators for anonymous media', async () => {
        const app = await createApp()
        app.get('/uploads/cabinets/:fileName', async (_request, reply) => reply.code(304).header('etag', '"synthetic"').header('cache-control', 'public, max-age=3600').send())
        const response = await app.inject('/uploads/cabinets/synthetic.webp')
        expect(response.statusCode).toBe(304)
        expect(response.headers.etag).toBe('"synthetic"')
        expect(response.headers['cache-control']).toBe('public, max-age=3600')
    })

    it('requires an explicit public cache directive even for an allowed route', async () => {
        const app = await createApp()
        app.get('/v1/discovery/providers', async () => ({ items: [] }))
        expect((await app.inject('/v1/discovery/providers')).headers['cache-control']).toBe('private, no-store')
    })

    it('does not extend a public GET exception to mutations', async () => {
        const app = await createApp()
        app.post('/v1/discovery/providers', async (_request, reply) => reply.header('cache-control', 'public, max-age=60').send({ items: [] }))
        expect((await app.inject({ method: 'POST', url: '/v1/discovery/providers' })).headers['cache-control']).toBe('private, no-store')
    })

    it('protects unmatched route errors', async () => {
        const app = await createApp()
        const response = await app.inject('/unknown-private-resource')
        expect(response.statusCode).toBe(404)
        expect(response.headers['cache-control']).toBe('private, no-store')
    })

    it('protects attachment redirects and downloads without stripping their headers', async () => {
        const app = await createApp()
        app.get('/v1/chats/chat/attachments/image', async (_request, reply) => reply.redirect('https://example.test/synthetic-signed-url'))
        app.get('/v1/private-download', async (_request, reply) => reply.header('content-disposition', 'inline').type('image/webp').send(Buffer.from('synthetic')))
        const redirect = await app.inject('/v1/chats/chat/attachments/image')
        const download = await app.inject('/v1/private-download')
        expect(redirect.statusCode).toBe(302)
        expect(redirect.headers.location).toBe('https://example.test/synthetic-signed-url')
        expect(download.headers['content-disposition']).toBe('inline')
        for (const response of [redirect, download]) expect(response.headers['cache-control']).toBe('private, no-store')
    })
})
