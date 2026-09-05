import test from 'node:test'
import assert from 'node:assert/strict'

import { evaluateMediaPipelineContract, formatMediaPipelineContract, MEDIA_PIPELINE_CONTRACT } from './check-media-pipeline-contract.mjs'

test('media pipeline contract passes against the current implementation', async () => {
    const results = await evaluateMediaPipelineContract()
    assert.equal(results.length, MEDIA_PIPELINE_CONTRACT.length)
    assert.ok(results.every((result) => result.status === 'pass'), formatMediaPipelineContract(results))
})
