import test from 'node:test'
import assert from 'node:assert/strict'

import { runSeoReleaseChecks } from './check-seo-release.mjs'

test('SEO release check always reports repository budgets and prerender contract', async () => {
    const checks = await runSeoReleaseChecks()
    const names = new Set(checks.map((item) => item.name))

    assert.ok(names.has('JavaScript budget'))
    assert.ok(names.has('CSS budget'))
    assert.ok(names.has('Public image budget'))
    assert.ok(names.has('Map/image budget'))
    assert.ok(names.has('Dynamic provider prerender'))
    assert.ok(checks.some((item) => item.name === 'Production Lighthouse' && item.status === 'manual'))
})
