import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import {
    DISCOVERY_FORM_CONTRACT,
    evaluateDiscoveryFormContract,
    formatDiscoveryFormContract,
} from './check-discovery-form-contract.mjs'

test('discovery form contract passes against the current implementation', async () => {
    const results = await evaluateDiscoveryFormContract()
    assert.equal(results.length, DISCOVERY_FORM_CONTRACT.length)
    assert.ok(results.every((result) => result.status === 'pass'), formatDiscoveryFormContract(results))
})

test('discovery form contract reports missing fragments without throwing', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'autocarehub-discovery-contract-'))
    try {
        await mkdir(path.join(root, 'src/features/autocare-search/ui'), { recursive: true })
        await mkdir(path.join(root, 'src/shared/ui/loading-skeleton'), { recursive: true })
        await mkdir(path.join(root, 'src/pages/autocare-results/ui'), { recursive: true })
        await writeFile(path.join(root, 'src/features/autocare-search/ui/AutoCareDiscoveryControls.tsx'), 'value={serviceId}')
        await writeFile(path.join(root, 'src/shared/ui/loading-skeleton/AutoCareLoadingSkeletons.tsx'), '')
        await writeFile(path.join(root, 'src/pages/autocare-results/ui/AutoCareResultsPage.tsx'), '')

        const results = await evaluateDiscoveryFormContract(root)
        assert.ok(results.some((result) => result.status === 'blocked'))
        assert.match(formatDiscoveryFormContract(results), /missing fragments/)
    } finally {
        await rm(root, { recursive: true, force: true })
    }
})
