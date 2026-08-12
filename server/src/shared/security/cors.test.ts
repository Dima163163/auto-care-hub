import Fastify from 'fastify'
import cors from '@fastify/cors'
import { afterEach, describe, expect, it } from 'vitest'

import {
    CORS_ALLOWED_HEADERS,
    CORS_METHODS,
    getCorsOptions,
    validateCorsOrigins,
} from './cors'

describe('CORS contract', () => {
    const apps: Array<ReturnType<typeof Fastify>> = []

    afterEach(async () => {
        await Promise.all(apps.splice(0).map((app) => app.close()))
    })

    it('keeps credentialed origins explicit and exposes the mutation headers', () => {
        const options = getCorsOptions(['https://autocarehub.example'])

        expect(options.origin).toEqual(['https://autocarehub.example'])
        expect(options.origin).not.toContain('*')
        expect(options.credentials).toBe(true)
        expect(options.methods).toEqual([...CORS_METHODS])
        expect(options.allowedHeaders).toEqual([...CORS_ALLOWED_HEADERS])
        expect(options.allowedHeaders).toContain('Idempotency-Key')
        expect(options.allowedHeaders).toContain('X-CSRF-Token')
    })

    it('returns CORS headers only for configured origins', async () => {
        const app = Fastify()
        apps.push(app)

        await app.register(cors, getCorsOptions(['https://autocarehub.example']))
        app.get('/', async () => ({ ok: true }))
        await app.ready()

        const allowed = await app.inject({
            method: 'GET',
            url: '/',
            headers: {
                origin: 'https://autocarehub.example',
            },
        })
        const untrusted = await app.inject({
            method: 'GET',
            url: '/',
            headers: {
                origin: 'https://untrusted.example',
            },
        })

        expect(allowed.headers['access-control-allow-origin']).toBe(
            'https://autocarehub.example'
        )
        expect(allowed.headers['access-control-allow-credentials']).toBe('true')
        expect(untrusted.headers['access-control-allow-origin']).toBeUndefined()
    })

    it('accepts Idempotency-Key on credentialed preflight requests', async () => {
        const app = Fastify()
        apps.push(app)

        await app.register(cors, getCorsOptions(['https://autocarehub.example']))
        app.post('/', async () => ({ ok: true }))
        await app.ready()

        const response = await app.inject({
            method: 'OPTIONS',
            url: '/',
            headers: {
                origin: 'https://autocarehub.example',
                'access-control-request-method': 'POST',
                'access-control-request-headers':
                    'content-type, idempotency-key, x-csrf-token',
            },
        })

        expect(response.statusCode).toBe(204)
        expect(response.headers['access-control-allow-origin']).toBe(
            'https://autocarehub.example'
        )
        expect(response.headers['access-control-allow-credentials']).toBe('true')
        expect(response.headers['access-control-allow-headers']).toContain(
            'Idempotency-Key'
        )
    })

    it('rejects wildcard, path-bearing, and malformed origins', () => {
        expect(() => validateCorsOrigins(['*'])).toThrow(/explicit/)
        expect(() => validateCorsOrigins(['https://autocarehub.example/app'])).toThrow(/origins/)
        expect(() => validateCorsOrigins(['not-a-url'])).toThrow()
    })
})
