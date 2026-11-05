import assert from 'node:assert/strict'
import test from 'node:test'
import { waitRequiredPromotionChecks } from './wait-required-promotion-checks.mjs'

const sourceSha = 'a'.repeat(40)
const candidate = { headRefOid: sourceSha, baseRefName: 'main', headRefName: 'dev', state: 'OPEN' }
const success = ['push', 'pull_request'].map((event) => ({ name: 'Application CI', workflow: 'Quality', event, bucket: 'pass' }))
const currentRun = { id: 46, name: 'Quality PR-1', display_title: 'Quality PR-1', event: 'pull_request', head_branch: 'dev', head_sha: sourceSha, status: 'completed', conclusion: 'success' }
const oldRun = { ...currentRun, id: 30, name: 'Quality PR-30', display_title: 'Quality PR-30' }
const successfulJobs = [{ name: 'Application CI', status: 'completed', conclusion: 'success' }]

function runner({ checks = [success], runs = [[currentRun]], jobs = successfulJobs, candidateResponse = () => candidate } = {}) {
    let checkReads = 0
    let runReads = 0
    const calls = []
    const runGh = async (args) => {
        calls.push(args)
        if (args[0] === 'pr' && args[1] === 'view') return JSON.stringify(candidateResponse())
        if (args[0] === 'pr' && args[1] === 'checks') {
            assert.ok(args.includes('--required'))
            return JSON.stringify(checks[Math.min(checkReads++, checks.length - 1)])
        }
        if (args[0] === 'api' && args[1].includes('/actions/workflows/quality.yml/runs?')) {
            assert.match(args[1], /event=pull_request&head_sha=a{40}&per_page=100/)
            return JSON.stringify({ workflow_runs: runs[Math.min(runReads++, runs.length - 1)] })
        }
        if (args[0] === 'api' && args[1].includes('/actions/runs/46/jobs?')) return JSON.stringify({ jobs })
        throw new Error(`Unexpected GitHub call: ${args.join(' ')}`)
    }
    return { runGh, calls }
}

const run = (fixture) => waitRequiredPromotionChecks({ repository: 'owner/repo', prNumber: '1', sourceSha, runGh: fixture.runGh, delay: async () => {}, maxAttempts: 4 })

test('waits for both Quality events and ignores the nonrequired promotion check', async () => {
    await run(runner({ checks: [[], [success[0]], [success[0], { ...success[1], bucket: 'pending' }], success] }))
})
test('passes after both required Application CI checks and the current PR run succeed', async () => run(runner()))
for (const bucket of ['fail', 'cancel', 'skipping']) test(`rejects required ${bucket}`, async () => assert.rejects(run(runner({ checks: [[success[0], { ...success[1], bucket }]] })), /did not pass/))
test('missing pull-request event and empty required checks cannot permit a merge', async () => {
    await assert.rejects(run(runner({ checks: [[success[0]]] })), /Timed out/)
    await assert.rejects(run(runner({ checks: [[]] })), /Timed out/)
})
test('does not reuse a successful Quality run from a previous PR with the same head SHA', async () => {
    const fixture = runner({ runs: [[oldRun], [oldRun, { ...currentRun, status: 'in_progress', conclusion: null }], [oldRun, currentRun]] })
    await run(fixture)
    assert.equal(fixture.calls.filter((args) => args[0] === 'api' && args[1].includes('/actions/workflows/quality.yml/runs?')).length, 3)
})
test('rejects a failed current PR run even when an older PR run passed', async () => {
    await assert.rejects(run(runner({ runs: [[oldRun, { ...currentRun, conclusion: 'failure' }]] })), /current pull-request Quality run failed/)
})
test('requires Application CI inside the current PR run', async () => {
    await assert.rejects(run(runner({ jobs: [{ name: 'Application CI', status: 'completed', conclusion: 'failure' }] })), /current pull-request Application CI failed/)
})
test('rejects a changed head before reading checks', async () => assert.rejects(run(runner({ candidateResponse: () => ({ ...candidate, headRefOid: 'b'.repeat(40) }) })), /candidate changed/))
test('rechecks head after success to reject a final race', async () => {
    let reads = 0
    await assert.rejects(run(runner({ candidateResponse: () => (++reads === 1 ? candidate : { ...candidate, headRefOid: 'b'.repeat(40) }) })), /candidate changed/)
})
