import Fastify from 'fastify'
import { afterEach, describe, expect, it } from 'vitest'

import { registerErrorHandler } from './error-handler'

describe('request parsing error contract', () => {
    const apps: Array<ReturnType<typeof Fastify>> = []

    afterEach(async () => {
        await Promise.all(apps.splice(0).map((app) => app.close()))
    })

    it('returns a localized 400 envelope for malformed JSON', async () => {
        const app = Fastify()
        apps.push(app)
        registerErrorHandler(app)
        app.post('/', async () => ({ ok: true }))
        await app.ready()

        const response = await app.inject({
            method: 'POST',
            url: '/',
            headers: {
                'accept-language': 'es',
                'content-type': 'application/json',
            },
            payload: '{"broken":',
        })

        expect(response.statusCode).toBe(400)
        expect(response.json()).toEqual(expect.objectContaining({
            code: 'BAD_REQUEST',
            message: 'Solicitud no válida.',
        }))
    })

    it('returns a localized 413 envelope when the JSON body exceeds the limit', async () => {
        const app = Fastify({ bodyLimit: 32 })
        apps.push(app)
        registerErrorHandler(app)
        app.post('/', async () => ({ ok: true }))
        await app.ready()

        const response = await app.inject({
            method: 'POST',
            url: '/',
            headers: {
                'accept-language': 'de',
                'content-type': 'application/json',
            },
            payload: JSON.stringify({ value: 'x'.repeat(64) }),
        })

        expect(response.statusCode).toBe(413)
        expect(response.json()).toEqual(expect.objectContaining({
            code: 'BAD_REQUEST',
            message: 'Ungültige Anfrage.',
        }))
    })
})
