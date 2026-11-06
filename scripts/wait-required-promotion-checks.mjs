import { execFile } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execute = promisify(execFile)
async function runGitHub(args, pendingAllowed = false) {
    try {
        return (await execute('gh', args, { timeout: 30_000, maxBuffer: 1024 * 1024 })).stdout
    } catch (error) {
        if (pendingAllowed && error.code === 8 && typeof error.stdout === 'string') return error.stdout
        throw new Error('GitHub promotion lookup failed.')
    }
}

export async function waitRequiredPromotionChecks({ repository, prNumber, sourceSha, runGh = runGitHub, delay = (ms) => new Promise((accept) => setTimeout(accept, ms)), maxAttempts = 540 }) {
    if (!/^[\w.-]+\/[\w.-]+$/.test(repository) || !/^[1-9]\d*$/.test(String(prNumber)) || !/^[a-f0-9]{40}$/.test(sourceSha)) throw new Error('Invalid promotion candidate.')
    const currentPrRunName = `Quality PR-${prNumber}`
    const assertCandidate = async () => {
        const candidate = JSON.parse(await runGh(['pr', 'view', String(prNumber), '--repo', repository, '--json', 'headRefOid,baseRefName,headRefName,state']))
        if (candidate.headRefOid !== sourceSha || candidate.baseRefName !== 'main' || candidate.headRefName !== 'dev' || candidate.state !== 'OPEN') throw new Error('Promotion candidate changed or is no longer open.')
    }
    const currentPrQualityPassed = async () => {
        const runs = JSON.parse(await runGh(['api', `repos/${repository}/actions/workflows/quality.yml/runs?event=pull_request&head_sha=${sourceSha}&per_page=100`]))
        if (!Array.isArray(runs.workflow_runs)) throw new Error('Invalid pull-request Quality run response.')
        const matchingRuns = runs.workflow_runs.filter((run) => run.name === currentPrRunName && run.event === 'pull_request' && run.head_branch === 'dev' && run.head_sha === sourceSha && run.display_title === currentPrRunName)
        const latestRun = matchingRuns.sort((left, right) => right.id - left.id)[0]
        if (!latestRun) return false
        if (latestRun.status !== 'completed') return false
        if (latestRun.conclusion !== 'success') throw new Error('The current pull-request Quality run failed.')

        const result = JSON.parse(await runGh(['api', `repos/${repository}/actions/runs/${latestRun.id}/jobs?per_page=100`]))
        if (!Array.isArray(result.jobs)) throw new Error('Invalid pull-request Quality jobs response.')
        if (!result.jobs.some((job) => job.name === 'Application CI' && job.status === 'completed' && job.conclusion === 'success')) {
            throw new Error('The current pull-request Application CI failed or is missing.')
        }
        return true
    }
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await assertCandidate()
        const checks = JSON.parse(await runGh(['pr', 'checks', String(prNumber), '--repo', repository, '--required', '--json', 'name,bucket,event,workflow'], true))
        if (!Array.isArray(checks)) throw new Error('Invalid required-check response.')
        if (checks.some((check) => !check || ['fail', 'cancel', 'skipping'].includes(check.bucket))) throw new Error('A required promotion check did not pass.')
        const applicationChecks = checks.filter((check) => check.workflow === 'Quality' && check.name === 'Application CI')
        const bothEvents = ['push', 'pull_request'].every((event) => applicationChecks.some((check) => check.event === event && check.bucket === 'pass'))
        if (bothEvents && checks.every((check) => check.bucket === 'pass') && await currentPrQualityPassed()) {
            await assertCandidate()
            return
        }
        console.log(`Waiting for required push and PR #${prNumber} Application CI (${attempt + 1}/${maxAttempts}).`)
        if (attempt + 1 < maxAttempts) await delay(10_000)
    }
    throw new Error('Timed out waiting for required Application CI and the current pull-request Quality run.')
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try {
        await waitRequiredPromotionChecks({ repository: process.env.GITHUB_REPOSITORY, prNumber: process.env.PR_NUMBER, sourceSha: process.env.SOURCE_SHA })
    } catch (error) {
        console.error(error instanceof Error ? error.message : 'Promotion checks failed.')
        process.exitCode = 1
    }
}
