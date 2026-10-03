import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'

import {
    checkCanonicalRobotsConsistency,
    checkLocaleCoverage,
    checkLocalHtmlMetadataReport,
    checkOgImageExistence,
    checkProductionUrlSafety,
    normalizeSeoBaseUrl,
    readBoundedSeoResponse,
    runSeoReleaseChecks,
    resolveNextBuildRoot,
} from './check-seo-release.mjs'

test('SEO release check always reports repository budgets and prerender contract', async (t) => {
    const buildRoot = fixture(t)
    mkdirSync(resolve(buildRoot, 'static'))
    writeFileSync(resolve(buildRoot, 'static/test.js'), 'console.log(1)')
    const checks = await runSeoReleaseChecks({ buildRoot })
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

function fixture(t, routes = {}) {
    const directory = mkdtempSync(resolve(tmpdir(), 'autocare-seo-'))
    t.after(() => rmSync(directory, { recursive: true, force: true }))
    writeFileSync(resolve(directory, 'prerender-manifest.json'), JSON.stringify({ version: 4, routes, dynamicRoutes: {} }))
    mkdirSync(resolve(directory, 'server/app'), { recursive: true })
    return directory
}
const validHtml = '<title>AutoCare</title><meta name="description" content="Service"><link rel="canonical" href="https://example.test/"><meta property="og:title" content="AutoCare"><meta property="og:url" content="https://example.test/"><meta property="og:image" content="https://example.test/image.webp"><meta name="twitter:card" content="summary_large_image">'

test('request-rendered routes need HTTP evidence rather than nonexistent static HTML', (t) => {
    const buildRoot = fixture(t)
    assert.equal(checkLocalHtmlMetadataReport({ buildRoot, routes: ['/'] }).status, 'manual')
    assert.equal(checkLocalHtmlMetadataReport({ buildRoot, routes: ['/'], baseUrl: 'https://example.test' }).status, 'pass')
})

test('declared static routes still block on missing or invalid metadata', (t) => {
    const buildRoot = fixture(t, { '/': {} })
    const options = { buildRoot, routes: ['/'], baseUrl: 'https://example.test' }
    assert.equal(checkLocalHtmlMetadataReport(options).status, 'blocked')
    writeFileSync(resolve(buildRoot, 'server/app/index.html'), '<title>Incomplete</title>')
    assert.equal(checkLocalHtmlMetadataReport(options).status, 'blocked')
    writeFileSync(resolve(buildRoot, 'server/app/index.html'), validHtml)
    assert.equal(checkLocalHtmlMetadataReport(options).status, 'pass')
    writeFileSync(resolve(buildRoot, 'server/app/index.html'), validHtml + '<meta name="robots" content="noindex">')
    assert.equal(checkLocalHtmlMetadataReport(options).status, 'blocked')
})

test('custom build directory is respected and outside/root directories are rejected', () => {
    assert.equal(resolveNextBuildRoot('.next-release', '/project'), '/project/.next-release')
    for (const directory of ['..', '../other', '.', '/outside']) {
        assert.throws(() => resolveNextBuildRoot(directory, '/project'), /inside the project/)
    }
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
