import assert from 'node:assert/strict'
import test from 'node:test'
import { waitRequiredPromotionChecks } from './wait-required-promotion-checks.mjs'

const sourceSha = 'a'.repeat(40)
const candidate = { headRefOid: sourceSha, baseRefName: 'main', headRefName: 'dev', state: 'OPEN' }
const success = ['push', 'pull_request'].map((event) => ({ name: 'Application CI', workflow: 'Quality', event, bucket: 'pass' }))
function runner(checks, candidateResponse = () => candidate) {
    let calls = 0
    return async (args) => {
        if (args[1] === 'view') return JSON.stringify(candidateResponse())
        assert.ok(args.includes('--required'))
        return JSON.stringify(checks[Math.min(calls++, checks.length - 1)])
    }
}
const run = (runGh) => waitRequiredPromotionChecks({ repository: 'owner/repo', prNumber: '1', sourceSha, runGh, delay: async () => {}, maxAttempts: 4 })

test('waits for both Quality events and ignores the nonrequired promotion check', async () => {
    await run(runner([[], [success[0]], [success[0], { ...success[1], bucket: 'pending' }], success]))
})
test('passes after both required Application CI checks succeed', async () => run(runner([success])))
for (const bucket of ['fail', 'cancel', 'skipping']) test(`rejects required ${bucket}`, async () => assert.rejects(run(runner([[success[0], { ...success[1], bucket }]])), /did not pass/))
test('missing pull-request event and empty required checks cannot permit a merge', async () => {
    await assert.rejects(run(runner([[success[0]]])), /Timed out/)
    await assert.rejects(run(runner([[]])), /Timed out/)
})
test('rejects a changed head before reading checks', async () => assert.rejects(run(runner([success], () => ({ ...candidate, headRefOid: 'b'.repeat(40) }))), /candidate changed/))
test('rechecks head after success to reject a final race', async () => {
    let reads = 0
    await assert.rejects(run(runner([success], () => (++reads === 1 ? candidate : { ...candidate, headRefOid: 'b'.repeat(40) }))), /candidate changed/)
})
