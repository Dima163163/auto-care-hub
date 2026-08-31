import test from 'node:test'
import assert from 'node:assert/strict'

import {
    assertRealApiReachable,
    formatRealApiPreflightFailure,
    getRealApiHealthUrl,
} from './check-real-api.mjs'

test('real API health URL uses the configured base path', () => {
    assert.equal(
        getRealApiHealthUrl({ REAL_API_BASE_URL: 'http://127.0.0.1:4000/api/' }),
        'http://127.0.0.1:4000/api/health/live',
    )
})

test('real API preflight accepts a healthy response without logging request details', async () => {
    const calls = []
    const result = await assertRealApiReachable(
        'https://staging.example.test/api',
        async (url, init) => {
            calls.push({ url, init })
            return new Response('{}', { status: 200 })
        },
    )

    assert.equal(result.baseUrl, 'https://staging.example.test/api')
    assert.equal(calls[0].url, 'https://staging.example.test/api/health/live')
    assert.equal(calls[0].init.headers.accept, 'application/json')
})

test('real API preflight reports non-success health status', async () => {
    await assert.rejects(
        () => assertRealApiReachable('http://127.0.0.1:4000', async () => new Response('{}', { status: 503 })),
        /HTTP 503/,
    )
})

test('real API preflight rejects ambiguous URLs and keeps diagnostics actionable', async () => {
    assert.throws(
        () => getRealApiHealthUrl({ REAL_API_BASE_URL: 'http://localhost:4000?token=secret' }),
        /must not include a query string/,
    )

    const message = formatRealApiPreflightFailure('http://127.0.0.1:4000', 'the health endpoint is not reachable')
    assert.match(message, /npm run server:start/)
    assert.match(message, /npm run test:e2e:real/)
    assert.doesNotMatch(message, /secret-value|token=/)
})

test('real API preflight converts connection errors to a safe message', async () => {
    await assert.rejects(
        () => assertRealApiReachable('http://127.0.0.1:4000', async () => {
            throw new Error('connect ECONNREFUSED http://user:secret@127.0.0.1:4000')
        }),
        (error) => {
            assert.match(String(error), /health endpoint is not reachable/)
            assert.doesNotMatch(String(error), /secret/)
            return true
        },
    )
})
