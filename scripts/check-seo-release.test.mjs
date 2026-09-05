import test from 'node:test'
import assert from 'node:assert/strict'

import {
    checkCanonicalRobotsConsistency,
    checkLocaleCoverage,
    checkOgImageExistence,
    checkProductionUrlSafety,
    normalizeSeoBaseUrl,
    readBoundedSeoResponse,
    runSeoReleaseChecks,
} from './check-seo-release.mjs'

test('SEO release check always reports repository budgets and prerender contract', async () => {
    const checks = await runSeoReleaseChecks()
    const names = new Set(checks.map((item) => item.name))

    assert.ok(names.has('JavaScript budget'))
    assert.ok(names.has('CSS budget'))
    assert.ok(names.has('Public image budget'))
    assert.ok(names.has('Map/image budget'))
    assert.ok(names.has('Dynamic provider prerender'))
    assert.ok(names.has('Open Graph image assets'))
    assert.ok(names.has('Canonical/robots consistency'))
    assert.ok(names.has('SEO runner URL safety'))
    assert.ok(names.has('Launch locale coverage'))
    assert.ok(names.has('Local HTML metadata report'))
    assert.ok(checks.some((item) => item.name === 'Production Lighthouse' && item.status === 'manual'))
})

test('SEO base URL validation prevents insecure remote and credential-bearing probes', () => {
    assert.equal(normalizeSeoBaseUrl('https://www.example.test///'), 'https://www.example.test')
    assert.equal(normalizeSeoBaseUrl('http://localhost:4175/'), 'http://localhost:4175')
    assert.throws(() => normalizeSeoBaseUrl('http://www.example.test'), /HTTPS outside localhost/)
    assert.throws(() => normalizeSeoBaseUrl('https://user:pass@www.example.test'), /embedded credentials/)
})

test('local SEO source contracts pass without a production URL', () => {
    assert.equal(checkOgImageExistence().status, 'pass')
    assert.equal(checkCanonicalRobotsConsistency().status, 'pass')
    assert.equal(checkProductionUrlSafety().status, 'pass')
    assert.equal(checkLocaleCoverage().status, 'pass')
})

test('bounded SEO response reader accepts UTF-8 bodies and rejects oversized headers or streams', async () => {
    assert.equal(await readBoundedSeoResponse(new Response('Привет'), 64), 'Привет')
    await assert.rejects(
        () => readBoundedSeoResponse(new Response('small', { headers: { 'content-length': '100' } }), 10),
        /SEO_HTML_RESPONSE_TOO_LARGE:10/,
    )
    await assert.rejects(
        () => readBoundedSeoResponse(new Response('0123456789abcdef'), 8),
        /SEO_HTML_RESPONSE_TOO_LARGE:8/,
    )
})
