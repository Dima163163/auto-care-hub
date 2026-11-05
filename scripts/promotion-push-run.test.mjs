import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const workflow = await readFile(new URL('../.github/workflows/promote-dev-to-main.yml', import.meta.url), 'utf8')
const selector = workflow.match(/quality_run="\$\(printf '%s' "\$run_json" \| jq -r --arg sha "\$SOURCE_SHA" '([\s\S]*?)'\)"/)?.[1]
assert.ok(selector, 'Promotion push-run jq selector must be present.')

const sha = 'a'.repeat(40)
const pushRun = { id: 47, name: 'Quality PR-push', display_title: 'Quality PR-push', event: 'push', head_sha: sha, status: 'completed', conclusion: 'success', created_at: '2026-11-05T12:00:00Z' }

function select(runs) {
    const output = execFileSync('jq', ['-r', '--arg', 'sha', sha, selector], {
        input: JSON.stringify({ workflow_runs: runs }),
        encoding: 'utf8',
    }).trim()
    return output ? JSON.parse(output) : null
}

test('selects the completed push run with the actual GitHub run-name', () => {
    assert.deepEqual(select([pushRun]), pushRun)
})

test('ignores old generic names, PR runs, and other commits', () => {
    assert.equal(select([
        { ...pushRun, id: 1, name: 'Quality', display_title: 'Quality' },
        { ...pushRun, id: 2, event: 'pull_request' },
        { ...pushRun, id: 3, head_sha: 'b'.repeat(40) },
    ]), null)
})
