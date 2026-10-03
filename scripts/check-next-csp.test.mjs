import test from 'node:test'
import assert from 'node:assert/strict'
import { assertNextCspResponse } from './check-next-csp.mjs'

const nonce = 'a-valid-synthetic-test-nonce'
const policy = `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'; connect-src 'self' https://api.example.test wss://api.example.test; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`
const html = `<script nonce="${nonce}" id="autocare-theme-bootstrap">theme()</script><script nonce="${nonce}" src="/_next/static/app.js"></script>`
const response = (csp = policy, cache = 'private, no-store', status = 200) => new Response('', { status, headers: { 'content-security-policy': csp, 'cache-control': cache } })

test('runtime checker accepts matching SSR/framework/theme nonces with exact connections', () => {
    assert.deepEqual(assertNextCspResponse(response(), html), { nonce, scriptCount: 2 })
})
test('runtime checker rejects absent proxy, unsafe production CSP and broad connections', () => {
    for (const csp of ['', policy.replace("'strict-dynamic'", "'unsafe-inline'"), policy.replace("'strict-dynamic'", "'unsafe-eval'"), policy.replace('wss://api.example.test', 'wss:'), policy.replace('https://api.example.test', 'https://*.example.test'), policy + "; script-src 'self'"]) {
        assert.throws(() => assertNextCspResponse(response(csp), html))
    }
})
test('runtime checker rejects public/cacheable HTML, missing bootstrap and mismatched script nonces', () => {
    assert.throws(() => assertNextCspResponse(response(policy, 'public, max-age=300'), html))
    assert.throws(() => assertNextCspResponse(response(), '<title>No scripts</title>'))
    assert.throws(() => assertNextCspResponse(response(), html.replace(`nonce="${nonce}"`, 'nonce="wrong"')))
    assert.throws(() => assertNextCspResponse(response(policy, 'private, no-store', 500), html))
})
