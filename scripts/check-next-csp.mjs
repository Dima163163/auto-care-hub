import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalizeSeoBaseUrl, readBoundedSeoResponse } from './check-seo-release.mjs'

export function assertNextCspResponse(response, html) {
    if (!response.ok) throw new Error(`HTML request failed: HTTP ${response.status}`)
    const policy = response.headers.get('content-security-policy') ?? ''
    const directives = new Map()
    for (const directive of policy.split(';').map((value) => value.trim()).filter(Boolean)) {
        const [name, ...values] = directive.split(/\s+/)
        if (directives.has(name)) throw new Error('Duplicate CSP directive.')
        directives.set(name, values)
    }
    const scripts = directives.get('script-src') ?? []
    const nonceToken = scripts.find((value) => /^'nonce-[A-Za-z0-9+/=_-]{20,128}'$/.test(value))
    if (!nonceToken || scripts.length !== 3 || !scripts.includes("'self'") || !scripts.includes("'strict-dynamic'")) {
        throw new Error('Production script CSP must contain only self, a nonce and strict-dynamic.')
    }
    const nonce = nonceToken.slice(7, -1)
    for (const [name, expected] of [['object-src', "'none'"], ['base-uri', "'self'"], ['frame-ancestors', "'none'"]]) {
        if (directives.get(name)?.join(' ') !== expected) throw new Error(`Missing CSP boundary: ${name}`)
    }
    const connections = directives.get('connect-src') ?? []
    if (!connections.includes("'self'")) throw new Error('Missing connection CSP.')
    for (const value of connections.filter((value) => value !== "'self'")) {
        let origin
        try { origin = new URL(value) } catch { throw new Error('Connection CSP must use exact origins.') }
        if (!['http:', 'https:', 'ws:', 'wss:'].includes(origin.protocol) || origin.origin !== value || origin.username || origin.password || value.includes('*')) {
            throw new Error('Connection CSP must use exact origins.')
        }
    }
    const cache = response.headers.get('cache-control') ?? ''
    if (!/\bprivate\b/i.test(cache) || !/\bno-store\b/i.test(cache)) throw new Error('Nonce HTML must be private and no-store.')
    const tags = [...html.matchAll(/<script\b[^>]*>/gi)].map((match) => match[0])
    if (!tags.length || !tags.some((tag) => /\bid=["']autocare-theme-bootstrap["']/.test(tag))) throw new Error('Missing SSR/theme scripts.')
    for (const tag of tags) {
        // JSON data blocks do not execute. Every executable script, including
        // the framework bootstrap and theme-before-paint code, must be nonced.
        if (/\btype=["']application\/(?:ld\+)?json["']/i.test(tag)) continue
        if (tag.match(/\bnonce=["']([^"']+)["']/i)?.[1] !== nonce) throw new Error('SSR script nonce does not match the response CSP.')
    }
    return { nonce, scriptCount: tags.length }
}

export async function checkNextCsp(baseUrl, routes = ['/', '/profile', '/owner/dashboard', '/admin/dashboard']) {
    const base = normalizeSeoBaseUrl(baseUrl)
    const seen = new Set()
    const results = []
    // Request the first route twice to catch stale/static nonce reuse.
    for (const route of [...routes, routes[0]]) {
        const response = await fetch(new URL(route, base), {
            signal: AbortSignal.timeout(10_000),
            headers: { accept: 'text/html', 'x-nonce': 'untrusted-caller-nonce-value' },
        })
        const { nonce, scriptCount } = assertNextCspResponse(response, await readBoundedSeoResponse(response))
        if (nonce === 'untrusted-caller-nonce-value' || seen.has(nonce)) throw new Error('Nonce was reused or controlled by the caller.')
        seen.add(nonce)
        results.push({ route, scriptCount, status: 'pass' })
    }
    return results
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const args = process.argv.slice(2)
    const urlIndex = args.indexOf('--url')
    const url = (urlIndex >= 0 ? args[urlIndex + 1] : undefined) || process.env.SEO_BASE_URL
    const routeIndex = args.indexOf('--routes')
    try {
        const results = await checkNextCsp(url, routeIndex >= 0 ? args[routeIndex + 1].split(',') : undefined)
        console.log(`Next production CSP: ${results.length} HTTP samples PASS; fresh nonces, caller override, SSR/theme parity and no-store.`)
    } catch (error) {
        console.error(`Next production CSP blocked: ${error instanceof Error ? error.message : 'runtime check failed'}`)
        process.exitCode = 1
    }
}
