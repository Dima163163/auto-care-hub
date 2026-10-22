import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const checker = fileURLToPath(new URL('./check-api-runtime-boundaries.mjs', import.meta.url))

function fixture(endpointSource, extraFactory) {
    const root = mkdtempSync(path.join(tmpdir(), 'autocare-api-boundary-'))
    const api = path.join(root, 'src/entities/automotive-service/api')
    mkdirSync(path.join(api, 'autocare'), { recursive: true })
    mkdirSync(path.join(root, 'src/features'), { recursive: true })
    writeFileSync(path.join(api, 'autocareApi.ts'), [
        "import { createRequestsEndpoints } from './autocare/requests.endpoints'",
        'declare const baseApi: { injectEndpoints: (value: unknown) => unknown }',
        'baseApi.injectEndpoints({ endpoints: (build) => ({ ...createRequestsEndpoints(build) }) })',
    ].join('\n'))
    writeFileSync(path.join(api, 'autocare/requests.endpoints.ts'), endpointSource)
    writeFileSync(path.join(api, 'usersApi.ts'), 'const usersApi = { getUsers: builder.query({ query: () => "/users", transformResponse: (value) => value }) }\n')
    if (extraFactory) writeFileSync(path.join(api, 'autocare/orphan.endpoints.ts'), extraFactory)
    return root
}

function run(root) {
    const result = spawnSync(process.execPath, [checker], { cwd: root, encoding: 'utf8' })
    return { status: result.status, output: `${result.stdout}${result.stderr}` }
}

test('checks registered domain factories and legacy API modules', () => {
    const root = fixture('export function createRequestsEndpoints(build) { return { getRequest: build.query({ query: () => "/request", transformResponse: (value) => value }) } }\n')
    try {
        const result = run(root)
        assert.equal(result.status, 0, result.output)
        assert.match(result.output, /2 endpoints, 1 domain endpoints across 1 factories and 2 API modules/)
    } finally {
        rmSync(root, { recursive: true, force: true })
    }
})

test('fails when a registered domain endpoint loses transformResponse', () => {
    const root = fixture('export function createRequestsEndpoints(b) { return { getSecret: b.query({ query: () => "/secret" }) } }\n')
    try {
        const result = run(root)
        assert.equal(result.status, 1)
        assert.match(result.output, /requests\.endpoints\.ts:1 getSecret has no transformResponse/)
    } finally {
        rmSync(root, { recursive: true, force: true })
    }
})

test('fails on zero domain coverage and an unregistered factory', () => {
    const root = fixture('export function createRequestsEndpoints(build) { return {} }\n', 'export function createOrphanEndpoints(build) { return { getOrphan: build.query({ query: () => "/orphan", transformResponse: (value) => value }) } }\n')
    try {
        const result = run(root)
        assert.equal(result.status, 1)
        assert.match(result.output, /unregistered domain endpoint factory/)
        assert.match(result.output, /zero checked endpoints/)
        assert.match(result.output, /unexpected zero endpoint coverage/)
    } finally {
        rmSync(root, { recursive: true, force: true })
    }
})
