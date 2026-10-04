import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'

import { inspectProductionFixtureLeakage } from './check-production-fixture-leakage.mjs'

async function withNextArtifact(run) {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'autocare-fixture-guard-'))
    try {
        await mkdir(path.join(directory, 'static/chunks/nested'), { recursive: true })
        await mkdir(path.join(directory, 'server/app/services/provider'), { recursive: true })
        await writeFile(path.join(directory, 'BUILD_ID'), 'synthetic-test-build')
        await writeFile(path.join(directory, 'build-manifest.json'), JSON.stringify({ rootMainFiles: ['static/chunks/main.js'] }))
        await writeFile(path.join(directory, 'static/chunks/main.js'), 'console.log("real app")')
        await run(directory)
    } finally { await rm(directory, { recursive: true, force: true }) }
}

test('accepts a complete clean Next artifact', async () => {
    await withNextArtifact(async (directory) => {
        const result = await inspectProductionFixtureLeakage({ directory })
        assert.equal(result.scanned, 1)
        assert.deepEqual(result.leaks, [])
    })
})

for (const [name, file, marker] of [
    ['lazy client chunk', 'static/chunks/nested/lazy.js', 'service@example.com'],
    ['server-rendered HTML', 'server/app/services/provider/index.html', '+7 (495) 645-35-35'],
    ['RSC response', 'server/app/services/provider/index.rsc', 'admin@autocarehub.test'],
    ['server chunk', 'server/app/services/provider/route.js', 'emily.carter@example.com'],
]) {
    test(`detects fixture injection into a ${name}`, async () => {
        await withNextArtifact(async (directory) => {
            await writeFile(path.join(directory, file), marker)
            const result = await inspectProductionFixtureLeakage({ directory })
            assert.deepEqual(result.leaks, [file])
        })
    })
}

test('rejects a dev artifact without BUILD_ID', async () => {
    await withNextArtifact(async (directory) => {
        await rm(path.join(directory, 'BUILD_ID'))
        await assert.rejects(inspectProductionFixtureLeakage({ directory }), /BUILD_ID/)
    })
})

test('rejects a Next artifact with missing referenced entry files', async () => {
    await withNextArtifact(async (directory) => {
        await rm(path.join(directory, 'static/chunks/main.js'))
        await assert.rejects(inspectProductionFixtureLeakage({ directory }), /main\.js/)
    })
})

test('checks Vite assets and initial HTML when explicitly selected', async () => {
    await withNextArtifact(async (directory) => {
        await mkdir(path.join(directory, 'assets'), { recursive: true })
        await writeFile(path.join(directory, 'assets/index-test.js'), 'real')
        await writeFile(path.join(directory, 'index.html'), 'service@example.com')
        const result = await inspectProductionFixtureLeakage({ format: 'vite', directory })
        assert.deepEqual(result.leaks, ['index.html'])
    })
})
