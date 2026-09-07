import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import {
    evaluateRouterCompatibility,
    formatRouterCompatibility,
} from './check-router-compatibility.mjs'

test('router compatibility contract passes for both entrypoints', async () => {
    const results = await evaluateRouterCompatibility()

    assert.equal(results.every((result) => result.status === 'pass'), true)
    assert.match(formatRouterCompatibility(results), /React Router compatibility contract/)
})

test('router compatibility contract rejects the removed transition prop', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'autocarehub-router-contract-'))

    try {
        await mkdir(path.join(root, 'src', 'app', 'next'), { recursive: true })
        await writeFile(path.join(root, 'src', 'main.tsx'), '<BrowserRouter unstable_useTransitions={false}>')
        await writeFile(path.join(root, 'src', 'app', 'next', 'NextClientApp.tsx'), '<BrowserRouter useTransitions={false}>')

        const results = await evaluateRouterCompatibility(root)
        const mainResult = results.find((result) => result.file === 'src/main.tsx')

        assert.equal(mainResult?.status, 'blocked')
        assert.deepEqual(mainResult?.forbidden, ['unstable_useTransitions'])
    } finally {
        await rm(root, { recursive: true, force: true })
    }
})
