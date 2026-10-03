import { Writable } from 'node:stream'
import Fastify from 'fastify'
import { QueryFailedError } from 'typeorm'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { registerErrorHandler } from './error-handler'
import { serializeFastifyError } from '../observability/logger.js'
import { setExternalErrorReporter } from '../observability/error-reporter.js'

vi.mock('../../modules/admin/system-incidents.service.js', () => ({ recordSystemIncidentSafely: vi.fn() }))
vi.mock('../../modules/auth/security-event-stream.js', () => ({ recordSecurityActivitySafely: vi.fn() }))

describe('request parsing error contract', () => {
    const apps: Array<ReturnType<typeof Fastify>> = []

    afterEach(async () => {
        setExternalErrorReporter(null)
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

    it('returns a localized 400 envelope for an empty JSON request body', async () => {
        const app = Fastify()
        apps.push(app)
        registerErrorHandler(app)
        app.post('/', async () => ({ ok: true }))
        await app.ready()

        const response = await app.inject({
            method: 'POST',
            url: '/',
            headers: {
                'accept-language': 'en',
                'content-type': 'application/json',
            },
            payload: '',
        })

        expect(response.statusCode).toBe(400)
        expect(response.json()).toEqual(expect.objectContaining({ code: 'BAD_REQUEST' }))
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

    it('keeps SQL error data out of request logs, external reports and the response', async () => {
        const logs: string[] = []
        const report = vi.fn()
        setExternalErrorReporter({ report })
        const stream = new Writable({ write: (chunk, _encoding, callback) => { logs.push(String(chunk)); callback() } })
        const app = Fastify({ logger: { stream }, genReqId: () => 'request-sql-error' })
        apps.push(app)
        registerErrorHandler(app)
        const privateValues = ['private-client@example.test', '+7 (999) 123-45-67', 'JTM1234567890ABCD', 'confidential repair notes', 'private-password-value']
        const error = new QueryFailedError('INSERT INTO messages VALUES (\'confidential repair notes\')', privateValues,
            Object.assign(new Error('duplicate value: confidential repair notes'), { code: '23505', detail: privateValues.join(' ') }))
        Object.assign(error, { cause: new Error(privateValues.join(' ')) })
        app.get('/', async () => { throw error })

        const response = await app.inject({ method: 'GET', url: '/' })

        expect(response.statusCode).toBe(500)
        expect(response.json()).toMatchObject({ code: 'INTERNAL_SERVER_ERROR', requestId: 'request-sql-error' })
        expect(logs.map((line) => JSON.parse(line))).toContainEqual(expect.objectContaining({
            error: { name: 'QueryFailedError', code: '23505', message: 'Database query failed.' },
            requestId: 'request-sql-error',
            msg: 'Unhandled request error',
        }))
        expect(report).toHaveBeenCalledWith(expect.objectContaining({
            error: { name: 'QueryFailedError', code: '23505', message: 'Database query failed.' },
        }))
        for (const value of privateValues) {
            expect(logs.join('')).not.toContain(value)
            expect(response.body).not.toContain(value)
            expect(JSON.stringify(report.mock.calls)).not.toContain(value)
        }
    })

    it('sanitizes raw err logging through the Fastify serializer', async () => {
        const logs: string[] = []
        const stream = new Writable({ write: (chunk, _encoding, callback) => { logs.push(String(chunk)); callback() } })
        const app = Fastify({ logger: { stream, serializers: { err: serializeFastifyError } } })
        apps.push(app)
        app.log.error({ err: Object.assign(new Error('private-client@example.test'), {
            code: '23505', parameters: ['confidential repair notes'], cause: new Error('private-password-value'),
        }) }, 'Database failure')

        expect(logs.map((line) => JSON.parse(line))).toContainEqual(expect.objectContaining({
            err: { type: 'Error', code: '23505', message: 'Database query failed.', stack: '' },
        }))
        expect(logs.join('')).not.toMatch(/private-client|confidential repair notes|private-password-value/)
    })
})
