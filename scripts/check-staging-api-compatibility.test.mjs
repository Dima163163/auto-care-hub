import test from 'node:test'
import assert from 'node:assert/strict'

import {
    assertJsonContentType,
    assertStagingCorsOrigin,
    assertStagingSecurityHeaders,
    checkStaging,
    getRetryAttempts,
    getRetryBackoffMs,
    getStagingOpenApiIssues,
    hasExpectedDiscoveryCachePolicy,
    normalizeStagingDiscoveryQuery,
    normalizeStagingApiBaseUrl,
    readBoundedJson,
    REQUIRED_STAGING_PATHS,
} from './check-staging-api-compatibility.mjs'

test('accepts the required staging OpenAPI compatibility surface', () => {
    const document = {
        openapi: '3.1.0',
        paths: Object.fromEntries(REQUIRED_STAGING_PATHS.map((path) => [path, { get: {} }])),
    }
    assert.deepEqual(getStagingOpenApiIssues(document), [])
})

test('reports OpenAPI version and path drift', () => {
    const issues = getStagingOpenApiIssues({ openapi: '3.0.0', paths: {} })
    assert.match(issues[0] ?? '', /3\.0\.0/)
    assert.equal(issues.length, REQUIRED_STAGING_PATHS.length + 1)
})

test('requires the bounded discovery cache policy', () => {
    assert.equal(hasExpectedDiscoveryCachePolicy('public, max-age=5, stale-while-revalidate=15'), true)
    assert.equal(hasExpectedDiscoveryCachePolicy('public, max-age=60'), false)
})

test('normalizes staging URLs and rejects insecure or credential-bearing hosts', () => {
    assert.equal(normalizeStagingApiBaseUrl('https://staging.example.test/api///'), 'https://staging.example.test/api')
    assert.equal(normalizeStagingApiBaseUrl('http://127.0.0.1:4175/'), 'http://127.0.0.1:4175')
    assert.throws(() => normalizeStagingApiBaseUrl('http://staging.example.test'), /HTTPS outside localhost/)
    assert.throws(() => normalizeStagingApiBaseUrl('https://user:pass@staging.example.test'), /embedded credentials/)
})

test('staging probe uses bounded requests and reports timeout without leaking URL details', async () => {
    const pendingFetch = (_url, { signal }) => new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => {
            const error = new Error('request aborted')
            error.name = 'AbortError'
            reject(error)
        }, { once: true })
    })
    await assert.rejects(
        () => checkStaging('https://staging.example.test', pendingFetch, 5),
        /Staging request \/openapi\.json timed out after 5 ms\./,
    )
})

test('normalizes discovery query values and bounds retry configuration', () => {
    assert.equal(normalizeStagingDiscoveryQuery('?serviceId=oil change&limit=1'), 'serviceId=oil+change&limit=1')
    assert.throws(() => normalizeStagingDiscoveryQuery('x='.padEnd(1_002, 'a')), /control characters or is too long/)
    assert.equal(getRetryAttempts({}), 2)
    assert.equal(getRetryBackoffMs({}), 100)
    assert.throws(() => getRetryAttempts({ STAGING_API_RETRY_ATTEMPTS: '6' }), /between 0 and 5/)
    assert.throws(() => getRetryBackoffMs({ STAGING_API_RETRY_BACKOFF_MS: '5001' }), /between 0 and 5000/)
})

test('bounded JSON parser rejects oversized and malformed responses', async () => {
    const headers = new Headers({ 'content-type': 'application/json' })
    await assert.rejects(() => readBoundedJson(new Response('{"ok":true}', { headers }), 'OpenAPI', 5), /exceeds the 5-byte limit/)
    await assert.rejects(() => readBoundedJson(new Response('not-json', { headers }), 'OpenAPI'), /not valid JSON/)
})

test('staging probe retries transient responses and returns hashed, redacted evidence', async () => {
    const document = { openapi: '3.1.0', paths: Object.fromEntries(REQUIRED_STAGING_PATHS.map((path) => [path, { get: {} }])) }
    const jsonHeaders = {
        'content-type': 'application/json',
        'x-content-type-options': 'nosniff',
        'strict-transport-security': 'max-age=31536000',
        'access-control-allow-origin': 'https://autocarehub.example',
    }
    let openApiCalls = 0
    const requests = []
    const fakeFetch = async (url, init) => {
        requests.push({ url, init })
        const path = new URL(url).pathname
        if (path.endsWith('/openapi.json') && openApiCalls++ === 0) return new Response('', { status: 503, headers: jsonHeaders })
        if (path.endsWith('/openapi.json')) return new Response(JSON.stringify(document), { headers: jsonHeaders })
        if (path.endsWith('/health/live')) return new Response(JSON.stringify({ status: 'ok' }), { headers: jsonHeaders })
        return new Response(JSON.stringify({ items: [] }), { headers: { ...jsonHeaders, 'cache-control': 'public, max-age=5, stale-while-revalidate=15' } })
    }
    const previousQuery = process.env.STAGING_DISCOVERY_QUERY
    delete process.env.STAGING_DISCOVERY_QUERY
    try {
        const report = await checkStaging('https://staging.example.test/api', fakeFetch, 500, { retryAttempts: 1, retryBackoffMs: 0, corsOrigin: 'https://autocarehub.example' })
        assert.equal(report.status, 'pass')
        assert.equal(report.openApiBytes, JSON.stringify(document).length)
        assert.match(report.openApiSha256, /^[a-f0-9]{64}$/)
        assert.equal(report.discoveryVariants.length, 2)
        assert.equal(openApiCalls, 2)
        assert.ok(requests.every(({ init }) => init.credentials === 'omit'))
        assert.ok(requests.every(({ init }) => !('cookie' in init.headers) && !('authorization' in init.headers)))
    } finally {
        if (previousQuery === undefined) delete process.env.STAGING_DISCOVERY_QUERY
        else process.env.STAGING_DISCOVERY_QUERY = previousQuery
    }
})

test('security and CORS helpers fail closed', () => {
    const headers = new Headers({ 'x-content-type-options': 'nosniff', 'strict-transport-security': 'max-age=1', 'content-type': 'application/json' })
    assert.doesNotThrow(() => assertJsonContentType(headers, 'health'))
    assert.doesNotThrow(() => assertStagingSecurityHeaders(headers, { requireHsts: true }))
    assert.doesNotThrow(() => assertStagingCorsOrigin(new Headers({ 'access-control-allow-origin': 'https://autocarehub.example' }), 'https://autocarehub.example'))
    assert.throws(() => assertStagingSecurityHeaders(new Headers(), { requireHsts: true }), /x-content-type-options/)
    assert.throws(() => assertStagingCorsOrigin(new Headers(), 'https://autocarehub.example'), /CORS policy/)
})
